// Generic serializers for exporting query results. Deliberately dumb: they
// serialize exactly what's passed in, no export-specific query logic to
// keep in sync with the on-screen views separately.

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export function toMarkdownTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "_No data._";
  const headers = Object.keys(rows[0]!);
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((h) => String(row[h] ?? "")).join(" | ")} |`),
  ];
  return lines.join("\n");
}
