import "server-only";
import { createAnthropicScreeningAdapter, createFixtureScreeningAdapter, createOpenRouterScreeningAdapter, type ScreeningAdapter } from "@/application/ai";
import { readEnv } from "@/server/env";

export const createConfiguredScreeningAdapter = (env = readEnv()): ScreeningAdapter => {
  if (env.AI_PROVIDER === "fixture") return createFixtureScreeningAdapter("strong");
  if (env.AI_PROVIDER === "anthropic") return createAnthropicScreeningAdapter({ apiKey: env.ANTHROPIC_API_KEY as string, model: env.AI_MODEL });
  return createOpenRouterScreeningAdapter({ apiKey: env.OPENROUTER_API_KEY as string, model: env.AI_MODEL });
};
