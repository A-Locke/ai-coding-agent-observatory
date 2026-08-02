// Minimal CloudWatch Logs -> DynamoDB fan-out for the optional cloud
// dashboard path. Illustrative/best-effort: it assumes log messages are the
// JSON attribute payload the OTel Collector's awscloudwatchlogs exporter
// writes, and skips anything it can't parse rather than failing the batch.
const zlib = require("node:zlib");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const RETENTION_SECONDS = 30 * 24 * 60 * 60;

exports.handler = async (event) => {
  const payload = Buffer.from(event.awslogs.data, "base64");
  const decompressed = zlib.gunzipSync(payload).toString("utf-8");
  const logEvent = JSON.parse(decompressed);
  const expiresAt = Math.floor(Date.now() / 1000) + RETENTION_SECONDS;

  const writes = (logEvent.logEvents ?? []).map(async (entry) => {
    let attributes;
    try {
      attributes = JSON.parse(entry.message);
    } catch {
      return; // not a JSON telemetry record, skip
    }
    const sessionId = attributes["session.id"] ?? "unknown";
    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          sessionId,
          recordKey: `event#${entry.id}`,
          timestamp: entry.timestamp,
          attributes,
          expiresAt,
        },
      })
    );
  });

  await Promise.all(writes);
  return { statusCode: 200 };
};
