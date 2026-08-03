"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "../../lib/utils";
import type { ToolUsagePoint } from "../../lib/queries";

export function ToolUsageChart({ rows }: { rows: ToolUsagePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
        <XAxis
          type="number"
          stroke="var(--chart-axis)"
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatNumber(Number(v))}
        />
        <YAxis
          type="category"
          dataKey="toolName"
          stroke="var(--chart-axis)"
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={96}
        />
        <Tooltip
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
          formatter={(value: number, _name, item) => [
            `${formatNumber(value)} calls (${item.payload.successCount} succeeded)`,
            item.payload.toolName,
          ]}
        />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
