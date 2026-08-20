"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthorizationService } from "@/application/authorization-service";
import { createSupabaseServerClient } from "@/server/supabase-server";

export type LoginState = { error: string | null };

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(1024),
  next: z.string().max(2048).optional()
});

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined
  });

  if (!parsed.success) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };

  try {
    const { data: profile } = await supabase.from("profiles").select("id, role, is_active").eq("id", data.user.id).maybeSingle();
    new AuthorizationService().requireActiveHr(data.user, profile && { id: profile.id, role: profile.role, isActive: profile.is_active });
  } catch {
    await supabase.auth.signOut();
    return { error: "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน TalentFlow" };
  }

  redirect(new AuthorizationService().safeReturnPath(parsed.data.next));
}
