import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { processNewComplaint } from "@/lib/ai/process-complaint";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Missing id", { status: 400 });
    }

    const supabase = createServiceRoleClient();
    
    // Process in background, don't await so we can return 200 immediately
    processNewComplaint(supabase, id).catch(err => {
      console.error("Background AI processing failed:", err);
    });

    return new NextResponse("Triggered", { status: 200 });
  } catch (error) {
    console.error("AI trigger error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
