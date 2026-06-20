"use client";

import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import {
  useActionState,
  useMemo,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import {
  deleteOrphanProductFiles,
  type CleanupResult,
} from "@/lib/admin/cleanup-actions";
import {
  formatCleanupBytes,
  type OrphanFile,
} from "@/lib/queries/admin-cleanup-shared";
import { cn } from "@/lib/utils";

const STORAGE_PUBLIC_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/products/`;

/**
 * Selectable list of orphan files with a single "delete selected"
 * action at the bottom. The whole table is one <form> so selection
 * state is just a Set<string> in React state; submission posts every
 * selected `paths` value to the server action.
 *
 * Defaults to "nothing selected" so the operator has to opt-in for
 * every batch. A "select all" toggle in the header lets them
 * bulk-tick when they've eyeballed the list.
 */
export function OrphanFilesTable({
  orphans,
  isAr,
}: {
  orphans: OrphanFile[];
  isAr: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, action] = useActionState<CleanupResult, FormData>(
    async (_prev, fd) => deleteOrphanProductFiles(fd),
    { ok: true, deletedCount: 0, attempted: 0 } as CleanupResult,
  );

  const allSelected = selected.size === orphans.length && orphans.length > 0;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleOne(path: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(path);
      else next.delete(path);
      return next;
    });
  }
  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(orphans.map((o) => o.path)) : new Set());
  }

  const selectedBytes = useMemo(() => {
    let bytes = 0;
    for (const o of orphans) if (selected.has(o.path)) bytes += o.bytes;
    return bytes;
  }, [selected, orphans]);

  return (
    <form action={action} className="space-y-4">
      {/* Result banner — only after a real submission. */}
      {result &&
        result.ok &&
        "deletedCount" in result &&
        result.attempted > 0 && (
          <Banner kind="success">
            {isAr
              ? `تم حذف ${result.deletedCount} من ${result.attempted} ملف.`
              : `Deleted ${result.deletedCount} of ${result.attempted} files.`}
          </Banner>
        )}
      {result && !result.ok && (
        <Banner kind="error">{result.error}</Banner>
      )}

      {/* Selection summary + action */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={(e) => toggleAll(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
            />
            <span>{isAr ? "اختر الكل" : "Select all"}</span>
          </label>
          <span className="text-[11px] text-[var(--color-text-secondary)]">
            {isAr
              ? `${selected.size} مختار · ${formatCleanupBytes(selectedBytes)}`
              : `${selected.size} selected · ${formatCleanupBytes(selectedBytes)}`}
          </span>
        </div>
        <DeleteButton
          disabled={selected.size === 0}
          isAr={isAr}
          selectedCount={selected.size}
        />
      </div>

      {/* Hidden inputs carry the selected paths to the server action. */}
      {Array.from(selected).map((path) => (
        <input key={path} type="hidden" name="paths" value={path} />
      ))}

      {/* Files table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th aria-label={isAr ? "اختيار" : "Select"} />
              <Th>{isAr ? "المسار" : "Path"}</Th>
              <Th className="text-end">{isAr ? "الحجم" : "Size"}</Th>
              <Th className="text-end">{isAr ? "العمر" : "Age"}</Th>
              <Th aria-label={isAr ? "معاينة" : "Preview"} />
            </tr>
          </thead>
          <tbody>
            {orphans.map((o) => {
              const checked = selected.has(o.path);
              return (
                <tr
                  key={o.path}
                  className={cn(
                    "border-t border-[var(--color-border)] transition",
                    checked
                      ? "bg-[var(--color-error)]/5"
                      : "hover:bg-[var(--color-surface)]/50",
                  )}
                >
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleOne(o.path, e.target.checked)}
                      aria-label={isAr ? `اختر ${o.path}` : `Select ${o.path}`}
                      className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[var(--color-text)]">
                    {o.path}
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-[12px] text-[var(--color-text-secondary)]">
                    {formatCleanupBytes(o.bytes)}
                  </td>
                  <td className="px-3 py-2 text-end text-[12px] text-[var(--color-text-secondary)]">
                    {o.ageDays === 0
                      ? isAr
                        ? "اليوم"
                        : "today"
                      : isAr
                        ? `${o.ageDays} يوم`
                        : `${o.ageDays}d`}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <a
                      href={`${STORAGE_PUBLIC_PREFIX}${o.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={
                        isAr ? `معاينة ${o.path}` : `Preview ${o.path}`
                      }
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </td>
                </tr>
              );
            })}
            {orphans.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]"
                >
                  {isAr
                    ? "مفيش ملفات يتيمة. كل اللي في الـ bucket مربوط بمنتج."
                    : "No orphans. Every file in the bucket is referenced by a product."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </form>
  );
}

function DeleteButton({
  disabled,
  isAr,
  selectedCount,
}: {
  disabled: boolean;
  isAr: boolean;
  selectedCount: number;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      onClick={(e) => {
        if (
          !confirm(
            isAr
              ? `حذف ${selectedCount} ملف نهائيًا؟ ده مش هينعكس.`
              : `Permanently delete ${selectedCount} file(s)? Not reversible.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-error)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-error)]/90 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-secondary)]"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      {isAr
        ? `حذف المختار (${selectedCount})`
        : `Delete selected (${selectedCount})`}
    </button>
  );
}

function Banner({
  kind,
  children,
}: {
  kind: "success" | "error";
  children: React.ReactNode;
}) {
  const cls =
    kind === "success"
      ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]"
      : "border-[var(--color-error)]/40 bg-[var(--color-error)]/10 text-[var(--color-error)]";
  return (
    <p
      role="alert"
      className={cn("rounded-md border px-3 py-2 text-sm", cls)}
    >
      {children}
    </p>
  );
}

function Th({
  children,
  className,
  ...rest
}: {
  children?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <th
      scope="col"
      className={
        "px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider " +
        (className ?? "")
      }
      {...rest}
    />
  );
}
