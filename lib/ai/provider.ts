/**
 * Unified AI provider abstraction.
 * Tries Groq first (GROQ_API_KEY), then Gemini (GEMINI_API_KEY), then OpenAI (OPENAI_API_KEY).
 * Returns null if none are available — callers fall back to rule-based logic.
 */

type AIResponse = {
  text: string;
};

export async function callAI(prompt: string): Promise<AIResponse | null> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (groqKey) {
    return callGroq(prompt, groqKey);
  }
  if (geminiKey) {
    return callGemini(prompt, geminiKey);
  }
  if (openaiKey) {
    return callOpenAI(prompt, openaiKey);
  }

  return null; // No API key — use fallback
}

export async function callAIVision(prompt: string, imageUrls: string[]): Promise<AIResponse | null> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  
  // We'll prioritize Groq for Vision per user request
  if (groqKey) {
    const res = await callGroqVision(prompt, imageUrls, groqKey);
    if (res) return res;
  }
  
  // Fallback to Gemini if Groq fails (e.g. models decommissioned)
  if (geminiKey) {
    return callGeminiVision(prompt, imageUrls, geminiKey);
  }
  
  return null;
}

async function callGroq(
  prompt: string,
  apiKey: string
): Promise<AIResponse | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // extremely fast and capable free model on Groq
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      console.error("Groq API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return { text };
  } catch (err) {
    console.error("Groq call failed:", err);
    return null;
  }
}

async function callGemini(
  prompt: string,
  apiKey: string
): Promise<AIResponse | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("Gemini API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return { text };
  } catch (err) {
    console.error("Gemini call failed:", err);
    return null;
  }
}

async function callOpenAI(
  prompt: string,
  apiKey: string
): Promise<AIResponse | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      console.error("OpenAI API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return { text };
  } catch (err) {
    console.error("OpenAI call failed:", err);
    return null;
  }
}

async function callGroqVision(
  prompt: string,
  imageUrls: string[],
  apiKey: string
): Promise<AIResponse | null> {
  try {
    const content = [
      { type: 'text', text: prompt },
      ...imageUrls.map(url => ({ type: 'image_url', image_url: { url } }))
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{ role: 'user', content }],
        temperature: 0.2,
        max_tokens: 2048, // Balance to leave enough for <think> but not exceed 8000 TPM limit
      }),
    });

    if (!res.ok) {
      console.error('Groq Vision API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return { text };
  } catch (err) {
    console.error('Groq Vision call failed:', err);
    return null;
  }
}

async function callGeminiVision(
  prompt: string,
  imageUrls: string[],
  apiKey: string
): Promise<AIResponse | null> {
  try {
    // For Gemini, we need to pass image URLs in a way it understands.
    // However, Gemini API requires base64 inline data for images, or a uri if uploaded via File API.
    // For simplicity, we can try to fetch the image and pass it as base64, but since we are running server-side, it's doable.
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
      console.error("Gemini Vision API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return { text };
  } catch (err) {
    console.error("Gemini Vision call failed:", err);
    return null;
  }
}