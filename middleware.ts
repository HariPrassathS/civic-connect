import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { ROLE_DASHBOARD_PATH } from "@/types/database";
import type { UserRole } from "@/types/database";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // ── Redirect authenticated users away from auth pages ───────
  if (user && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    // Look up user role to redirect to correct dashboard
    const redirectUrl = await getRedirectUrl(request, user.id);
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // ── Protect dashboard/admin routes ──────────────────────────
  if (
    !user &&
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

/**
 * Look up the user's role from their profile and return the correct
 * dashboard path. Falls back to /dashboard/citizen if lookup fails.
 */
async function getRedirectUrl(
  request: NextRequest,
  userId: string
): Promise<string> {
  try {
    // Create a separate Supabase client for the profile query
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // No-op — we only need to read here
          },
        },
      }
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profile?.role) {
      return (
        ROLE_DASHBOARD_PATH[profile.role as UserRole] || "/dashboard/citizen"
      );
    }
  } catch {
    // Fall through to default
  }

  return "/dashboard/citizen";
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (sw.js, manifest.json, icons)
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
