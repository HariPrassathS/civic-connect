import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLE_DASHBOARD_PATH } from "@/types/database";
import type { UserRole } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "magiclink" | "email" | undefined;
  const next = searchParams.get("next") ?? "/dashboard/citizen";

  const supabase = await createClient();
  let authSuccess = false;

  // Handle OAuth code exchange (e.g., from Google)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) authSuccess = true;
  }

  // Handle Magic Link token verification
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) authSuccess = true;
  }

  if (authSuccess) {
    // Get user's role to redirect to correct dashboard
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role) {
        const path =
          ROLE_DASHBOARD_PATH[profile.role as UserRole] ||
          "/dashboard/citizen";
        return NextResponse.redirect(`${origin}${path}`);
      }
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // If auth failed, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
