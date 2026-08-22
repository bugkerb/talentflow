import { describe, expect, it } from "vitest";
import { MAX_RESUME_SIZE_BYTES, ResumeService } from "@/application/resume-service";
import { AppError } from "@/server/errors";

const service = new ResumeService();
const pdf = (name = "resume.pdf", type = "application/pdf", bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])) => new File([bytes], name, { type });
const errorOf = async (file: File) => { try { await service.validateUpload(file); throw new Error("expected rejection"); } catch (error) { return error as AppError; } };

describe("ResumeService", () => {
  it("accepts a PDF only when declared metadata and magic bytes agree", async () => { await expect(service.validateUpload(pdf())).resolves.toMatchObject({ fileName: "resume.pdf", mimeType: "application/pdf", fileSizeBytes: 6 }); });
  it("accepts DOCX and rejects unsupported metadata", async () => { await expect(service.validateUpload(pdf("resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", new Uint8Array([0x50, 0x4b, 0x03, 0x04])))).resolves.toBeTruthy(); expect((await errorOf(pdf("resume.png", "image/png"))).code).toBe("VALIDATION_ERROR"); });
  it("accepts plain text from the screening paste channel", async () => { await expect(service.validateUpload(new File(["TypeScript experience"], "resume.txt", { type: "text/plain" }))).resolves.toMatchObject({ fileName: "resume.txt", mimeType: "text/plain" }); });
  it("extracts validated plain text for screening", async () => { await expect(service.extractText(new File(["TypeScript experience"], "resume.txt", { type: "text/plain" }))).resolves.toBe("TypeScript experience"); });
  it("validates an upload before attempting text extraction", async () => { await expect(service.extractText(pdf("spoof.pdf", "application/pdf", new Uint8Array([1, 2, 3])))).rejects.toMatchObject({ code: "VALIDATION_ERROR" }); });
  it.each([pdf("spoof.pdf", "application/pdf", new Uint8Array([1, 2, 3])), pdf("resume.pdf", "application/pdf", new Uint8Array(MAX_RESUME_SIZE_BYTES + 1))])("fails closed for invalid resume content", async (file) => { expect((await errorOf(file)).code).toBe("VALIDATION_ERROR"); });
  it("rejects unsafe names and empty files", async () => { expect((await errorOf(pdf("../resume.pdf"))).code).toBe("VALIDATION_ERROR"); expect((await errorOf(pdf("empty.pdf", "application/pdf", new Uint8Array()))).code).toBe("VALIDATION_ERROR"); });
  it("rejects values that are not File objects", async () => { await expect(service.validateUpload(null as unknown as File)).rejects.toMatchObject({ code: "VALIDATION_ERROR" }); });
});
