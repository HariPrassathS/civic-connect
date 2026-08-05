import { callAI } from "@/lib/ai/provider";
import { NextResponse } from "next/server";

/**
 * POST /api/voice/extract
 * Production-grade complaint extraction from speech transcripts.
 * Handles Tamil, English, and Tanglish (Tamil-English mix) with location context.
 */
export async function POST(request: Request) {
  try {
    const { transcript, language, location } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required." },
        { status: 400 }
      );
    }

    const prompt = `You are an expert civic complaint extraction AI for Tamil Nadu, India.
A citizen has described their civic problem via voice in ${language === "ta" ? "Tamil (may include Tanglish — Tamil+English mix)" : "English (may include Tamil words)"}.
${location ? `The citizen is located in: ${location}.` : ""}

IMPORTANT RULES:
1. Understand colloquial speech patterns. Citizens may say things like:
   - "road la gundhu irukku" = pothole on the road
   - "thanni varala" or "water varala" = no water supply
   - "current poguthu" = power outage / electricity issue
   - "light eripathilla" = streetlight not working
   - "kuppai allala" = garbage not collected
   - "drainage overflow aguthu" = drainage/sewage overflow
   - "marangal vettu" = tree cutting / environmental issue
   - "noise pollution" = noise complaint
   - "road la velakkam illa" = no streetlights on the road
2. ALWAYS generate the title and description in clear English, even if input is Tamil.
3. Judge urgency realistically:
   - "urgent": flooding, sewage overflow, electrical danger, broken water main, health hazard
   - "high": no water for 2+ days, large pothole causing accidents, garbage piled for a week
   - "medium": streetlight not working, small pothole, irregular garbage collection
   - "low": faded road markings, minor aesthetic issues, noise from construction

Return ONLY valid JSON:
{
  "issue_type": "one of: road, water, electricity, garbage, drainage, sanitation, streetlight, sewage, noise, encroachment, environment, other",
  "title": "concise 5-10 word English title",
  "description": "clear 2-3 sentence English description capturing ALL details the citizen mentioned",
  "urgency": "one of: low, medium, high, urgent"
}

Citizen's exact speech:
"${transcript}"

Respond with ONLY the JSON, no backticks, no explanation.`;

    const result = await callAI(prompt);

    if (!result?.text) {
      return NextResponse.json(buildFallback(transcript));
    }

    let parsed;
    try {
      let cleaned = result.text.trim();
      // Strip markdown code blocks
      cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/gi, "");
      // Strip thinking model tags
      cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      // Find JSON object in the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(cleaned);
      }
    } catch {
      return NextResponse.json(buildFallback(transcript));
    }

    // Validate issue_type
    const validTypes = [
      "road", "water", "electricity", "garbage", "drainage",
      "sanitation", "streetlight", "sewage", "noise", "encroachment",
      "environment", "other",
    ];
    const issueType = validTypes.includes(parsed.issue_type)
      ? parsed.issue_type
      : "other";

    // Validate urgency
    const validUrgency = ["low", "medium", "high", "urgent"];
    const urgency = validUrgency.includes(parsed.urgency)
      ? parsed.urgency
      : "medium";

    return NextResponse.json({
      issue_type: issueType,
      title: parsed.title || "Civic Issue via Voice",
      description: parsed.description || transcript,
      urgency,
    });
  } catch (error: any) {
    console.error("Voice extract error:", error);
    return NextResponse.json(
      { error: "Failed to extract complaint data." },
      { status: 500 }
    );
  }
}

/**
 * Keyword-based fallback when AI is unavailable.
 */
function buildFallback(transcript: string) {
  const lower = transcript.toLowerCase();
  let issueType = "other";
  let urgency = "medium";

  const keywords: Record<string, string[]> = {
    road: ["road", "pothole", "gundhu", "saalai", "tar", "ரோடு", "குழி", "சாலை"],
    water: ["water", "thanni", "pipe", "தண்ணி", "குழாய்", "நீர்"],
    electricity: ["current", "power", "electricity", "மின்சாரம்", "கரெண்ட்"],
    garbage: ["garbage", "waste", "kuppai", "குப்பை", "கழிவு", "trash"],
    drainage: ["drainage", "drain", "வடிகால்", "சாக்கடை"],
    streetlight: ["light", "lamp", "street light", "விளக்கு", "velakku", "light eripathilla"],
    sewage: ["sewage", "overflow", "kazhivu", "நாற்றம்", "பொங்கி"],
    noise: ["noise", "sound", "சத்தம்", "இரைச்சல்"],
  };

  for (const [type, words] of Object.entries(keywords)) {
    if (words.some((w) => lower.includes(w))) {
      issueType = type;
      break;
    }
  }

  // Urgency keywords
  if (lower.match(/urgent|emergency|danger|flood|overflow|பொங்கி|ஆபத்து/)) {
    urgency = "urgent";
  } else if (lower.match(/days|week|நாள்|வாரம்|long time/)) {
    urgency = "high";
  }

  return {
    issue_type: issueType,
    title: `${issueType.charAt(0).toUpperCase() + issueType.slice(1)} issue reported via voice`,
    description: transcript,
    urgency,
  };
}
