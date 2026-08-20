import "server-only";
import { AuthorizationService, type HrActor } from "@/application/authorization-service";
import { createSupabaseServerClient } from "@/server/supabase-server";

const authorization = new AuthorizationService();

export const requireActiveHr = async (): Promise<HrActor> => {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user ? { id: userData.user.id } : null;

  if (!user) {
    return authorization.requireActiveHr(null, null);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  return authorization.requireActiveHr(user, profile ? {
    id: profile.id,
    role: profile.role,
    isActive: profile.is_active
  } : null);
};
