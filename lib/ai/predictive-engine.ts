import { SupabaseClient } from "@supabase/supabase-js";
import { getGroqClient } from "./provider";

export async function generatePredictiveAlerts(supabase: SupabaseClient) {
  console.log("Fetching historical complaint data for predictive analysis...");
  
  // 1. Fetch complaints from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: complaints, error } = await supabase
    .from("complaints")
    .select("id, status, created_at, lat, lng, category:categories(name, id), ward:wards(name, id)")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (error || !complaints) {
    console.error("Failed to fetch complaints:", error);
    return [];
  }

  // 2. Aggregate data by Ward
  const wardStats: Record<string, any> = {};
  complaints.forEach((c: any) => {
    if (!c.ward?.name) return;
    const wardName = c.ward.name;
    const categoryName = c.category?.name || "General";
    
    if (!wardStats[wardName]) {
      wardStats[wardName] = { 
        id: c.ward.id,
        total: 0, 
        categories: {} 
      };
    }
    wardStats[wardName].total += 1;
    wardStats[wardName].categories[categoryName] = (wardStats[wardName].categories[categoryName] || 0) + 1;
  });

  const analysisPayload = JSON.stringify(wardStats);
  
  // 3. Feed to Groq LLM
  console.log("Analyzing patterns using Groq AI...");
  const groq = getGroqClient();
  
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are a Smart City Predictive Maintenance AI.
You receive a JSON payload of complaint aggregations by ward for the last 30 days.
Your job is to identify patterns and output exactly 1 to 3 predictive alerts.
For example, if a ward has multiple minor water leaks, predict a high risk of a main pipe burst.
Output valid JSON ONLY. No markdown, no introductory text.

Format:
[
  {
    "title": "String (e.g. High Risk of Main Pipe Burst)",
    "description": "String",
    "ward_name": "String (Must exactly match a ward from the input)",
    "category_name": "String (e.g. Water Supply)",
    "severity": "medium" | "high" | "critical",
    "confidence_score": Number (0-100),
    "recommended_action": "String"
  }
]`
      },
      {
        role: "user",
        content: analysisPayload
      }
    ],
    model: "llama3-8b-8192", // Fast model for JSON
    temperature: 0.2,
  });

  const responseText = completion.choices[0]?.message?.content || "[]";
  let predictions = [];
  try {
    predictions = JSON.parse(responseText);
  } catch (e) {
    console.error("Failed to parse Groq predictions:", responseText);
    return [];
  }

  // 4. Resolve IDs and Insert into Database
  const finalAlerts = [];
  for (const pred of predictions) {
    const wardId = wardStats[pred.ward_name]?.id || null;
    
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .ilike("name", pred.category_name)
      .limit(1)
      .maybeSingle();

    const alert = {
      title: pred.title,
      description: pred.description,
      ward_id: wardId,
      category_id: cat?.id || null,
      severity: pred.severity,
      confidence_score: pred.confidence_score,
      recommended_action: pred.recommended_action
    };
    
    finalAlerts.push(alert);

    // Insert into DB
    await supabase.from("predictive_alerts").insert(alert);
  }

  console.log(`Generated ${finalAlerts.length} predictive alerts.`);
  return finalAlerts;
}
