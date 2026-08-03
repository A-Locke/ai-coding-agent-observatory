import { NextResponse } from "next/server";
import { listSessions } from "../../../../lib/queries";
import { toCsv } from "../../../../lib/export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const sessions = listSessions({ limit: 10_000 });

  if (format === "csv") {
    const csv = toCsv(sessions as unknown as Record<string, unknown>[]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sessions.csv"',
      },
    });
  }

  return NextResponse.json(sessions, {
    headers: { "Content-Disposition": 'attachment; filename="sessions.json"' },
  });
}
