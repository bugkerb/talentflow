import { AppError } from "@/server/errors";

export const RESUME_BUCKET = "private-resumes";
export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_RESUME_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] as const;

export type ValidatedResume = {
  fileName: string;
  mimeType: (typeof SUPPORTED_RESUME_TYPES)[number];
  fileSizeBytes: number;
  bytes: ArrayBuffer;
};

const hasPrefix = (bytes: Uint8Array, prefix: number[]) => prefix.every((value, index) => bytes[index] === value);

export class ResumeService {
  async validateUpload(file: File): Promise<ValidatedResume> {
    if (!(file instanceof File)) throw new AppError("VALIDATION_ERROR", "Invalid resume file");
    if (!SUPPORTED_RESUME_TYPES.includes(file.type as ValidatedResume["mimeType"])) throw new AppError("VALIDATION_ERROR", "Unsupported resume file type");
    if (!file.name.trim() || file.name.includes("/") || file.name.includes("\\") || file.name.length > 180) throw new AppError("VALIDATION_ERROR", "Invalid resume file name");
    if (file.size <= 0 || file.size > MAX_RESUME_SIZE_BYTES) throw new AppError("VALIDATION_ERROR", "Resume file size is not allowed");

    const bytes = await file.arrayBuffer();
    const header = new Uint8Array(bytes.slice(0, 8));
    const validMagic = file.type === "application/pdf"
      ? hasPrefix(header, [0x25, 0x50, 0x44, 0x46, 0x2d])
      : hasPrefix(header, [0x50, 0x4b, 0x03, 0x04]);
    if (!validMagic) throw new AppError("VALIDATION_ERROR", "Resume file signature is invalid");
    return { fileName: file.name, mimeType: file.type as ValidatedResume["mimeType"], fileSizeBytes: file.size, bytes };
  }
}
