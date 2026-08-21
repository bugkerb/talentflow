import "server-only";
import { createAnthropicScreeningAdapter, createFixtureScreeningAdapter, createOpenRouterScreeningAdapter, type ScreeningAdapter } from "@/application/ai";
import { readEnv } from "@/server/env";

export const createConfiguredScreeningAdapter = (env = readEnv()): ScreeningAdapter => {
  if (env.AI_PROVIDER === "fixture") return createFixtureScreeningAdapter("strong");
  if (env.AI_PROVIDER === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) throw new Error("AI screening provider is not configured");
    return createAnthropicScreeningAdapter({ apiKey: env.ANTHROPIC_API_KEY, model: env.AI_MODEL });
  }
  if (!env.OPENROUTER_API_KEY) throw new Error("AI screening provider is not configured");
  return createOpenRouterScreeningAdapter({ apiKey: env.OPENROUTER_API_KEY, model: env.AI_MODEL });
};
