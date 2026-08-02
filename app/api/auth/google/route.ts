import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, name, photoURL } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // 1. Check if user already exists in Supabase auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email
    );

    if (existingUser) {
      // User exists — generate a magic link to log them in
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (error || !data?.properties?.hashed_token) {
        console.error("Magic link generation failed:", error);
        return NextResponse.json({ error: "Failed to generate session." }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "login",
        token_hash: data.properties.hashed_token,
        email,
      });
    } else {
      // New user — create them in Supabase with a random password
      const randomPassword = crypto.randomUUID() + "Aa1!";
      
      const { data: newUser, error: signupError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name || email.split("@")[0],
          avatar_url: photoURL || "",
          role: "citizen",
        },
      });

      if (signupError) {
        console.error("Supabase user creation failed:", signupError);
        return NextResponse.json({ error: signupError.message }, { status: 500 });
      }

      // Generate magic link to log them in immediately
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (error || !data?.properties?.hashed_token) {
        console.error("Magic link generation failed:", error);
        return NextResponse.json({ error: "Account created but login failed." }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "signup",
        token_hash: data.properties.hashed_token,
        email,
      });
    }
  } catch (error: any) {
    console.error("Google Auth Bridge Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
