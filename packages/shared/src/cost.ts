import type { Provider } from "./types";

export interface ModelPricing {
  provider: Provider;
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

// Illustrative pricing for simulation/demo purposes only — not a live feed
// and not guaranteed to match current vendor list prices.
export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-5": { provider: "anthropic", inputPerMillionUsd: 15, outputPerMillionUsd: 75 },
  "claude-sonnet-5": { provider: "anthropic", inputPerMillionUsd: 3, outputPerMillionUsd: 15 },
  "claude-haiku-4-5": { provider: "anthropic", inputPerMillionUsd: 0.8, outputPerMillionUsd: 4 },
  "gpt-5.1-codex": { provider: "openai", inputPerMillionUsd: 5, outputPerMillionUsd: 15 },
  "gpt-5-codex-mini": { provider: "openai", inputPerMillionUsd: 0.5, outputPerMillionUsd: 1.5 },
  "gemini-2.5-pro": { provider: "google", inputPerMillionUsd: 1.25, outputPerMillionUsd: 10 },
  "gemini-2.5-flash": { provider: "google", inputPerMillionUsd: 0.15, outputPerMillionUsd: 0.6 },
};

export const DEFAULT_PRICING: ModelPricing = {
  provider: "anthropic",
  inputPerMillionUsd: 3,
  outputPerMillionUsd: 15,
};

export function getModelPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? DEFAULT_PRICING;
}

export function calculateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = getModelPricing(model);
  const cost =
    (inputTokens / 1_000_000) * pricing.inputPerMillionUsd +
    (outputTokens / 1_000_000) * pricing.outputPerMillionUsd;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function listModelsForProvider(provider: Provider): string[] {
  return Object.entries(MODEL_PRICING)
    .filter(([, pricing]) => pricing.provider === provider)
    .map(([model]) => model);
}
