import { NextResponse } from "next/server";
import { getCostEfficiencyStats, getLeaderboard, getMonthlyCostProjection, getOverviewStats } from "../../../../lib/queries";
import { toMarkdownTable } from "../../../../lib/export";
import { formatNumber, formatUsd } from "../../../../lib/utils";

export const runtime = "nodejs";

export async function GET() {
  const overview = getOverviewStats();
  const leaderboard = getLeaderboard();
  const efficiency = getCostEfficiencyStats();
  const projection = getMonthlyCostProjection();

  const leaderboardRows = leaderboard.map((row) => ({
    Agent: row.agentType,
    Model: row.model,
    Sessions: row.sessionCount,
    "Success rate": `${Math.round(row.successRate * 100)}%`,
    "Avg cost": formatUsd(row.avgCostUsd),
    "Cost / success": formatUsd(row.costPerSuccessUsd),
  }));

  const report = `# AI Coding Agent Observatory — Summary Report

Generated ${new Date().toISOString()}

## Overview

- Total sessions: ${formatNumber(overview.totalSessions)}
- Total cost: ${formatUsd(overview.totalCostUsd)} (vendor-reported where available, estimated otherwise)
- Total tokens: ${formatNumber(overview.totalInputTokens + overview.totalOutputTokens)}
- Success rate: ${Math.round(overview.successRate * 100)}%

## Cost efficiency

- Cost per successful session: ${formatUsd(efficiency.costPerSuccessUsd)}
- Cost per file edited: ${formatUsd(efficiency.costPerFileEditedUsd)}
- Retries per session: ${efficiency.retryRate.toFixed(2)}
- Month-to-date cost: ${formatUsd(projection.monthToDateUsd)} (day ${projection.daysElapsed} of ${projection.daysInMonth}, naive linear projection: ~${formatUsd(projection.projectedMonthUsd)})

## Leaderboard

${toMarkdownTable(leaderboardRows)}
`;

  return new NextResponse(report, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="observatory-report.md"',
    },
  });
}
