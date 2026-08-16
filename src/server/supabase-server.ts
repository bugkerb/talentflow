import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readEnv } from "./env";

export const createSupabaseServerClient = async () => {
  const env = readEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error("Supabase server configuration is missing");
  const cookieStore = await cookies();
  type CookieChange = { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] };
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => cookieStore.getAll(), setAll: (values: CookieChange[]) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } });
};
