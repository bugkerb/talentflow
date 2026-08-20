import { createScreeningService, ScreeningError, type ScreeningAdapter, type ScreeningResult } from "@/application/ai";
import { screeningRequestSchema } from "@/domain/ai-schemas";
import { AppError } from "@/server/errors";

export type ScreeningRecord = {
  id: string;
  applicationId: string;
  resumeId: string;
  status: "completed";
  skillsScore: number | null;
  experienceScore: number | null;
  cultureScore: number | null;
  reasoning: { summary: string; evidence: string[] };
  strengths: string[];
  interviewQuestions: string[];
  model: string | null;
  promptVersion: string;
  schemaVersion: string;
  rawOutput: ScreeningResult;
  errorCode: null;
  createdBy: string;
  createdAt: string;
  completedAt: string;
};

export interface ScreeningRepository {
  insert(record: ScreeningRecord): Promise<ScreeningRecord>;
}

type RuntimeOptions = { provider: string; model?: string; idFactory?: () => string; now?: () => string };

const mapScreeningError = (error: ScreeningError): AppError => {
  if (error.code === "INVALID_INPUT") return new AppError("VALIDATION_ERROR", "Screening input is invalid", 400);
  if (error.code === "MALFORMED_OUTPUT") return new AppError("AI_OUTPUT_INVALID", "AI screening output could not be validated", 422);
  if (error.code === "PROVIDER_RATE_LIMIT") return new AppError("AI_PROVIDER_RATE_LIMITED", "AI provider rate limit exceeded", 429);
  return new AppError("AI_PROVIDER_UNAVAILABLE", "AI screening provider is unavailable", error.code === "PROVIDER_AUTH" ? 503 : 503);
};

export class ScreeningRuntime {
  private readonly service;
  private readonly options: Required<Pick<RuntimeOptions, "idFactory" | "now">> & Omit<RuntimeOptions, "idFactory" | "now">;

  constructor(adapter: ScreeningAdapter, private readonly repository: ScreeningRepository, options: RuntimeOptions) {
    this.service = createScreeningService(adapter);
    this.options = { ...options, idFactory: options.idFactory ?? (() => crypto.randomUUID()), now: options.now ?? (() => new Date().toISOString()) };
  }

  async run(rawInput: unknown, actorId: string): Promise<{ screening: ScreeningRecord; result: ScreeningResult }> {
    const parsed = screeningRequestSchema.safeParse(rawInput);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Screening input is invalid", 400);

    let result: ScreeningResult;
    try {
      result = await this.service.screen({ jobDescription: parsed.data.jobDescription, resumeText: parsed.data.resumeText });
    } catch (error) {
      if (error instanceof ScreeningError) throw mapScreeningError(error);
      throw error;
    }

    const completedAt = this.options.now();
    const screening: ScreeningRecord = {
      id: this.options.idFactory(), applicationId: parsed.data.applicationId, resumeId: parsed.data.resumeId, status: "completed",
      skillsScore: null, experienceScore: null, cultureScore: null,
      reasoning: { summary: result.summary, evidence: result.evidence }, strengths: result.evidence, interviewQuestions: [],
      model: this.options.model ?? null, promptVersion: result.promptVersion, schemaVersion: "screening-v1", rawOutput: result,
      errorCode: null, createdBy: actorId, createdAt: completedAt, completedAt
    };
    return { screening: await this.repository.insert(screening), result };
  }
}
