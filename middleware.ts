import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  type CookieChange = { name: string; value: string; options: CookieOptions };
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return NextResponse.redirect(new URL("/login", request.url));

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies: CookieChange[]) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_active || !["hr", "admin"].includes(profile.role)) {
    return new NextResponse("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/", "/jobs/:path*", "/discovery/:path*", "/screening/:path*", "/applications/:path*", "/interviews/:path*", "/settings/:path*", "/help/:path*"]
};
