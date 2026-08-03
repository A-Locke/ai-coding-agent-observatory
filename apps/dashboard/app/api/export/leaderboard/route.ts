import { NextResponse } from "next/server";
import { getLeaderboard } from "../../../../lib/queries";
import { toCsv } from "../../../../lib/export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const rows = getLeaderboard();

  if (format === "csv") {
    const csv = toCsv(rows as unknown as Record<string, unknown>[]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="leaderboard.csv"',
      },
    });
  }

  return NextResponse.json(rows, {
    headers: { "Content-Disposition": 'attachment; filename="leaderboard.json"' },
  });
}
