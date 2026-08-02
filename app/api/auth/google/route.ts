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

    // Strategy: Try to generate a magic link directly.
    // If the user doesn't exist, create them first, then generate the link.
    
    // First, try to create the user (will fail silently if exists)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: name || email.split("@")[0],
        avatar_url: photoURL || "",
        role: "citizen",
      },
    });

    // If user already exists, that's fine — we just need the magic link
    if (createError && !createError.message.includes("already been registered")) {
      console.error("User creation error:", createError.message);
    }

    // Get the user ID (either new or existing)
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = userData?.users?.find((u) => u.email === email);

    // Update the profiles table with Google data
    if (targetUser) {
      await supabaseAdmin
        .from("profiles")
        .update({
          full_name: name || email.split("@")[0],
          email,
          avatar_url: photoURL || null,
        })
        .eq("id", targetUser.id);
    }

    // Generate magic link for this email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Magic link generation failed:", linkError);
      return NextResponse.json({ error: "Failed to create login session." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      token_hash: linkData.properties.hashed_token,
      email,
    });
  } catch (error: any) {
    console.error("Google Auth Bridge Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
