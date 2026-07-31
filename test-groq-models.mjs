import { config } from "dotenv";
config({ path: ".env.local" });
const groqKey = process.env.GROQ_API_KEY;

const modelsToTest = [
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview",
  "llama-3.2-11b-vision-instruct",
  "llama-3.2-90b-vision-instruct",
  "llama-3.2-11b-vision",
  "llama-3.2-90b-vision",
  "qwen-2.5-72b-vision",
  "qwen-2.5-72b-vision-preview",
  "qwen/qwen3.6-27b"
];

async function testModels() {
  const content = [
    { type: 'text', text: 'What is this?' },
    { type: 'image_url', image_url: { url: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" } }
  ];

  for (const model of modelsToTest) {
    console.log(`\nTesting model: ${model}`);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content }],
        max_tokens: 10,
      }),
    });
    
    if (res.ok) {
      console.log(`✅ SUCCESS! Model ${model} works.`);
      return; // Exit early if we found one
    } else {
      const err = await res.text();
      try {
        console.log(`❌ FAILED: ${JSON.parse(err).error.message}`);
      } catch(e) {
        console.log(`❌ FAILED: ${res.status} ${err}`);
      }
    }
  }
}

testModels();
