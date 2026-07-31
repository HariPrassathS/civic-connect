import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const COMPLAINT_ID = process.argv[2];

if (!COMPLAINT_ID) {
  console.error("Please provide complaint ID as argument");
  process.exit(1);
}

async function run() {
  console.log("=== Testing Resolution Flow for", COMPLAINT_ID, "===");
  
  // 1. Insert an AFTER image (Raichu sprite)
  console.log("1. Simulating Field Worker uploading 'After' image...");
  await supabase.from('complaint_media').insert({
    complaint_id: COMPLAINT_ID,
    url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png',
    type: 'image'
  });
  console.log("   Uploaded After image successfully.");
  
  // 2. Trigger AI verification logic directly (simulate updateTaskStatus)
  // Instead of importing Next.js code which has dependencies, I'll fetch the endpoint or run the logic here
  console.log("2. Running AI Verification Logic...");
  
  // Fetch media
  const { data: media } = await supabase.from('complaint_media').select('url').eq('complaint_id', COMPLAINT_ID).order('created_at', { ascending: true });
  console.log("   Found", media.length, "images for this complaint.");
  
  // Let's use fetch to our own next.js api? No, we don't have an API route. 
  // Let's copy the logic from verifyResolution here to test it cleanly without Next.js compilation issues.
  const beforeImageUrl = media[0].url;
  const afterImageUrl = media[media.length - 1].url;
  
  console.log("   Before:", beforeImageUrl);
  console.log("   After:", afterImageUrl);
  
  const content = [
    { type: 'text', text: `You are a municipal auditor verifying the resolution of a civic complaint.
Determine if the "After" photo shows that the issue in the "Before" photo has been genuinely and adequately resolved. If the "After" photo is irrelevant, completely different, or of poor quality, mark it as invalid.

Respond ONLY with a valid JSON object matching this schema, without markdown blocks or other text:
{
  "isValid": boolean, 
  "confidence": number, 
  "reasoning": string 
}` },
    { type: 'image_url', image_url: { url: beforeImageUrl } },
    { type: 'image_url', image_url: { url: afterImageUrl } }
  ];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
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
  let rawText = data.choices[0].message.content;
  console.log("\n--- Raw AI Response ---");
  console.log(rawText);
  console.log("-----------------------\n");
  
  if (rawText.includes('<think>')) {
    rawText = rawText.replace(/<think>[\s\S]*?<\/think>/g, '');
  }
  if (rawText.includes("\`\`\`json")) {
    rawText = rawText.split("\`\`\`json")[1].split("\`\`\`")[0];
  } else if (rawText.includes("\`\`\`")) {
    rawText = rawText.split("\`\`\`")[1].split("\`\`\`")[0];
  }
  rawText = rawText.trim();
  
  try {
    const parsed = JSON.parse(rawText);
    console.log("✅ Verification Result:", parsed);
    
    if (parsed.isValid) {
      console.log("✅ Resolution Accepted! Updating DB to resolution_submitted...");
      await supabase.from("complaint_updates").insert({ complaint_id: COMPLAINT_ID, note: "AI Accepted", status_from: 'assigned', status_to: 'resolution_submitted' });
      await supabase.from("complaints").update({ status: 'resolution_submitted' }).eq('id', COMPLAINT_ID);
    } else {
      console.log("❌ Resolution Rejected! Leaving note and keeping status as assigned...");
      await supabase.from("complaint_updates").insert({ complaint_id: COMPLAINT_ID, note: `AI Rejected: ${parsed.reasoning}`, status_from: 'assigned', status_to: 'assigned' });
    }
    
    console.log("Test complete.");
  } catch(e) {
    console.error("Failed to parse JSON:", rawText, e);
  }
}
run();
