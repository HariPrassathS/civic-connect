import { createClient } from "@supabase/supabase-js";

export async function generateDailyInsights() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch raw stats
  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("status, category_id, priority, created_at, lat, lng");

  if (error || !complaints) {
    console.error("Error fetching stats for AI insight:", error);
    return null;
  }

  // 2. Aggregate stats
  const total = complaints.length;
  const escalated = complaints.filter(c => c.status === "escalated").length;
  const recent = complaints.filter(c => {
    const diff = new Date().getTime() - new Date(c.created_at).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const prompt = `You are an AI analyst for a city municipal corporation.
Analyze these civic complaint stats and provide a 2-3 sentence summary highlighting the most critical trend or anomaly. Keep it concise, actionable, and professional.

Total Complaints (all time): ${total}
Escalated Issues (missed SLA): ${escalated}
New Complaints (last 7 days): ${recent}

Provide only the summary string.`;

  // 3. Call Groq
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "AI Insights unavailable (No API Key).";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // Fast model for insights
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    const json = await res.json();
    const insightText = json.choices?.[0]?.message?.content?.trim();

    if (insightText) {
      // Cache it
      await supabase.from("ai_insights").insert({
        insight_text: insightText,
        target_role: "all",
      });
      return insightText;
    }
  } catch (err) {
    console.error("Failed to generate insight:", err);
  }

  return "Insight generation failed.";
}
