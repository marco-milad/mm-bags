"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function TrackOrderForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const isRTL = locale === "ar";
  const Forward = isRTL ? ArrowLeft : ArrowRight;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = orderId.trim();
    if (!id) return;
    router.push(`/${locale}/track/${encodeURIComponent(id)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="text"
        inputMode="text"
        value={orderId}
        onChange={(e) => setOrderId(e.target.value)}
        placeholder={isRTL ? "مثال: MM-12345" : "e.g. MM-12345"}
        aria-label={isRTL ? "رقم الطلب" : "Order ID"}
        className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-text)]"
        required
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-text)] px-5 py-3 text-sm font-medium text-[var(--color-bg)] transition hover:opacity-90"
      >
        {isRTL ? "تتبع" : "Track"}
        <Forward className="h-4 w-4" />
      </button>
    </form>
  );
}
