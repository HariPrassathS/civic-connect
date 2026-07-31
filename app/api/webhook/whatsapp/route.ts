import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";

// 1. GET handler for Meta Webhook Verification
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WhatsApp Webhook Verified!");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// 2. POST handler for incoming WhatsApp messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verify this is a WhatsApp API event
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Not a WhatsApp event" }, { status: 404 });
    }

    // Process all entries and changes
    for (const entry of body.entry) {
      const changes = entry.changes;
      
      for (const change of changes) {
        if (change.value.messages && change.value.messages.length > 0) {
          const msg = change.value.messages[0];
          const phone = change.value.contacts[0].wa_id;
          
          await processIncomingMessage(msg, phone);
        }
      }
    }

    // Always return 200 OK to Meta so they don't retry the webhook
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function processIncomingMessage(msg: any, phone: string) {
  const supabase = createServiceRoleClient();
  let messageText = "";

  if (msg.type === "text") {
    messageText = msg.text.body;
  } else if (msg.type === "image") {
    messageText = msg.image.caption || "Image attached";
    // Downloading image from Meta API requires an authenticated GET request to the media URL
    // For this MVP, we will just log the text. 
    // In a full implementation, you would fetch(msg.image.id) to get the URL, then fetch the URL with Bearer token.
  } else if (msg.type === "audio") {
    messageText = "Voice note attached";
  } else {
    // Ignore other types
    return;
  }

  // 1. Find or create user
  let userId = null;
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .single();

  if (existingProfile) {
    userId = existingProfile.id;
  } else {
    const email = `wa_${phone}@civicconnect.local`;
    const { data: newUser } = await supabase.auth.admin.createUser({
      email: email,
      password: "SecurePassword123!",
      email_confirm: true,
    });
    
    if (newUser?.user) {
      userId = newUser.user.id;
      await supabase.from("profiles").update({ 
        phone: phone, 
        full_name: `Citizen (${phone})` 
      }).eq("id", userId);
    }
  }

  if (!userId) {
    await sendWhatsAppMessage(phone, "Sorry, we encountered an internal error. Please try again later.");
    return;
  }

  // 2. Insert complaint
  const { data: genCat } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", "Other")
    .limit(1)
    .single();

  const { data: complaint, error: insertError } = await supabase
    .from("complaints")
    .insert({
      citizen_id: userId,
      category_id: genCat?.id || null,
      title: messageText.substring(0, 50) + (messageText.length > 50 ? "..." : ""),
      description: messageText,
      visibility: "public",
      status: "received",
    })
    .select()
    .single();

  if (insertError || !complaint) {
    await sendWhatsAppMessage(phone, "Sorry, we couldn't log your complaint at this time.");
    return;
  }

  // 3. Trigger AI processing (fire and forget)
  fetch(`http://localhost:3000/api/ai/trigger-complaint?id=${complaint.id}`, { method: 'POST' }).catch(() => {});

  // 4. Send Confirmation Reply
  await sendWhatsAppMessage(
    phone, 
    `✅ Thank you for reporting this issue via Civic Connect!\n\n📋 Complaint ID: ${complaint.id.substring(0, 8)}\n🤖 Our AI is categorizing and assigning it to a field worker now.\n\nYou will be notified when it's resolved.`
  );
}
