import type { Paths } from "@/lib/admin/analytics";
import { pageLabel, pct } from "@/lib/analytics/paths";

/**
 * How visits move through the shop — consented AND anonymous visits, since a
 * single visit's path needs no cookie. Entry pages, the pages people leave
 * from (exit rate), and the most common next step. Server component.
 */
export function PathsReport({ paths, isAr }: { paths: Paths; isAr: boolean }) {
  if (paths.visits === 0) return null;
  const n = (v: number) => v.toLocaleString(isAr ? "ar-EG" : "en-US");
  const pctText = (v: number | null) => (v === null ? "—" : isAr ? `${n(v)}٪` : `${v}%`);
  const bounce = pct(paths.singlePage, paths.visits);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          {isAr ? "مسار الزيارة" : "Visit paths"}
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          {isAr
            ? `الزوّار بيدخلوا منين، بيروحوا فين بعدها، وبيخرجوا من أنهي صفحة — ${n(paths.visits)} زيارة (اللي وافقوا والمجهولة). متوسط ${paths.pagesPerVisit ?? "—"} صفحة للزيارة، و${pctText(bounce)} شافوا صفحة واحدة ومشيوا.`
            : `Where visits start, where they go next, and where they leave — ${n(paths.visits)} visits (consented and anonymous). ${paths.pagesPerVisit ?? "—"} pages per visit on average; ${pctText(bounce)} left after one page.`}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Table
          title={isAr ? "بيدخلوا من" : "Entry pages"}
          head={[isAr ? "الصفحة" : "Page", isAr ? "زيارات" : "Visits"]}
          rows={paths.entries.map((e) => [pageLabel(e.page, isAr), n(e.visits)])}
        />
        <Table
          title={isAr ? "أكتر صفحات بيخرجوا منها" : "Pages people leave from"}
          head={[isAr ? "الصفحة" : "Page", isAr ? "مشاهدات" : "Views", isAr ? "خرجوا" : "Exit rate"]}
          rows={[...paths.pages]
            .sort((a, b) => b.exits - a.exits)
            .map((p) => [pageLabel(p.page, isAr), n(p.views), pctText(pct(p.exits, p.views))])}
          note={
            isAr
              ? "نسبة الخروج العالية من «السلة» أو «الدفع» أهم رقم هنا."
              : "A high exit rate on Cart or Checkout is the number to watch."
          }
        />
        <Table
          title={isAr ? "بعدها بيروحوا فين" : "Most common next step"}
          head={[isAr ? "من ← إلى" : "From → to", isAr ? "مرات" : "Times"]}
          rows={paths.moves.map((m) => [
            `${pageLabel(m.from_page, isAr)} ${isAr ? "←" : "→"} ${pageLabel(m.to_page, isAr)}`,
            n(m.moves),
          ])}
        />
      </div>
    </section>
  );
}

function Table({
  title,
  head,
  rows,
  note,
}: {
  title: string;
  head: string[];
  rows: string[][];
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">{title}</p>
      <table className="mt-2 w-full text-xs">
        <thead>
          <tr className="text-[var(--color-text-secondary)]">
            {head.map((h, i) => (
              <th key={h} scope="col" className={i === 0 ? "py-1 text-start font-medium" : "py-1 text-end font-medium"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[var(--color-border)]">
              {r.map((c, j) => (
                <td
                  key={j}
                  className={
                    j === 0
                      ? "max-w-[14rem] truncate py-1.5 text-[var(--color-text)]"
                      : "whitespace-nowrap py-1.5 text-end font-mono text-[var(--color-text-secondary)]"
                  }
                  title={j === 0 ? c : undefined}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="mt-2 text-[11px] text-[var(--color-text-secondary)]">{note}</p>}
    </div>
  );
}
