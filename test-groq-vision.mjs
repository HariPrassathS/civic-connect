import { config } from "dotenv";
config({ path: ".env.local" });

const groqKey = process.env.GROQ_API_KEY;

if (!groqKey) {
  console.error("No GROQ_API_KEY found in .env.local");
  process.exit(1);
}

const beforeUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Pothole.jpg/800px-Pothole.jpg";
const afterUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Pothole_repair.jpg/800px-Pothole_repair.jpg";

async function runAITest() {
  console.log("Starting E2E AI Vision Test...");
  console.log("Before Image:", beforeUrl);
  console.log("After Image:", afterUrl);

  const prompt = `You are a municipal auditor verifying the resolution of a civic complaint.
Complaint Title: Deep Pothole on Main St
Category: Infrastructure
Description: There is a massive pothole that damages cars.

You have been provided with two images. The first image is the "Before" photo showing the initial complaint. The second image is the "After" photo submitted by a field worker as proof of resolution.

Determine if the "After" photo shows that the issue in the "Before" photo has been genuinely and adequately resolved. If the "After" photo is irrelevant, completely different, or of poor quality, mark it as invalid.

Respond ONLY with a valid JSON object matching this schema, without markdown blocks or other text:
{
  "isValid": boolean, // true if resolved, false if not
  "confidence": number, // 0.0 to 1.0 confidence in your decision
  "reasoning": string // Brief explanation of your analysis
}`;

  console.log("\nSending to Groq API (qwen/qwen3.6-27b)...");

  try {
    const content = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: beforeUrl } },
      { type: 'image_url', image_url: { url: afterUrl } }
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{ role: 'user', content }],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      console.error("API error:", res.status, await res.text());
      return;
    }

    const data = await res.json();
    let text = data?.choices?.[0]?.message?.content ?? "";
    
    console.log("\n--- RAW AI RESPONSE ---");
    console.log(text);
    console.log("-----------------------\n");

    if (text.includes("```json")) text = text.split("```json")[1].split("```")[0];
    else if (text.includes("```")) text = text.split("```")[1].split("```")[0];
    text = text.trim();

    const parsed = JSON.parse(text);
    console.log("Parsed Verification Result:");
    console.log("Is Valid (Resolved):", parsed.isValid ? "✅ YES" : "❌ NO");
    console.log("Confidence Level:", (parsed.confidence * 100).toFixed(0) + "%");
    console.log("Reasoning:", parsed.reasoning);

  } catch (err) {
    console.error("Test failed:", err);
  }
}

runAITest();
