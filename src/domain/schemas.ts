import { z } from "zod";
import { applicationStages, candidateSources, jobStatuses } from "./enums";

export const jobInputSchema = z.object({ title: z.string().trim().min(1).max(160), description: z.string().trim().min(1), department: z.string().trim().max(120).optional(), status: z.enum(jobStatuses).default("draft") });
const candidateFieldsSchema = z.object({ fullName: z.string().trim().min(1).max(160), email: z.string().email().optional(), phone: z.string().trim().max(40).optional(), source: z.enum(candidateSources), sourceDetail: z.string().trim().max(160).optional(), referredBy: z.string().uuid().optional(), referrerName: z.string().trim().max(160).optional() });
const validateReferral = <T extends { source?: string; referredBy?: string; referrerName?: string }>(value: T, ctx: z.RefinementCtx): void => { if (value.source === "referral" && !value.referredBy && !value.referrerName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["referrerName"], message: "Referral requires a referrer" }); };
export const candidateInputSchema = candidateFieldsSchema.superRefine(validateReferral);
export const candidateCreateWithApplicationSchema = candidateFieldsSchema.extend({ jobId: z.string().uuid(), appliedAt: z.string().datetime({ offset: true }).optional() }).superRefine(validateReferral);
export const candidatePatchSchema = candidateFieldsSchema.partial();
export const transitionSchema = z.object({ applicationId: z.string().uuid(), toStage: z.enum(applicationStages), expectedVersion: z.number().int().min(1), reason: z.string().trim().max(500).optional() });
export const jobCloseSchema = z.object({ reason: z.string().trim().min(1).max(160), note: z.string().trim().max(500).optional() });
export const jobVersionSchema = z.number().int().min(1);
const interviewTimestamp = z.string().datetime({ offset: true });
export const interviewScheduleSchema = z.object({
  applicationId: z.string().uuid(),
  interviewType: z.string().trim().min(1).max(80),
  startsAt: interviewTimestamp,
  endsAt: interviewTimestamp,
  timezone: z.string().trim().min(1).max(64),
  interviewerId: z.string().uuid(),
  description: z.string().trim().max(5000).default(""),
  additionalQuestions: z.string().trim().max(2000).default("")
}).superRefine((value, ctx) => {
  if (new Date(value.endsAt).getTime() <= new Date(value.startsAt).getTime()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Interview must end after it starts" });
});
export const interviewRescheduleSchema = z.object({ interviewId: z.string().uuid(), startsAt: interviewTimestamp, endsAt: interviewTimestamp, reason: z.string().trim().max(500).optional() }).superRefine((value, ctx) => {
  if (new Date(value.endsAt).getTime() <= new Date(value.startsAt).getTime()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Interview must end after it starts" });
});
export const interviewCancelSchema = z.object({ interviewId: z.string().uuid(), reason: z.string().trim().min(1).max(500) });
export type JobInput = z.infer<typeof jobInputSchema>;
export type CandidateInput = z.infer<typeof candidateInputSchema>;
export type JobCloseInput = z.infer<typeof jobCloseSchema>;
