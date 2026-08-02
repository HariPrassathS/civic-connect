/**
 * Civic Connect — Telegram Bot
 * 
 * This bot receives citizen complaints via Telegram (text, photos, voice notes)
 * and automatically creates accounts, categorizes issues with AI, and logs them.
 * 
 * Setup: Talk to @BotFather on Telegram → /newbot → get your token → paste in .env.local
 * Usage: node telegram-bot.mjs
 */

import TelegramBot from "node-telegram-bot-api";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── Load .env.local manually ───────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

// ─── Validate Config ────────────────────────────────────────────────────────
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!TELEGRAM_TOKEN || TELEGRAM_TOKEN === "your_telegram_bot_token_here") {
  console.error("❌ TELEGRAM_BOT_TOKEN is not set in .env.local");
  console.error("");
  console.error("How to get your token:");
  console.error("  1. Open Telegram and search for @BotFather");
  console.error("  2. Send /newbot");
  console.error("  3. Follow the prompts to name your bot");
  console.error("  4. Copy the token and paste it in .env.local");
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

// ─── Supabase Client ────────────────────────────────────────────────────────
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Groq AI Categorization ────────────────────────────────────────────────
async function categorizeWithAI(text) {
  if (!GROQ_API_KEY) return { category: "Other", priority: "medium", summary: text.substring(0, 50) };

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an AI that categorizes civic complaints for a Smart City platform.
Given a citizen's complaint text, return a JSON object with:
- "category": one of ["Road Hazard", "Water Supply", "Garbage", "Streetlight", "Drainage", "Noise", "Encroachment", "Other"]
- "priority": one of ["critical", "high", "medium", "low"]
- "summary": a brief 1-line summary of the issue

Respond ONLY with valid JSON, no markdown.`,
          },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    return JSON.parse(content);
  } catch (e) {
    console.error("   ⚠️ AI categorization failed:", e.message);
    return { category: "Other", priority: "medium", summary: text.substring(0, 50) };
  }
}

// ─── Initialize Bot ─────────────────────────────────────────────────────────
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log("╔═══════════════════════════════════════════════╗");
console.log("║     🏛️  Civic Connect — Telegram Bot         ║");
console.log("║     Powered by Groq AI                       ║");
console.log("╚═══════════════════════════════════════════════╝");
console.log("");

// ─── /start Command ─────────────────────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "Citizen";

  await bot.sendMessage(
    chatId,
    `🏛️ *Welcome to Civic Connect, ${name}!*\n\n` +
    `I'm your AI-powered civic complaint assistant. You can report issues in your city and I'll automatically categorize and assign them to the right department.\n\n` +
    `*How to report an issue:*\n` +
    `📝 Send a *text message* describing the problem\n` +
    `📷 Send a *photo* of the issue (with a caption)\n` +
    `🎤 Send a *voice note* describing the issue\n\n` +
    `*Example:* "There is a massive pothole on Main Street near the bus stop"\n\n` +
    `Type /help for more commands.`,
    { parse_mode: "Markdown" }
  );

  console.log(`👋 /start from ${name} (${msg.from.id})`);
});

// ─── /help Command ──────────────────────────────────────────────────────────
bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `📋 *Civic Connect Commands:*\n\n` +
    `/start — Welcome message\n` +
    `/help — Show this help\n` +
    `/status — Check your complaint status\n` +
    `/mycases — View all your complaints\n\n` +
    `Just send any message, photo, or voice note to file a complaint!`,
    { parse_mode: "Markdown" }
  );
});

// ─── /mycases Command ───────────────────────────────────────────────────────
bot.onText(/\/mycases/, async (msg) => {
  const telegramId = String(msg.from.id);

  // Try both phone formats in case of earlier registrations
  let profile = null;
  const { data: p1 } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", `tg_${telegramId}`)
    .single();
  profile = p1;

  if (!profile) {
    // Also try looking up by email pattern
    const { data: authUser } = await supabase.auth.admin.listUsers();
    const tgUser = authUser?.users?.find(u => u.email === `tg_${telegramId}@civicconnect.local`);
    if (tgUser) {
      profile = { id: tgUser.id };
    }
  }

  if (!profile) {
    await bot.sendMessage(msg.chat.id, "📭 You haven't filed any complaints yet. Just send me a message to get started!");
    return;
  }

  const { data: complaints } = await supabase
    .from("complaints")
    .select("id, title, status, category_id, created_at")
    .eq("citizen_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!complaints || complaints.length === 0) {
    await bot.sendMessage(msg.chat.id, "📭 No complaints found.");
    return;
  }

  const statusEmoji = { received: "📩", assigned: "👷", in_progress: "🔧", resolved: "✅", closed: "🔒", reopened: "🔄" };

  let text = "📋 *Your Recent Complaints:*\n\n";
  for (const c of complaints) {
    const emoji = statusEmoji[c.status] || "📌";
    const date = new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    text += `${emoji} *${c.title}*\n`;
    text += `   ID: \`${c.id.substring(0, 8)}\` | Status: *${c.status}* | ${date}\n\n`;
  }

  await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// ─── /status Command (bare — no ID) ─────────────────────────────────────────
bot.onText(/^\/status$/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "📋 To check a complaint status, use:\n`/status <complaint_id>`\n\nExample: `/status 6429cd75`\n\nUse /mycases to see all your complaint IDs.",
    { parse_mode: "Markdown" }
  );
});

// ─── /status Command (with ID) ──────────────────────────────────────────────
bot.onText(/\/status (.+)/, async (msg, match) => {
  const complaintId = match[1].trim().toLowerCase();

  // Handle UUID prefix search (e.g. 6429cd75)
  let minId = complaintId;
  let maxId = complaintId;
  
  if (complaintId.length < 36) {
    const padded = complaintId.padEnd(8, "0");
    minId = padded + "-0000-0000-0000-000000000000";
    maxId = padded + "-ffff-ffff-ffff-ffffffffffff";
  }

  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("*, categories(name)")
    .gte("id", minId)
    .lte("id", maxId)
    .limit(1);

  const complaint = complaints?.[0];

  if (!complaint) {
    await bot.sendMessage(msg.chat.id, `❌ Complaint \`${match[1]}\` not found.`, { parse_mode: "Markdown" });
    return;
  }

  const statusEmoji = { received: "📩", assigned: "👷", in_progress: "🔧", resolved: "✅", closed: "🔒", reopened: "🔄" };
  const emoji = statusEmoji[complaint.status] || "📌";

  await bot.sendMessage(
    msg.chat.id,
    `${emoji} *Complaint Status*\n\n` +
    `📋 *ID:* \`${complaint.id.substring(0, 8).toUpperCase()}\`\n` +
    `📝 *Title:* ${complaint.title}\n` +
    `📂 *Category:* ${complaint.categories?.name || "Other"}\n` +
    `📊 *Status:* ${complaint.status}\n` +
    `📅 *Filed:* ${new Date(complaint.created_at).toLocaleDateString("en-IN")}`,
    { parse_mode: "Markdown" }
  );
});

// ─── Process Complaint (shared logic) ───────────────────────────────────────
async function processComplaint(msg, messageText, mediaPath = null) {
  const chatId = msg.chat.id;
  const telegramId = String(msg.from.id);
  const senderName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || "Citizen";

  console.log(`\n📩 New complaint from ${senderName} (tg_${telegramId})`);
  console.log(`   📝 Text: "${messageText}"`);

  // Send "processing" indicator
  await bot.sendChatAction(chatId, "typing");

  try {
    // ─── Step 1: AI Categorization ──────────────────────────────────
    console.log("   🤖 Running AI categorization...");
    const aiResult = await categorizeWithAI(messageText);
    console.log(`   📊 Category: ${aiResult.category} | Priority: ${aiResult.priority}`);

    // ─── Step 2: Find or create user ────────────────────────────────
    let userId = null;
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", `tg_${telegramId}`)
      .single();

    if (existingProfile) {
      userId = existingProfile.id;
      console.log(`   👤 Existing user: ${userId.substring(0, 8)}...`);
    } else {
      const email = `tg_${telegramId}@civicconnect.local`;
      const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: `CivicConnect_TG_${telegramId}_${Date.now()}`,
        email_confirm: true,
        user_metadata: { full_name: senderName, role: "citizen" },
      });

      if (authError) {
        console.error("   ❌ Failed to create user:", authError.message);
        await bot.sendMessage(chatId, "❌ Sorry, we couldn't create your account. Please try again later.");
        return;
      }

      userId = newUser.user.id;
      await supabase.from("profiles").update({
        phone: `tg_${telegramId}`,
        full_name: senderName,
      }).eq("id", userId);

      console.log(`   ✨ New user created: ${userId.substring(0, 8)}... (${senderName})`);
    }

    // ─── Step 3: Find category in DB ────────────────────────────────
    let categoryId = null;
    const { data: catRow } = await supabase
      .from("categories")
      .select("id")
      .ilike("name", `%${aiResult.category}%`)
      .limit(1)
      .single();

    if (catRow) {
      categoryId = catRow.id;
    } else {
      const { data: otherCat } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", "Other")
        .limit(1)
        .single();
      categoryId = otherCat?.id || null;
    }

    // ─── Step 4: Insert complaint ───────────────────────────────────
    const { data: complaint, error: insertError } = await supabase
      .from("complaints")
      .insert({
        citizen_id: userId,
        category_id: categoryId,
        title: aiResult.summary || messageText.substring(0, 50),
        description: messageText,
        visibility: "public",
        status: "received",
      })
      .select()
      .single();

    if (insertError) {
      console.error("   ❌ Failed to insert complaint:", insertError.message);
      await bot.sendMessage(chatId, "❌ Sorry, we couldn't log your complaint right now. Please try again.");
      return;
    }

    console.log(`   ✅ Complaint created: ${complaint.id.substring(0, 8)}...`);

    // ─── Step 5: Send confirmation ──────────────────────────────────
    await bot.sendMessage(
      chatId,
      `✅ *Complaint Registered Successfully!*\n\n` +
      `📋 *ID:* \`${complaint.id.substring(0, 8).toUpperCase()}\`\n` +
      `📂 *Category:* ${aiResult.category}\n` +
      `⚡ *Priority:* ${aiResult.priority.toUpperCase()}\n` +
      `📝 *Summary:* ${aiResult.summary}\n\n` +
      `🤖 Our AI has analyzed your issue and it has been assigned to the relevant department.\n` +
      `📲 You will receive updates here on Telegram.\n\n` +
      `_Use /mycases to view all your complaints._\n` +
      `_Use /status ${complaint.id.substring(0, 8)} to check this complaint._`,
      { parse_mode: "Markdown" }
    );

    console.log("   📤 Confirmation sent!\n");

  } catch (err) {
    console.error("   ❌ Error processing complaint:", err);
    await bot.sendMessage(chatId, "❌ An error occurred. Please try again.");
  }
}

// ─── Handle Text Messages ───────────────────────────────────────────────────
bot.on("message", async (msg) => {
  // Skip commands
  if (msg.text?.startsWith("/")) return;
  // Skip non-text, non-photo, non-voice
  if (!msg.text && !msg.photo && !msg.voice && !msg.audio) return;

  if (msg.text) {
    await processComplaint(msg, msg.text);
  }
});

// ─── Handle Photos ──────────────────────────────────────────────────────────
bot.on("photo", async (msg) => {
  const caption = msg.caption || "Photo complaint (no description provided)";
  
  // Download the photo
  try {
    const photo = msg.photo[msg.photo.length - 1]; // Highest resolution
    const filePath = await bot.downloadFile(photo.file_id, path.join(__dirname, "public", "telegram-media"));
    console.log(`   📷 Photo saved: ${filePath}`);
    await processComplaint(msg, caption, filePath);
  } catch (e) {
    console.error("   ⚠️ Could not download photo:", e.message);
    await processComplaint(msg, caption);
  }
});

// ─── Handle Voice Notes ─────────────────────────────────────────────────────
bot.on("voice", async (msg) => {
  const text = "Voice note complaint (audio transcription coming soon)";
  
  try {
    const filePath = await bot.downloadFile(msg.voice.file_id, path.join(__dirname, "public", "telegram-media"));
    console.log(`   🎤 Voice note saved: ${filePath}`);
    await processComplaint(msg, text, filePath);
  } catch (e) {
    console.error("   ⚠️ Could not download voice note:", e.message);
    await processComplaint(msg, text);
  }
});

// ─── Bot Ready ──────────────────────────────────────────────────────────────
bot.getMe().then((me) => {
  console.log(`✅ Bot is live! Username: @${me.username}`);
  console.log(`🔗 Share this link: https://t.me/${me.username}`);
  console.log("");
  console.log("🤖 Listening for messages...\n");
}).catch((err) => {
  console.error("❌ Failed to start bot:", err.message);
  process.exit(1);
});
