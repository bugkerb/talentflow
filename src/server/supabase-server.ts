import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { readEnv } from "./env";
import { assertSameOriginRequest, assertServerActionOrigin } from "./security";

export const createSupabaseServerClient = async (request?: Request) => {
  const env = readEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error("Supabase server configuration is missing");
  if (request) assertSameOriginRequest(request);
  else assertServerActionOrigin(await headers());
  const cookieStore = await cookies();
  type CookieChange = { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] };
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => cookieStore.getAll(), setAll: (values: CookieChange[]) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } });
};

/** Server-only client for trusted repository writes after auth/input validation. Never expose to client code. */
export const createSupabaseServiceRoleClient = () => {
  const env = readEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase service-role configuration is missing");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
};
