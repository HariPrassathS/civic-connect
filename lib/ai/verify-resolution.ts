import { createClient } from "@/lib/supabase/server";
import { callAIVision } from "./provider";

export async function verifyResolution(complaintId: string): Promise<{
  isValid: boolean;
  confidence: number;
  reasoning: string;
}> {
  const supabase = await createClient();

  // 1. Fetch all media for this complaint
  const { data: media, error } = await supabase
    .from("complaint_media")
    .select("url, created_at")
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: true });

  if (error || !media || media.length < 2) {
    return {
      isValid: false,
      confidence: 0,
      reasoning: "Missing required before/after images for AI verification.",
    };
  }

  // The first image is "before", the last image is "after"
  const beforeImageUrl = media[0].url;
  const afterImageUrl = media[media.length - 1].url;

  // 2. Fetch complaint details for context
  const { data: complaint } = await supabase
    .from("complaints")
    .select("title, description, category:categories(name)")
    .eq("id", complaintId)
    .single();

  const title = complaint?.title || "Unknown Issue";
  const desc = complaint?.description || "No description";
  const category = (complaint?.category as any)?.name || "Unknown Category";

  try {
    // 3. Download the images to compare them and avoid sending the same image twice
    const beforeRes = await fetch(beforeImageUrl);
    const afterRes = await fetch(afterImageUrl);
    
    if (beforeRes.ok && afterRes.ok) {
      const beforeBuffer = Buffer.from(await beforeRes.arrayBuffer());
      const afterBuffer = Buffer.from(await afterRes.arrayBuffer());
      
      // If the field worker uploaded the EXACT same file/image
      if (beforeBuffer.equals(afterBuffer)) {
        return {
          isValid: false,
          confidence: 1.0,
          reasoning: "You uploaded the exact same image as the original citizen complaint. Please upload a genuine photo of the resolved issue.",
        };
      }
    }

    // 4. Send ONLY the After image to the AI to avoid the 8000 TPM rate limit on Groq for 2 large images
    const prompt = `You are a municipal auditor verifying the resolution of a civic complaint.
Complaint Title: ${title}
Category: ${category}
Description: ${desc}

This image is the "After" photo submitted by a field worker as proof of resolution. 
Determine if this photo clearly shows that the issue described above has been genuinely and adequately resolved. If the photo is irrelevant, completely different, or of poor quality, mark it as invalid.

Respond ONLY with a valid JSON object matching this schema, without markdown blocks or other text:
{
  "isValid": boolean, // true if resolved, false if not
  "confidence": number, // 0.0 to 1.0 confidence in your decision
  "reasoning": string // Brief explanation of your analysis
}`;

    const aiResponse = await callAIVision(prompt, [afterImageUrl]);

    if (!aiResponse) {
      throw new Error("AI provider returned null");
    }

    let rawText = aiResponse.text;

    // Strip <think>...</think> tags which Qwen models might output
    if (rawText.includes('<think>')) {
      rawText = rawText.replace(/<think>[\s\S]*?<\/think>/g, '');
      // Also handle case where closing tag is truncated
      if (rawText.includes('<think>')) {
        rawText = rawText.split('<think>')[0]; 
      }
    }

    rawText = rawText.trim();
    let parsed: any;
    
    try {
      // Strip markdown code block if present
      let cleanText = rawText;
      if (cleanText.includes("```json")) {
        cleanText = cleanText.split("```json")[1].split("```")[0];
      } else if (cleanText.includes("```")) {
        cleanText = cleanText.split("```")[1].split("```")[0];
      }
      parsed = JSON.parse(cleanText.trim());
    } catch (e) {
      // Fallback: extract substring between first { and last }
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = rawText.substring(firstBrace, lastBrace + 1);
        parsed = JSON.parse(jsonStr);
      } else {
        throw new Error("Could not extract JSON from AI response: " + rawText);
      }
    }

    return {
      isValid: Boolean(parsed.isValid),
      confidence: Number(parsed.confidence) || 0,
      reasoning: String(parsed.reasoning) || "No reasoning provided",
    };
  } catch (err) {
    console.error("Failed to verify resolution with AI:", err);
    return {
      isValid: false,
      confidence: 0,
      reasoning: "AI Verification failed due to a system error or timeout.",
    };
  }
}
