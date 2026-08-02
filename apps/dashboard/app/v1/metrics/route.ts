import { NextResponse } from "next/server";
import { processMetrics } from "../../../lib/ingest/process";
import { readOtlpJsonBody } from "../../../lib/otlp/read-body";
import type { OtlpMetricsPayload } from "../../../lib/otlp/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await readOtlpJsonBody<OtlpMetricsPayload>(request);
    const { metricCount } = processMetrics(payload);
    return NextResponse.json({}, { status: 200, headers: { "x-ingested-metrics": String(metricCount) } });
  } catch (error) {
    console.error("Failed to ingest OTLP metrics", error);
    return NextResponse.json({ message: "failed to ingest metrics" }, { status: 500 });
  }
}
