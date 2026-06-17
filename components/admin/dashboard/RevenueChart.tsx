"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyRevenuePoint } from "@/lib/queries/admin-dashboard";
import type { AdminLocale } from "@/lib/admin/locale";

/**
 * Stacked monthly revenue chart. Online and POS share each day's bar so
 * the operator sees both the total and the channel split at a glance.
 *
 * Colors map directly to the brand palette:
 *   - Online → navy-600 (matches the "Globe" icon used in the sidebar)
 *   - POS    → brass-500 (matches the "ShoppingCart" icon)
 *
 * Heights and margins are tuned for the dashboard's two-row layout —
 * the chart sits at 280px so the screen still fits in a 13" laptop
 * viewport above the fold.
 */
export function RevenueChart({
  data,
  locale,
}: {
  data: DailyRevenuePoint[];
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";
  const onlineLabel = isAr ? "أونلاين" : "Online";
  const posLabel = isAr ? "المحل" : "POS";
  const egpLabel = isAr ? "جنيه" : "EGP";
  const numberLocale = isAr ? "ar-EG" : "en-US";

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(iso: string) => iso.slice(-2)}
            tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tickFormatter={(v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
            tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              fontSize: 12,
            }}
            // Recharts types Tooltip formatter args as `ValueType | unknown`
            // (they can be string | number | null). Coerce defensively
            // — our data is always number, but the type system doesn't
            // know that.
            formatter={(value, name) => [
              `${Math.round(Number(value ?? 0)).toLocaleString(numberLocale)} ${egpLabel}`,
              name === "online" ? onlineLabel : posLabel,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value: string) =>
              value === "online" ? onlineLabel : posLabel
            }
          />
          <Bar
            dataKey="online"
            stackId="a"
            fill="#1e3a5f"
            name="online"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="pos"
            stackId="a"
            fill="#c89b3c"
            name="pos"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
