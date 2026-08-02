"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AgentType } from "@observatory/shared";
import { AGENT_LABEL, AGENT_SERIES_COLOR } from "../../lib/chart-colors";
import { formatNumber } from "../../lib/utils";

export interface TokensByAgentRow {
  agentType: AgentType;
  label: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

export function TokensByAgentChart({ rows }: { rows: TokensByAgentRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--chart-axis)" tick={{ fill: "var(--chart-muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          stroke="var(--chart-axis)"
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatNumber(Number(v))}
          width={56}
        />
        <Tooltip
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
          formatter={(value: number, _name, item) => [
            `${formatNumber(value)} (${formatNumber(item.payload.inputTokens)} in / ${formatNumber(item.payload.outputTokens)} out)`,
            AGENT_LABEL[item.payload.agentType as AgentType],
          ]}
        />
        <Bar dataKey="totalTokens" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {rows.map((row) => (
            <Cell key={row.agentType} fill={AGENT_SERIES_COLOR[row.agentType]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
