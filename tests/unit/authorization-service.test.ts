import { describe, expect, it } from "vitest";
import { AuthorizationService } from "@/application/authorization-service";
import { AppError } from "@/server/errors";

const service = new AuthorizationService();

const captureError = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return error as AppError;
  }
  throw new Error("Expected authorization to fail");
};

describe("AuthorizationService", () => {
  it("rejects a missing authenticated user with a stable 401 error", () => {
    const error = captureError(() => service.requireActiveHr(null, null));

    expect(error).toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  });

  it("rejects a user without a matching profile", () => {
    const error = captureError(() => service.requireActiveHr({ id: "user-1" }, null));

    expect(error).toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it.each([
    [{ id: "user-1", role: "viewer", isActive: true }, "unsupported role"],
    [{ id: "user-1", role: "hr", isActive: false }, "inactive profile"],
    [{ id: "another-user", role: "hr", isActive: true }, "profile identity mismatch"]
  ])("rejects %s", (profile) => {
    const error = captureError(() => service.requireActiveHr({ id: "user-1" }, profile));

    expect(error).toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it.each(["hr", "admin"] as const)("authorizes an active %s actor", (role) => {
    expect(service.requireActiveHr(
      { id: "user-1" },
      { id: "user-1", role, isActive: true }
    )).toEqual({ id: "user-1", role });
  });

  it.each([
    ["/jobs?status=open", "/jobs?status=open"],
    [null, "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil", "/"]
  ])("normalizes return path %s", (value, expected) => {
    expect(service.safeReturnPath(value)).toBe(expected);
  });
});
