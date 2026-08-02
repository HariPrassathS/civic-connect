import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// We need the service role key to insert into the telegram_otps table
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    // 1. Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. Set expiry to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // 3. Save to database
    const { error: dbError } = await supabaseAdmin
      .from("telegram_otps")
      .insert({
        phone,
        otp,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error("DB Error storing OTP:", dbError);
      return NextResponse.json({ error: "Failed to generate OTP." }, { status: 500 });
    }

    // 4. Send via Telegram Bot
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Server misconfiguration: No Telegram Token." }, { status: 500 });
    }
    
    // We can query the `users` table to find their `chat_id` based on their `phone`.
    const { data: telegramUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();
      
    if (!telegramUser) {
      return NextResponse.json({ 
        error: "Phone not registered in Telegram bot. Please start the bot @Civic_ai_complaint_bot first." 
      }, { status: 400 });
    }

    const chatId = telegramUser.id;

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🔐 *Civic Connect Login*\n\nYour OTP is: \`${otp}\`\n\nThis code expires in 10 minutes.`,
        parse_mode: "Markdown"
      })
    });

    if (!telegramRes.ok) {
      console.error("Telegram API Error:", await telegramRes.text());
      return NextResponse.json({ error: "Failed to send Telegram message." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
