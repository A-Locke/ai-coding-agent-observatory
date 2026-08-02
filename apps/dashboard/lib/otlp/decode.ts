import type {
  OtlpAnyValue,
  OtlpKeyValue,
  OtlpLogsPayload,
  OtlpMetricsPayload,
  OtlpTracesPayload,
} from "./types";

export function anyValueToJs(value?: OtlpAnyValue): unknown {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.boolValue !== undefined) return value.boolValue;
  if (value.intValue !== undefined) {
    return typeof value.intValue === "string" ? Number(value.intValue) : value.intValue;
  }
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.arrayValue !== undefined) return (value.arrayValue.values ?? []).map(anyValueToJs);
  if (value.kvlistValue !== undefined) return attributesToRecord(value.kvlistValue.values ?? []);
  if (value.bytesValue !== undefined) return value.bytesValue;
  return null;
}

export function attributesToRecord(attrs: OtlpKeyValue[] | undefined): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const kv of attrs ?? []) {
    result[kv.key] = anyValueToJs(kv.value);
  }
  return result;
}

function nanoToIso(nano: string | undefined): string {
  if (!nano) return new Date().toISOString();
  return new Date(Number(BigInt(nano) / 1_000_000n)).toISOString();
}

function nanoDiffToMs(startNano: string, endNano: string): number {
  try {
    return Number(BigInt(endNano) - BigInt(startNano)) / 1_000_000;
  } catch {
    return 0;
  }
}

const SPAN_STATUS_CODE = ["UNSET", "OK", "ERROR"] as const;

export interface FlatSpan {
  resourceAttributes: Record<string, unknown>;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  kind: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  durationMs: number;
  statusCode: "OK" | "ERROR" | "UNSET";
  attributes: Record<string, unknown>;
}

export function flattenTraces(payload: OtlpTracesPayload): FlatSpan[] {
  const spans: FlatSpan[] = [];
  for (const resourceSpans of payload.resourceSpans ?? []) {
    const resourceAttributes = attributesToRecord(resourceSpans.resource?.attributes);
    for (const scopeSpans of resourceSpans.scopeSpans ?? []) {
      for (const span of scopeSpans.spans ?? []) {
        const spanAttributes = attributesToRecord(span.attributes);
        spans.push({
          resourceAttributes,
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId ?? null,
          name: span.name,
          kind: String(span.kind ?? 0),
          startTimeUnixNano: span.startTimeUnixNano,
          endTimeUnixNano: span.endTimeUnixNano,
          durationMs: nanoDiffToMs(span.startTimeUnixNano, span.endTimeUnixNano),
          statusCode: SPAN_STATUS_CODE[span.status?.code ?? 0] ?? "UNSET",
          attributes: { ...resourceAttributes, ...spanAttributes },
        });
      }
    }
  }
  return spans;
}

export interface FlatMetricPoint {
  resourceAttributes: Record<string, unknown>;
  metricName: string;
  unit: string;
  value: number;
  timeUnixNano: string;
  attributes: Record<string, unknown>;
}

export function flattenMetrics(payload: OtlpMetricsPayload): FlatMetricPoint[] {
  const points: FlatMetricPoint[] = [];
  for (const resourceMetrics of payload.resourceMetrics ?? []) {
    const resourceAttributes = attributesToRecord(resourceMetrics.resource?.attributes);
    for (const scopeMetrics of resourceMetrics.scopeMetrics ?? []) {
      for (const metric of scopeMetrics.metrics ?? []) {
        const dataPoints = metric.sum?.dataPoints ?? metric.gauge?.dataPoints ?? metric.histogram?.dataPoints ?? [];
        for (const dp of dataPoints) {
          const value = dp.asDouble ?? (dp.asInt !== undefined ? Number(dp.asInt) : 0) ?? 0;
          points.push({
            resourceAttributes,
            metricName: metric.name,
            unit: metric.unit ?? "",
            value,
            timeUnixNano: dp.timeUnixNano ?? "",
            attributes: { ...resourceAttributes, ...attributesToRecord(dp.attributes) },
          });
        }
      }
    }
  }
  return points;
}

export interface FlatLogRecord {
  resourceAttributes: Record<string, unknown>;
  name: string | null;
  occurredAt: string;
  body: unknown;
  attributes: Record<string, unknown>;
}

export function flattenLogs(payload: OtlpLogsPayload): FlatLogRecord[] {
  const records: FlatLogRecord[] = [];
  for (const resourceLogs of payload.resourceLogs ?? []) {
    const resourceAttributes = attributesToRecord(resourceLogs.resource?.attributes);
    for (const scopeLogs of resourceLogs.scopeLogs ?? []) {
      for (const log of scopeLogs.logRecords ?? []) {
        const logAttributes = attributesToRecord(log.attributes);
        const name = log.eventName ?? (logAttributes["event.name"] as string | undefined) ?? null;
        records.push({
          resourceAttributes,
          name,
          occurredAt: nanoToIso(log.timeUnixNano ?? log.observedTimeUnixNano),
          body: anyValueToJs(log.body),
          attributes: { ...resourceAttributes, ...logAttributes },
        });
      }
    }
  }
  return records;
}

export { nanoToIso };
