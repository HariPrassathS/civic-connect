import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLE_DASHBOARD_PATH } from "@/types/database";
import type { UserRole } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/citizen";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
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
  }

  // If code exchange failed, redirect to login with error
  return NextResponse.redirect(`${origin}/login`);
}
