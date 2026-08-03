import { describe, expect, it } from "vitest";
import { toCsv, toMarkdownTable } from "./export";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("writes a header row and data rows", () => {
    const csv = toCsv([{ a: 1, b: "x" }, { a: 2, b: "y" }]);
    expect(csv).toBe("a,b\n1,x\n2,y");
  });

  it("quotes and escapes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv([{ note: 'has, a comma and "quotes"\nand a newline' }]);
    expect(csv).toBe('note\n"has, a comma and ""quotes""\nand a newline"');
  });
});

describe("toMarkdownTable", () => {
  it("returns a placeholder for no rows", () => {
    expect(toMarkdownTable([])).toBe("_No data._");
  });

  it("renders a header and separator row", () => {
    const md = toMarkdownTable([{ a: 1, b: "x" }]);
    expect(md).toContain("| a | b |");
    expect(md).toContain("| --- | --- |");
    expect(md).toContain("| 1 | x |");
  });
});
