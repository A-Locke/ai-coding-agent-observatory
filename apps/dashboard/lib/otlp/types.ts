// Minimal types for the OTLP/HTTP JSON encoding (protobuf JSON mapping).
// https://github.com/open-telemetry/opentelemetry-proto

export interface OtlpAnyValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: string | number;
  doubleValue?: number;
  arrayValue?: { values?: OtlpAnyValue[] };
  kvlistValue?: { values?: OtlpKeyValue[] };
  bytesValue?: string;
}

export interface OtlpKeyValue {
  key: string;
  value?: OtlpAnyValue;
}

export interface OtlpResource {
  attributes?: OtlpKeyValue[];
}

export interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind?: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes?: OtlpKeyValue[];
  status?: { code?: number; message?: string };
}

export interface OtlpResourceSpans {
  resource?: OtlpResource;
  scopeSpans?: { spans?: OtlpSpan[] }[];
}

export interface OtlpTracesPayload {
  resourceSpans?: OtlpResourceSpans[];
}

export interface OtlpNumberDataPoint {
  attributes?: OtlpKeyValue[];
  timeUnixNano?: string;
  asDouble?: number;
  asInt?: string | number;
}

export interface OtlpMetric {
  name: string;
  unit?: string;
  sum?: { dataPoints?: OtlpNumberDataPoint[] };
  gauge?: { dataPoints?: OtlpNumberDataPoint[] };
  histogram?: { dataPoints?: (OtlpNumberDataPoint & { sum?: number; count?: string })[] };
}

export interface OtlpResourceMetrics {
  resource?: OtlpResource;
  scopeMetrics?: { metrics?: OtlpMetric[] }[];
}

export interface OtlpMetricsPayload {
  resourceMetrics?: OtlpResourceMetrics[];
}

export interface OtlpLogRecord {
  timeUnixNano?: string;
  observedTimeUnixNano?: string;
  severityText?: string;
  body?: OtlpAnyValue;
  attributes?: OtlpKeyValue[];
  traceId?: string;
  spanId?: string;
  eventName?: string;
}

export interface OtlpResourceLogs {
  resource?: OtlpResource;
  scopeLogs?: { logRecords?: OtlpLogRecord[] }[];
}

export interface OtlpLogsPayload {
  resourceLogs?: OtlpResourceLogs[];
}
