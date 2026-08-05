import { callAI } from "@/lib/ai/provider";
import { NextResponse } from "next/server";

/**
 * POST /api/voice/extract
 * Takes raw citizen speech transcript and uses AI to extract structured complaint data.
 */
export async function POST(request: Request) {
  try {
    const { transcript, language } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required." },
        { status: 400 }
      );
    }

    const prompt = `You are a civic complaint extraction AI for Tamil Nadu, India.
A citizen has described their civic problem in spoken ${language === "ta" ? "Tamil" : "English"}.

Extract the following fields from their speech. Be smart about understanding colloquial Tamil/English mix (Tanglish).

Return ONLY valid JSON with these exact fields:
{
  "issue_type": "one of: road, water, electricity, garbage, drainage, sanitation, streetlight, sewage, noise, encroachment, other",
  "title": "short 5-8 word title in English",
  "description": "clear 2-3 sentence English description of the problem",
  "urgency": "one of: low, medium, high, urgent"
}

Citizen's speech:
"${transcript}"

Respond with ONLY the JSON object, no explanation, no markdown.`;

    const result = await callAI(prompt);

    if (!result?.text) {
      // Fallback if AI is unavailable
      return NextResponse.json({
        issue_type: "other",
        title: "Civic Issue Reported via Voice",
        description: transcript,
        urgency: "medium",
      });
    }

    // Parse AI response — handle cases where AI wraps in code blocks
    let parsed;
    try {
      let cleaned = result.text.trim();
      // Strip markdown code blocks if present
      cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/gi, "");
      // Strip any <think>...</think> tags from thinking models
      cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If parsing fails, return a reasonable fallback
      return NextResponse.json({
        issue_type: "other",
        title: "Civic Issue Reported via Voice",
        description: transcript,
        urgency: "medium",
      });
    }

    return NextResponse.json({
      issue_type: parsed.issue_type || "other",
      title: parsed.title || "Civic Issue Reported via Voice",
      description: parsed.description || transcript,
      urgency: parsed.urgency || "medium",
    });
  } catch (error: any) {
    console.error("Voice extract error:", error);
    return NextResponse.json(
      { error: "Failed to extract complaint data." },
      { status: 500 }
    );
  }
}
