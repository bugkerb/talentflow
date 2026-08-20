import { AppError } from "@/server/errors";

export type AuthenticatedUser = { id: string };
export type AuthorizationProfile = {
  id: string;
  role: string;
  isActive: boolean;
};
export type HrActor = { id: string; role: "hr" | "admin" };

const activeHrRoles = new Set<HrActor["role"]>(["hr", "admin"]);

export class AuthorizationService {
  safeReturnPath(value: string | null | undefined): string {
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
      return "/";
    }

    return value;
  }

  requireActiveHr(
    user: AuthenticatedUser | null,
    profile: AuthorizationProfile | null
  ): HrActor {
    if (!user) {
      throw new AppError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
    }

    if (
      !profile ||
      profile.id !== user.id ||
      !profile.isActive ||
      !activeHrRoles.has(profile.role as HrActor["role"])
    ) {
      throw new AppError("FORBIDDEN", "คุณไม่มีสิทธิ์ใช้งานส่วนนี้", 403);
    }

    return { id: user.id, role: profile.role as HrActor["role"] };
  }
}
