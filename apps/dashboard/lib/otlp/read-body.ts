import { gunzipSync } from "node:zlib";

// The OTel Collector's otlphttp exporter gzip-compresses request bodies by
// default (Content-Encoding: gzip); a real agent talking to this endpoint
// directly could too. Decompress when that header is present instead of
// assuming a plain JSON body.
export async function readOtlpJsonBody<T>(request: Request): Promise<T> {
  const buffer = Buffer.from(await request.arrayBuffer());
  const encoding = request.headers.get("content-encoding") ?? "";
  const raw = encoding.includes("gzip") ? gunzipSync(buffer) : buffer;
  return JSON.parse(raw.toString("utf-8")) as T;
}
