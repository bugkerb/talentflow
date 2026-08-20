import { z } from "zod";

export const screeningInputSchema = z.object({ jobDescription: z.string().trim().min(1).max(50_000), resumeText: z.string().trim().min(1).max(100_000) }).strict();
export const screeningRequestSchema = screeningInputSchema.extend({ applicationId: z.string().uuid(), resumeId: z.string().uuid() }).strict();
export const screeningResultSchema = z.object({ score: z.number().int().min(0).max(100), recommendation: z.enum(["strong", "weak"]), summary: z.string().trim().min(1).max(2_000), evidence: z.array(z.string().trim().min(1).max(500)).max(10), riskFlags: z.array(z.enum(["prompt_injection", "insufficient_evidence", "format_error"])).max(10), promptVersion: z.string().regex(/^ai-screening-v\d+$/), fixture: z.string().optional() }).strict();
export type ScreeningInput = z.infer<typeof screeningInputSchema>;
export type ScreeningRequest = z.infer<typeof screeningRequestSchema>;
export type ScreeningResult = z.infer<typeof screeningResultSchema>;
