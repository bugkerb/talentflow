import { z } from "zod";

const optionalSecret = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(["fixture", "anthropic", "openrouter"]).default("fixture"),
  AI_MODEL: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: optionalSecret,
  OPENROUTER_API_KEY: optionalSecret,
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1")
}).superRefine((env, ctx) => {
  if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) ctx.addIssue({ code: "custom", path: ["ANTHROPIC_API_KEY"], message: "Required for anthropic provider" });
  if (env.AI_PROVIDER === "openrouter" && !env.OPENROUTER_API_KEY) ctx.addIssue({ code: "custom", path: ["OPENROUTER_API_KEY"], message: "Required for openrouter provider" });
});
export const readEnv = (input: Record<string, string | undefined> = process.env) => envSchema.parse(input);
