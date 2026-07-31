import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function callGroqVision(prompt, imageUrls, apiKey) {
  try {
    const content = [
      { type: 'text', text: prompt },
      ...imageUrls.map(url => ({ type: 'image_url', image_url: { url, detail: 'low' } }))
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b', // Let me test if qwen actually supports vision by testing it here
        messages: [{ role: 'user', content }],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      console.error('Groq Vision API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    console.error('Groq call failed:', err);
    return null;
  }
}

(async () => {
  const imageUrls = [
    'https://wndlghjnjbxyevcydxet.supabase.co/storage/v1/object/public/complaint-media/f4917a13-fc0d-4678-9135-ae666a3cbf31/1784887580947-d5d4d38k8i8.png'
  ];
  const apiKey = process.env.GROQ_API_KEY;
  const prompt = `Describe this image.`;
  
  console.log("Testing with qwen/qwen3.6-27b with 1 image...");
  const res = await callGroqVision(prompt, imageUrls, apiKey);
  console.log("Response:", res);
  
})();
