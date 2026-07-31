import { config } from "dotenv";
config({ path: ".env.local" });

const geminiKey = process.env.GEMINI_API_KEY;

if (!geminiKey) {
  console.error("No GEMINI_API_KEY found in .env.local");
  process.exit(1);
}

// Dummy pothole before & after images
const beforeImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Pothole_on_the_road.jpg/800px-Pothole_on_the_road.jpg";
const afterImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Freshly_paved_road_surface.jpg/800px-Freshly_paved_road_surface.jpg";

async function run() {
  console.log("=== Testing Gemini Vision API ===");
  console.log("Before:", beforeImageUrl);
  console.log("After :", afterImageUrl);
  
  const prompt = `You are a municipal auditor. 
Determine if the "After" photo shows that the issue (pothole) in the "Before" photo has been genuinely and adequately resolved.
Respond ONLY with a valid JSON object:
{ "isValid": boolean, "confidence": number, "reasoning": string }`;

  try {
    const imageParts = await Promise.all([beforeImageUrl, afterImageUrl].map(async (url) => {
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
      console.error('API error:', res.status, await res.text());
      return;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log("\nGemini Response:");
    console.log(text);
  } catch(e) {
    console.error("Test failed:", e);
  }
}

run();
