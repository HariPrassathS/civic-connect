import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { autoEscalateComplaint } from "@/lib/escalation/engine";

export async function GET(request: Request) {
  // Simple auth: require a cron secret in the header or query param
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "dev-secret-key"; // Default for local dev harness

  if (
    authHeader !== `Bearer ${cronSecret}` &&
    url.searchParams.get("secret") !== cronSecret
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Must use Service Role key for backend chron jobs because we need to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find all complaints past their SLA deadline that are still open (not closed, resolved, etc.)
  // and haven't hit the max escalation level (8).
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("id, escalation_level, assigned_to, category_id, status, citizen_id")
    .lt("sla_deadline", new Date().toISOString())
    .in("status", ["assigned", "in_progress", "ai_processing", "received"])
    .lt("escalation_level", 8);

  if (error) {
    console.error("Cron Error fetching breached complaints:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let successCount = 0;

  for (const complaint of complaints || []) {
    try {
      const escalated = await autoEscalateComplaint(supabase, complaint);
      if (escalated) successCount++;
    } catch (err) {
      console.error(`Failed to escalate complaint ${complaint.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Cron ran successfully. Escalated ${successCount} complaints.`,
  });
}
