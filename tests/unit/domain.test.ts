import { describe, expect, it } from "vitest";
import { isValidStageTransition } from "@/domain/enums";
import { candidateInputSchema, jobInputSchema } from "@/domain/schemas";

describe("domain rules", () => {
  it("allows only sequential stage movement and reject", () => { expect(isValidStageTransition("screening", "phone_screen")).toBe(true); expect(isValidStageTransition("screening", "rejected")).toBe(true); expect(isValidStageTransition("screening", "hired")).toBe(false); expect(isValidStageTransition("hired", "screening")).toBe(false); expect(isValidStageTransition("screening", "screening")).toBe(false); });
  it("validates jobs and referral candidates", () => { expect(jobInputSchema.parse({ title: "Tech Lead", description: "Lead team" }).status).toBe("draft"); expect(candidateInputSchema.safeParse({ fullName: "N", source: "referral" }).success).toBe(false); expect(candidateInputSchema.safeParse({ fullName: "N", source: "referral", referrerName: "Team" }).success).toBe(true); });
});
