import { describe, expect, it } from "vitest";
import { calculateCostUsd, DEFAULT_PRICING, getModelPricing, listModelsForProvider } from "./cost";

describe("calculateCostUsd", () => {
  it("computes cost from input/output token pricing", () => {
    const cost = calculateCostUsd("claude-sonnet-5", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(3 + 15, 6);
  });

  it("returns 0 for a session with no token usage", () => {
    expect(calculateCostUsd("claude-sonnet-5", 0, 0)).toBe(0);
  });

  it("falls back to default pricing for an unknown model", () => {
    expect(getModelPricing("some-future-model")).toEqual(DEFAULT_PRICING);
  });
});

describe("listModelsForProvider", () => {
  it("lists only models for the requested provider", () => {
    const models = listModelsForProvider("google");
    expect(models).toContain("gemini-2.5-pro");
    expect(models).not.toContain("claude-sonnet-5");
  });
});
