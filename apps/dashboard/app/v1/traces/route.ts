import { NextResponse } from "next/server";
import { processTraces } from "../../../lib/ingest/process";
import { readOtlpJsonBody } from "../../../lib/otlp/read-body";
import type { OtlpTracesPayload } from "../../../lib/otlp/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await readOtlpJsonBody<OtlpTracesPayload>(request);
    const { spanCount } = processTraces(payload);
    return NextResponse.json({}, { status: 200, headers: { "x-ingested-spans": String(spanCount) } });
  } catch (error) {
    console.error("Failed to ingest OTLP traces", error);
    return NextResponse.json({ message: "failed to ingest traces" }, { status: 500 });
  }
}
