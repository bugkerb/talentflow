import { createHash } from "node:crypto";
import { AppError } from "@/server/errors";

type Entry = { hash: string; response: unknown };
export class IdempotencyService {
  private readonly entries = new Map<string, Entry>();
  execute<T>(scope: string, key: string, request: unknown, operation: () => T): T {
    const hash = createHash("sha256").update(JSON.stringify(request)).digest("hex");
    const composite = `${scope}:${key}`;
    const existing = this.entries.get(composite);
    if (existing && existing.hash !== hash) throw new AppError("IDEMPOTENCY_CONFLICT", "Idempotency key was reused with a different request");
    if (existing) return existing.response as T;
    const response = operation();
    this.entries.set(composite, { hash, response });
    return response;
  }
}
