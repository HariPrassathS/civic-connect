import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone and OTP are required." }, { status: 400 });
    }

    // 1. Look up the OTP in the database
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from("telegram_otps")
      .select("*")
      .eq("phone", phone)
      .eq("otp", otp)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !otpRecord) {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
    }

    // 2. Check if OTP has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Clean up expired OTP
      await supabaseAdmin.from("telegram_otps").delete().eq("id", otpRecord.id);
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    // 3. Delete the used OTP
    await supabaseAdmin.from("telegram_otps").delete().eq("id", otpRecord.id);

    // 4. Find or create the user in Supabase
    //    Look up by phone in the users table to find the Telegram user's email
    const { data: telegramUser } = await supabaseAdmin
      .from("users")
      .select("name, email")
      .eq("phone", phone)
      .single();

    // Create a pseudo-email from the phone if no email exists
    const userEmail = telegramUser?.email || `tg_${phone.replace(/[^0-9]/g, "")}@civic.local`;
    const userName = telegramUser?.name || "Citizen";

    // Check if Supabase auth user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === userEmail);

    if (!existingUser) {
      // Create new Supabase auth user
      const randomPassword = crypto.randomUUID() + "Aa1!";
      await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: userName,
          phone,
          role: "citizen",
        },
      });
    }

    // 5. Generate magic link for automatic login
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Magic link generation failed:", linkError);
      return NextResponse.json({ error: "Verification succeeded but login failed." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      token_hash: linkData.properties.hashed_token,
      email: userEmail,
    });
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
