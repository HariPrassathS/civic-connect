import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf-8");
const url = env.split("\n").find(l => l.startsWith("NEXT_PUBLIC_SUPABASE_URL=")).split("=")[1].trim();
const key = env.split("\n").find(l => l.startsWith("SUPABASE_SERVICE_ROLE_KEY=")).split("=")[1].trim();
const groqKey = env.split("\n").find(l => l.startsWith("GROQ_API_KEY=")).split("=")[1].trim();

const supabase = createClient(url, key);

async function run() {
  console.log("🚀 Starting Civic Connect Predictive Maintenance AI Simulator...");

  // 1. Fetch complaints from the last 30 days
  // Complaints don't have ward_id directly — join through assigned_to → profiles → ward
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("id, status, created_at, lat, lng, category:categories(name, id), assigned_worker:profiles!complaints_assigned_to_fkey(ward_id)")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (error || !complaints) {
    console.error("❌ Failed to fetch complaints:", error);
    return;
  }

  console.log(`📊 Fetched ${complaints.length} complaints from the last 30 days.`);

  // 2. Fetch wards lookup
  const { data: wards } = await supabase.from("wards").select("id, name");
  const wardLookup = {};
  (wards || []).forEach(w => { wardLookup[w.id] = w.name; });

  // 3. Aggregate by Ward & Category
  const wardStats = {};
  complaints.forEach((c) => {
    const wardId = c.assigned_worker?.ward_id;
    if (!wardId) return;
    const wardName = wardLookup[wardId] || "Unknown Ward";
    const categoryName = c.category?.name || "General";

    if (!wardStats[wardName]) {
      wardStats[wardName] = { id: wardId, total: 0, categories: {}, statuses: {} };
    }
    wardStats[wardName].total += 1;
    wardStats[wardName].categories[categoryName] = (wardStats[wardName].categories[categoryName] || 0) + 1;
    wardStats[wardName].statuses[c.status] = (wardStats[wardName].statuses[c.status] || 0) + 1;
  });

  const wardCount = Object.keys(wardStats).length;
  if (wardCount === 0) {
    console.log("⚠️  No complaints with assigned workers found. Generating sample predictions from all complaints...");
    // Fallback: aggregate by category alone
    const catStats = {};
    complaints.forEach(c => {
      const catName = c.category?.name || "General";
      catStats[catName] = (catStats[catName] || 0) + 1;
    });
    wardStats["City-Wide"] = { id: null, total: complaints.length, categories: catStats };
  }

  console.log(`📊 Aggregated data for ${Object.keys(wardStats).length} ward(s). Sending to Groq AI...`);

  // 4. Groq AI Analysis
  const analysisPayload = JSON.stringify(wardStats, null, 2);
  console.log("📦 Payload being sent to AI:\n", analysisPayload);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: `You are a Smart City Predictive Maintenance AI for the Civic Connect platform.
You receive a JSON payload of complaint aggregations grouped by ward for the last 30 days.
Each ward entry shows total complaints, breakdown by category, and status distribution.

CRITICAL RULES:
1. You MUST always generate exactly 3 predictive alerts. Never return an empty array.
2. Even with limited data, extrapolate and predict likely infrastructure risks based on the complaint categories present.
3. Be specific: reference the ward name, the likely failure type, and a concrete preventive action.
4. Assign realistic confidence scores (40-90). Lower scores are fine for extrapolated predictions.
5. Use severity levels appropriately: "medium" for emerging trends, "high" for concentrated issues, "critical" for imminent failures.

Output valid JSON ONLY. No markdown, no intro text, no code fences.
Format:
[
  {
    "title": "Short alert title",
    "description": "Detailed explanation of the pattern and risk",
    "ward_name": "Must match a ward name from the input, or 'City-Wide'",
    "category_name": "e.g. Water Supply, Roads, Electricity, Drainage, Sanitation",
    "severity": "medium" | "high" | "critical",
    "confidence_score": 40-90,
    "recommended_action": "Specific preventive action"
  }
]`
        },
        { role: "user", content: analysisPayload }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3
    })
  });

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || "[]";
  console.log("🔍 Raw AI response:", text);

  let predictions = [];
  try {
    // Handle potential markdown code fences
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    predictions = JSON.parse(cleaned);
  } catch (e) {
    console.error("❌ Failed to parse Groq response:", text);
    return;
  }

  console.log(`🤖 AI generated ${predictions.length} predictions. Inserting into database...`);

  // 5. Clear old predictions & insert new ones
  await supabase.from("predictive_alerts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  for (const pred of predictions) {
    const wardId = wardStats[pred.ward_name]?.id || null;
    const { data: cat } = await supabase.from("categories").select("id").ilike("name", `%${pred.category_name}%`).limit(1).maybeSingle();

    const alert = {
      title: pred.title,
      description: pred.description,
      ward_id: wardId,
      category_id: cat?.id || null,
      severity: pred.severity || "medium",
      confidence_score: pred.confidence_score || 70,
      recommended_action: pred.recommended_action
    };

    const { error: insertErr } = await supabase.from("predictive_alerts").insert(alert);
    if (insertErr) {
      console.error("❌ Insert error:", insertErr.message);
    } else {
      console.log(`  ✅ [${alert.severity.toUpperCase()}] ${alert.title} (${alert.confidence_score}% confidence)`);
    }
  }

  console.log(`\n🎉 Done! ${predictions.length} predictive alerts saved to the database.`);
  console.log("   Log into the District Collector dashboard → Predictive Analytics to view them.");
}

run();
