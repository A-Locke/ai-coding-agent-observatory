"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AgentType } from "@observatory/shared";
import { AGENT_LABEL, AGENT_SERIES_COLOR } from "../../lib/chart-colors";
import { formatUsd } from "../../lib/utils";

export interface CostByDayRow {
  day: string;
  [agentType: string]: string | number;
}

export function CostOverTimeChart({ rows, agents }: { rows: CostByDayRow[]; agents: AgentType[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="day" stroke="var(--chart-axis)" tick={{ fill: "var(--chart-muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          stroke="var(--chart-axis)"
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatUsd(Number(v))}
          width={64}
        />
        <Tooltip
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
          formatter={(value: number, name: string) => [formatUsd(value), AGENT_LABEL[name as AgentType] ?? name]}
        />
        {agents.map((agent) => (
          <Line
            key={agent}
            type="monotone"
            dataKey={agent}
            name={agent}
            stroke={AGENT_SERIES_COLOR[agent]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
