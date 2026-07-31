import { config } from "dotenv";
config({ path: ".env.local" });
import sharp from "sharp";

const groqKey = process.env.GROQ_API_KEY;

const beforeUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Pothole.jpg/800px-Pothole.jpg";
const afterUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Pothole_repair.jpg/800px-Pothole_repair.jpg";

async function compressImage(url) {
  console.log("Compressing", url);
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Resize to max 256x256 to fit in a single 512x512 tile (lowest token cost)
  const compressed = await sharp(buffer)
    .resize(256, 256, { fit: 'inside' })
    .jpeg({ quality: 60 })
    .toBuffer();
    
  return `data:image/jpeg;base64,${compressed.toString('base64')}`;
}

async function runAITest() {
  const beforeB64 = await compressImage(beforeUrl);
  const afterB64 = await compressImage(afterUrl);

  const prompt = `Determine if the "After" photo shows that the issue in the "Before" photo has been genuinely and adequately resolved. Respond ONLY with valid JSON matching { "isValid": boolean, "confidence": number, "reasoning": string }`;

  console.log("\nSending compressed images to Groq API (qwen/qwen3.6-27b)...");

  try {
    const content = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: beforeB64 } },
      { type: 'image_url', image_url: { url: afterB64 } }
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
    console.log("SUCCESS! Result:", data?.choices?.[0]?.message?.content);

  } catch (err) {
    console.error("Test failed:", err);
  }
}

runAITest();
