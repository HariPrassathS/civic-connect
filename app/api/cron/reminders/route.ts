import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "dev-secret-key";

  if (
    authHeader !== `Bearer ${cronSecret}` &&
    url.searchParams.get("secret") !== cronSecret
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // We want to find complaints assigned/in_progress.
  // Reminder 1: updated_at was > 24h ago
  // Reminder 2: updated_at was > 72h ago
  // We use the notifications table to check if we already sent them to avoid spamming.

  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("id, assigned_to, title, updated_at, escalation_level")
    .in("status", ["assigned", "in_progress"])
    .not("assigned_to", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date().getTime();
  let reminderCount = 0;

  for (const complaint of complaints || []) {
    const updatedAt = new Date(complaint.updated_at).getTime();
    const hoursSinceUpdate = (now - updatedAt) / (1000 * 60 * 60);

    let reminderType: 1 | 2 | null = null;
    let title = "";
    
    // Evaluate if we hit the 72h or 24h thresholds
    if (hoursSinceUpdate >= 72) {
      reminderType = 2;
      title = `Reminder 2: Task Pending for 3+ Days`;
    } else if (hoursSinceUpdate >= 24) {
      reminderType = 1;
      title = `Reminder 1: Task Pending for 24+ Hours`;
    }

    if (reminderType !== null) {
      // Check if we already sent THIS specific reminder for THIS level
      const markerTitle = `[L${complaint.escalation_level}] ${title}`;
      
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", complaint.assigned_to)
        .eq("title", markerTitle)
        .limit(1);

      if (!existing || existing.length === 0) {
        // Send the reminder
        await supabase.from("notifications").insert({
          user_id: complaint.assigned_to,
          title: markerTitle,
          body: `Complaint: "${complaint.title}" requires your attention.`,
          channel: "in_app",
        });
        reminderCount++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Cron ran successfully. Sent ${reminderCount} reminders.`,
  });
}
