import { z } from "zod";
import { applicationStages, candidateSources, jobStatuses } from "./enums";

export const jobInputSchema = z.object({ title: z.string().trim().min(1).max(160), description: z.string().trim().min(1), department: z.string().trim().max(120).optional(), status: z.enum(jobStatuses).default("draft") });
export const candidateInputSchema = z.object({ fullName: z.string().trim().min(1).max(160), email: z.string().email().optional(), phone: z.string().trim().max(40).optional(), source: z.enum(candidateSources), referredBy: z.string().uuid().optional(), referrerName: z.string().trim().max(160).optional() }).superRefine((value, ctx) => { if (value.source === "referral" && !value.referredBy && !value.referrerName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["referrerName"], message: "Referral requires a referrer" }); });
export const transitionSchema = z.object({ applicationId: z.string().uuid(), toStage: z.enum(applicationStages), expectedVersion: z.number().int().min(1), reason: z.string().trim().max(500).optional() });
export type JobInput = z.infer<typeof jobInputSchema>;
export type CandidateInput = z.infer<typeof candidateInputSchema>;
