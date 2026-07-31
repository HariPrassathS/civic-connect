import { config } from "dotenv";
config({ path: ".env.local" });

// Load Next.js tsconfig paths for module resolution in raw node script
import { register } from "module";
import { pathToFileURL } from "url";
import fs from "fs";

// We don't need module resolution if we just inline the fetch call for the test
const geminiKey = process.env.GEMINI_API_KEY;

if (!geminiKey) {
  console.error("No GEMINI_API_KEY found in .env.local");
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

  console.log("\nFetching images and sending to Gemini...");

  try {
    const imageUrls = [beforeUrl, afterUrl];
    const imageParts = await Promise.all(imageUrls.map(async (url) => {
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: res.headers.get('content-type') || 'image/jpeg'
        }
      };
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, ...imageParts] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("API error:", res.status, await res.text());
      return;
    }

    const data = await res.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    
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
