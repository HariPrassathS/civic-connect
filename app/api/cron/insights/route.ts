import { NextResponse } from "next/server";
import { generateDailyInsights } from "@/lib/ai/insights";

export async function GET(req: Request) {
  // In production, verify auth/secret header to prevent abuse
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateDailyInsights();
  
  if (!result) {
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }

  return NextResponse.json({ success: true, insight: result });
}
