"use client";

import Image from "next/image";
import {
  Banknote,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import {
  effectivePosPrice,
  effectivePrice,
  hasStoreSpecificPrice,
  totalStock as productTotalStock,
} from "@/lib/catalog-shared";
import type { ProductVariant } from "@/lib/supabase/types";
import { completeSale, type CompleteSaleResult } from "@/lib/pos/actions";
import { calcTotals, POS_PAYMENT_METHODS } from "@/lib/pos/schema";
import type { AdminLocale } from "@/lib/admin/locale";
import { paymentMethodLabel } from "@/lib/admin/labels";
import { cn, formatPriceEGP } from "@/lib/utils";
import { ReceiptModal } from "./Receipt";

type CartLine = {
  variantId: string;
  productId: string;
  name: string;
  image: string | null;
  color: string | null;
  size: string | null;
  unitPrice: number;
  qty: number;
  /** Cap from the variant — used to clamp +1 so we don't oversell on
      the client. The server's atomic RPC is the final arbiter. */
  stockCap: number;
};

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; sale: Extract<CompleteSaleResult, { ok: true }>["sale"] }
  | { kind: "error"; message: string };

type DiscountMode = "amount" | "percent";

const PAYMENT_ICONS: Record<
  (typeof POS_PAYMENT_METHODS)[number],
  { Icon: typeof Banknote; emoji: string }
> = {
  cash: { Icon: Banknote, emoji: "💵" },
  "e-wallet": { Icon: Wallet, emoji: "📱" },
  instapay: { Icon: Smartphone, emoji: "💳" },
  card: { Icon: CreditCard, emoji: "💳" },
};

/**
 * Full POS screen.
 *
 * Two columns at md+, stacked on mobile:
 *   LEFT  — product search + grid + cart with qty controls + discount.
 *   RIGHT — payment method picker, cash-change calc, completion CTA.
 *
 * Variant picker: a click on a multi-variant product opens an inline
 * modal listing the variants with their stock + price. A single-
 * variant product adds straight to the cart.
 *
 * Cart state is local — POS sales are atomic (one transaction per
 * completion) so there's no need for persistence between completions.
 * The "New sale" button on the receipt modal resets state.
 */
export function POSScreen({
  products,
  cashierName,
  locale,
}: {
  products: ProductWithVariants[];
  cashierName: string | null;
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickerProduct, setPickerProduct] =
    useState<ProductWithVariants | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof POS_PAYMENT_METHODS)[number]>("cash");
  const [discountValue, setDiscountValue] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [paymentRef, setPaymentRef] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  // Filtered product grid. Matches against both Arabic and English
  // names — the cashier types whichever they have on muscle memory.
  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.name_ar.toLowerCase().includes(q) ||
            p.name_en.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q),
        )
      : products;
    return list.slice(0, 60);
  }, [products, query]);

  // Resolve discount EGP from the toggle + raw input. Percent caps at
  // subtotal so the user can't enter 200% and zero-out the till.
  const subtotalRaw = useMemo(
    () => cart.reduce((s, i) => s + i.qty * i.unitPrice, 0),
    [cart],
  );
  const discountEGP = useMemo(() => {
    const v = Number(discountValue);
    if (!Number.isFinite(v) || v <= 0) return 0;
    if (discountMode === "percent") {
      return Math.min(subtotalRaw, (subtotalRaw * v) / 100);
    }
    return Math.min(subtotalRaw, v);
  }, [discountValue, discountMode, subtotalRaw]);
  const totals = useMemo(
    () => calcTotals(cart.map((c) => ({ qty: c.qty, unitPrice: c.unitPrice })), discountEGP),
    [cart, discountEGP],
  );

  // Cash-only: change due if tendered amount entered.
  const cashChange = useMemo(() => {
    if (paymentMethod !== "cash") return 0;
    const t = Number(cashTendered);
    if (!Number.isFinite(t)) return 0;
    return Math.max(0, t - totals.total);
  }, [paymentMethod, cashTendered, totals.total]);

  // ─── Cart mutations ──────────────────────────────────────────────
  function addVariantToCart(p: ProductWithVariants, v: ProductVariant) {
    const stock = v.stock_qty ?? 0;
    if (stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.variantId === v.id);
      const unitPrice = effectivePosPrice(p, v);
      if (existing) {
        return prev.map((c) =>
          c.variantId === v.id
            ? { ...c, qty: Math.min(stock, c.qty + 1) }
            : c,
        );
      }
      return [
        ...prev,
        {
          variantId: v.id,
          productId: p.id,
          name: isAr ? p.name_ar || p.name_en : p.name_en || p.name_ar,
          image: p.images?.[0] ?? null,
          color: isAr
            ? v.color_ar ?? v.color_en ?? null
            : v.color_en ?? v.color_ar ?? null,
          size: v.size_inches ? `${v.size_inches}"` : v.size_label_ar ?? null,
          unitPrice,
          qty: 1,
          stockCap: stock,
        },
      ];
    });
    setPickerProduct(null);
  }

  function changeQty(variantId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.variantId === variantId
            ? { ...c, qty: Math.min(c.stockCap, Math.max(0, c.qty + delta)) }
            : c,
        )
        .filter((c) => c.qty > 0),
    );
  }
  function removeLine(variantId: string) {
    setCart((prev) => prev.filter((c) => c.variantId !== variantId));
  }
  function clearCart() {
    setCart([]);
    setDiscountValue("");
    setPaymentRef("");
    setCashTendered("");
    setNotes("");
  }

  // ─── Submit ──────────────────────────────────────────────────────
  function onComplete() {
    if (cart.length === 0 || pending) return;
    setStatus({ kind: "submitting" });
    startTransition(async () => {
      const res = await completeSale({
        items: cart.map((c) => ({
          variantId: c.variantId,
          productId: c.productId,
          qty: c.qty,
          unitPrice: c.unitPrice,
          snapshotName: c.name,
          snapshotColor: c.color,
          snapshotSize: c.size,
        })),
        paymentMethod,
        discountAmount: discountEGP,
        paymentRef: paymentMethod === "cash" ? null : paymentRef || null,
        notes: notes || null,
      });
      if (!res.ok) {
        setStatus({ kind: "error", message: res.error });
        return;
      }
      setStatus({ kind: "success", sale: res.sale });
    });
  }

  function startNewSale() {
    clearCart();
    setStatus({ kind: "idle" });
  }

  // Single click on a product card: variants > 1 → picker, =1 → add directly.
  function handleProductClick(p: ProductWithVariants) {
    const inStock = p.product_variants.filter((v) => (v.stock_qty ?? 0) > 0);
    if (inStock.length === 0) return;
    if (inStock.length === 1) {
      addVariantToCart(p, inStock[0]);
    } else {
      setPickerProduct(p);
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* ─── LEFT COLUMN: search + grid + cart ──────────────────── */}
        <div className="flex min-h-[60vh] flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isAr
                  ? "ابحث باسم المنتج أو السلاج..."
                  : "Search by product name or slug..."
              }
              aria-label={isAr ? "بحث المنتجات" : "Search products"}
              className="h-11 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] ps-11 pe-4 text-sm shadow-sm transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
          </div>

          {/* Product grid */}
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleProducts.map((p) => {
              const stock = productTotalStock(p);
              // Card shows the POS price by default — the cashier needs
              // to see what they'll actually charge, not the website
              // list price. The badge below flags rows where the two
              // differ so a counter quote is never misread as published.
              const price = effectivePosPrice(p);
              const posSpecific = hasStoreSpecificPrice(p);
              const oos = stock === 0;
              const displayName = isAr
                ? p.name_ar || p.name_en
                : p.name_en || p.name_ar;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={oos}
                    onClick={() => handleProductClick(p)}
                    className={cn(
                      "group flex h-full w-full flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-start transition hover:border-[var(--color-accent)] hover:shadow-sm",
                      oos && "opacity-50",
                    )}
                  >
                    <div className="relative aspect-square w-full bg-[var(--color-surface-2)]">
                      {p.images?.[0] && (
                        <Image
                          src={p.images[0]}
                          alt={displayName}
                          fill
                          sizes="(min-width: 1024px) 15vw, 25vw"
                          className="object-cover"
                        />
                      )}
                      {oos && (
                        <span className="absolute inset-x-0 bottom-0 bg-[var(--color-primary)]/85 py-1 text-center text-[10px] font-medium text-white">
                          {isAr ? "نفذ" : "Out of stock"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-2">
                      <p className="line-clamp-2 text-xs font-medium text-[var(--color-text)]">
                        {displayName}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-1">
                        <p className="font-mono text-[11px] font-semibold text-[var(--color-primary)]">
                          {formatPriceEGP(price)}
                        </p>
                        {posSpecific && (
                          <span
                            title={
                              isAr
                                ? `سعر الموقع: ${formatPriceEGP(effectivePrice(p))}`
                                : `Website price: ${formatPriceEGP(effectivePrice(p))}`
                            }
                            className="rounded-sm bg-[var(--color-accent)]/20 px-1 py-px font-mono text-[8px] font-semibold uppercase tracking-wider text-[var(--color-accent-dark)]"
                          >
                            {isAr ? "سعر المحل" : "POS"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {visibleProducts.length === 0 && (
            <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-8 text-center text-xs text-[var(--color-text-secondary)]">
              {isAr ? "مفيش منتجات مطابقة." : "No matching products."}
            </p>
          )}

          {/* Cart */}
          <div className="mt-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
            <header className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
                {isAr
                  ? `السلة · ${cart.length} ${cart.length === 1 ? "صنف" : "أصناف"}`
                  : `Cart · ${cart.length} item${cart.length === 1 ? "" : "s"}`}
              </p>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[11px] text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-error)] hover:underline"
                >
                  {isAr ? "تفريغ" : "Clear"}
                </button>
              )}
            </header>
            {cart.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--color-text-secondary)]">
                {isAr
                  ? "ابدأ بإضافة منتجات من فوق."
                  : "Start by adding products above."}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {cart.map((c) => (
                  <li
                    key={c.variantId}
                    className="flex items-center gap-3 py-2 text-sm"
                  >
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
                      {c.image && (
                        <Image
                          src={c.image}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[var(--color-text)]">
                        {c.name}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                        {[c.color, c.size].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <QtyButton
                      onClick={() => changeQty(c.variantId, -1)}
                      icon={Minus}
                      label={isAr ? "نقص الكمية" : "Decrease quantity"}
                    />
                    <span className="w-6 text-center font-mono text-sm">
                      {c.qty}
                    </span>
                    <QtyButton
                      onClick={() => changeQty(c.variantId, +1)}
                      icon={Plus}
                      label={isAr ? "زود الكمية" : "Increase quantity"}
                    />
                    <span className="w-20 text-end font-mono text-xs font-semibold text-[var(--color-primary)]">
                      {formatPriceEGP(c.qty * c.unitPrice)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(c.variantId)}
                      aria-label={isAr ? "حذف" : "Remove"}
                      className="rounded p-1 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-error)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {cart.length > 0 && (
              <>
                {/* Discount */}
                <div className="mt-3 flex items-center gap-2 border-t border-dashed border-[var(--color-border)] pt-3">
                  <span className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {isAr ? "خصم" : "Discount"}
                  </span>
                  <div className="ms-auto inline-flex overflow-hidden rounded-md border border-[var(--color-border)] text-[11px]">
                    {(["amount", "percent"] as DiscountMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDiscountMode(m)}
                        className={cn(
                          "px-2 py-1 transition",
                          discountMode === m
                            ? "bg-[var(--color-primary)] text-white"
                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]",
                        )}
                      >
                        {m === "amount" ? (isAr ? "ج.م" : "EGP") : "%"}
                      </button>
                    ))}
                  </div>
                  <input
                    inputMode="decimal"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0"
                    className="w-24 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-end font-mono text-sm focus:border-[var(--color-accent)] focus:outline-none"
                    aria-label={isAr ? "قيمة الخصم" : "Discount value"}
                  />
                </div>

                {/* Totals */}
                <dl className="mt-3 space-y-1 border-t border-dashed border-[var(--color-border)] pt-3 text-sm">
                  <Row
                    label={isAr ? "المجموع الفرعي" : "Subtotal"}
                    value={formatPriceEGP(totals.subtotal)}
                  />
                  {totals.discount > 0 && (
                    <Row
                      label={isAr ? "الخصم" : "Discount"}
                      value={`- ${formatPriceEGP(totals.discount)}`}
                    />
                  )}
                  <Row
                    label={isAr ? "الإجمالي" : "TOTAL"}
                    value={formatPriceEGP(totals.total)}
                    strong
                  />
                </dl>
              </>
            )}
          </div>
        </div>

        {/* ─── RIGHT COLUMN: payment + complete ───────────────────── */}
        <aside className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:sticky lg:top-4 lg:self-start">
          {cashierName && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
              {isAr ? "الكاشير · " : "Cashier · "}
              {cashierName}
            </p>
          )}

          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
              {isAr ? "طريقة الدفع" : "Payment method"}
            </p>
            <ul className="grid grid-cols-2 gap-2">
              {POS_PAYMENT_METHODS.map((m) => {
                const meta = PAYMENT_ICONS[m];
                const isActive = paymentMethod === m;
                const Icon = meta.Icon;
                const primaryLabel = paymentMethodLabel(m, locale);
                const secondaryLabel = paymentMethodLabel(
                  m,
                  isAr ? "en" : "ar",
                );
                return (
                  <li key={m}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-3 py-3 text-start text-sm transition",
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm"
                          : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]",
                      )}
                    >
                      <span aria-hidden className="text-lg">
                        {meta.emoji}
                      </span>
                      <span className="flex-1 leading-tight">
                        {primaryLabel}
                        <span
                          className={cn(
                            "block text-[10px]",
                            isActive ? "text-white/70" : "text-[var(--color-text-secondary)]",
                          )}
                        >
                          {secondaryLabel}
                        </span>
                      </span>
                      {isActive && <Icon className="h-4 w-4" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {paymentMethod === "cash" ? (
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                {isAr ? "المبلغ المقدّم نقدًا" : "Cash tendered"}
              </label>
              <input
                inputMode="decimal"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-end font-mono text-base focus:border-[var(--color-accent)] focus:outline-none"
              />
              <p className="mt-1 text-end font-mono text-xs text-[var(--color-text-secondary)]">
                {isAr ? "الباقي: " : "Change: "}
                {formatPriceEGP(cashChange)}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                {isAr ? "رقم مرجع الدفع" : "Payment reference"}
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder={isAr ? "رقم العملية / المرجع" : "Txn / ref no."}
                className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
              {isAr ? "ملاحظات" : "Notes"}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label={isAr ? "ملاحظات" : "Notes"}
              className="mt-1 w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="mt-auto rounded-lg bg-[var(--color-bg)] p-4">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
              {isAr ? "الإجمالي النهائي" : "Grand total"}
            </p>
            <p className="font-mono text-3xl font-semibold text-[var(--color-primary)]">
              {formatPriceEGP(totals.total)}
            </p>
          </div>

          {status.kind === "error" && (
            <p
              role="alert"
              className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-xs text-[var(--color-error)]"
            >
              {status.message}
            </p>
          )}

          <button
            type="button"
            onClick={onComplete}
            disabled={cart.length === 0 || pending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brass-500 px-6 py-3 text-sm font-semibold text-navy-900 transition hover:bg-brass-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isAr ? "إتمام البيع" : "Complete sale"}
          </button>
        </aside>
      </div>

      {/* ─── Variant picker ──────────────────────────────────────── */}
      {pickerProduct && (
        <VariantPicker
          product={pickerProduct}
          locale={locale}
          onPick={(v) => addVariantToCart(pickerProduct, v)}
          onClose={() => setPickerProduct(null)}
        />
      )}

      {/* ─── Receipt modal ───────────────────────────────────────── */}
      {status.kind === "success" && (
        <ReceiptModal
          sale={status.sale}
          locale={locale}
          onClose={startNewSale}
        />
      )}
    </>
  );
}

function VariantPicker({
  product,
  locale,
  onPick,
  onClose,
}: {
  product: ProductWithVariants;
  locale: AdminLocale;
  onPick: (v: ProductVariant) => void;
  onClose: () => void;
}) {
  const isAr = locale === "ar";
  const headerName = isAr
    ? product.name_ar || product.name_en
    : product.name_en || product.name_ar;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-[var(--color-bg)] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label={isAr ? "إغلاق" : "Close"}
          className="absolute end-3 top-3 rounded-full p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
        >
          <X className="h-4 w-4" />
        </button>
        <header className="border-b border-[var(--color-border)] px-5 py-4">
          <p className="font-display text-lg text-[var(--color-text)]">
            {headerName}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isAr ? "اختر اللون / المقاس" : "Pick colour / size"}
          </p>
        </header>
        <ul className="max-h-[60vh] divide-y divide-[var(--color-border)] overflow-y-auto">
          {product.product_variants.map((v) => {
            const stock = v.stock_qty ?? 0;
            const oos = stock === 0;
            const price = effectivePosPrice(product, v);
            const posSpecific = hasStoreSpecificPrice(product, v);
            const colorLabel = isAr
              ? v.color_ar ?? v.color_en ?? "—"
              : v.color_en ?? v.color_ar ?? "—";
            return (
              <li key={v.id}>
                <button
                  type="button"
                  disabled={oos}
                  onClick={() => onPick(v)}
                  className={cn(
                    "flex w-full items-center gap-3 px-5 py-3 text-start transition hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {v.color_hex && (
                    <span
                      aria-hidden
                      className="h-6 w-6 shrink-0 rounded-full ring-1 ring-[var(--color-border)]"
                      style={{ background: v.color_hex }}
                    />
                  )}
                  <span className="flex-1 text-sm text-[var(--color-text)]">
                    {colorLabel}
                    {v.size_inches ? ` · ${v.size_inches}"` : ""}
                  </span>
                  <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                    {oos
                      ? isAr
                        ? "نفذ"
                        : "Out"
                      : isAr
                        ? `${stock} قطعة`
                        : `${stock} pcs`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {posSpecific && (
                      <span
                        title={
                          isAr
                            ? `سعر الموقع: ${formatPriceEGP(
                                v.price_override ?? effectivePrice(product),
                              )}`
                            : `Website price: ${formatPriceEGP(
                                v.price_override ?? effectivePrice(product),
                              )}`
                        }
                        className="rounded-sm bg-[var(--color-accent)]/20 px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--color-accent-dark)]"
                      >
                        {isAr ? "سعر المحل" : "POS"}
                      </span>
                    )}
                    <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">
                      {formatPriceEGP(price)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function QtyButton({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: typeof Minus;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-6 w-6 place-items-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </dt>
      <dd
        className={cn(
          "font-mono",
          strong ? "text-lg font-semibold text-[var(--color-primary)]" : "text-sm",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
