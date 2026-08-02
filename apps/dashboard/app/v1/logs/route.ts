import { NextResponse } from "next/server";
import { processLogs } from "../../../lib/ingest/process";
import { readOtlpJsonBody } from "../../../lib/otlp/read-body";
import type { OtlpLogsPayload } from "../../../lib/otlp/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await readOtlpJsonBody<OtlpLogsPayload>(request);
    const { logCount } = processLogs(payload);
    return NextResponse.json({}, { status: 200, headers: { "x-ingested-logs": String(logCount) } });
  } catch (error) {
    console.error("Failed to ingest OTLP logs", error);
    return NextResponse.json({ message: "failed to ingest logs" }, { status: 500 });
  }
}
