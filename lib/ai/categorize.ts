/**
 * AI category refinement.
 * Asks the AI to confirm or suggest a better category from the available list.
 * Falls back to keeping the user-selected category if AI fails.
 */

import { callAI } from "./provider";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CategoryResult {
  categoryId: string | null;
  categoryName: string | null;
  confidence: "high" | "medium" | "low";
  aiReasoning: string | null;
}

export async function refineCategory(
  supabase: SupabaseClient,
  complaint: {
    title: string;
    description: string | null;
    category_id: string | null;
  }
): Promise<CategoryResult> {
  // Fetch all categories for the prompt
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .order("name");

  if (!categories || categories.length === 0) {
    return {
      categoryId: complaint.category_id,
      categoryName: null,
      confidence: "low",
      aiReasoning: null,
    };
  }

  // Build category list string
  const categoryList = categories
    .filter((c) => c.parent_id !== null) // subcategories only
    .map((c) => {
      const parent = categories.find((p) => p.id === c.parent_id);
      return `${c.id}: ${parent?.name ?? "Unknown"} > ${c.name}`;
    })
    .join("\n");

  const prompt = `You are a civic complaint classifier. Given the complaint below, pick the SINGLE most appropriate category from the list.

COMPLAINT TITLE: ${complaint.title}
COMPLAINT DESCRIPTION: ${complaint.description || "(no description)"}

AVAILABLE CATEGORIES:
${categoryList}

Respond in EXACTLY this JSON format, nothing else:
{"category_id": "uuid-here", "confidence": "high|medium|low", "reasoning": "one sentence why"}`;

  const response = await callAI(prompt);
  if (!response) {
    return {
      categoryId: complaint.category_id,
      categoryName: null,
      confidence: "low",
      aiReasoning: "AI unavailable, kept user selection",
    };
  }

  try {
    // Extract JSON from response (handles markdown code blocks)
    const jsonStr = response.text
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);

    // Validate the category exists
    const matchedCat = categories.find((c) => c.id === parsed.category_id);
    if (matchedCat) {
      return {
        categoryId: matchedCat.id,
        categoryName: matchedCat.name,
        confidence: parsed.confidence || "medium",
        aiReasoning: parsed.reasoning || null,
      };
    }
  } catch {
    console.error("AI category parse error, keeping user selection");
  }

  return {
    categoryId: complaint.category_id,
    categoryName: null,
    confidence: "low",
    aiReasoning: "AI response unparseable, kept user selection",
  };
}
