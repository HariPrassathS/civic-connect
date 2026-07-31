/**
 * Priority scoring.
 * Rule-based scoring first (always runs), then optionally overridden by AI.
 * Per PROJECT.md §8: "Rule-based scoring (keywords + category + upvotes) first;
 * swap in an LLM call later"
 */

import { callAI } from "./provider";
import type { Priority } from "@/types/database";

// ── Keyword lists for rule-based scoring ────────────────────

const URGENT_KEYWORDS = [
  "emergency", "collapse", "fire", "flood", "sewage overflow",
  "dangerous", "life-threatening", "electrocution", "accident",
  "gas leak", "building collapse", "waterlogging",
];

const HIGH_KEYWORDS = [
  "broken", "major", "severe", "widespread", "blocked road",
  "contamination", "health hazard", "no water", "power outage",
  "road cave", "sinkhole", "open manhole",
];

const MEDIUM_KEYWORDS = [
  "pothole", "leak", "damaged", "not working", "garbage",
  "overflowing", "noise", "illegal", "stray", "clogged",
];

// ── Rule-based scoring ──────────────────────────────────────

export function scorePriorityRuleBased(
  title: string,
  description: string | null,
  categoryName: string | null
): Priority {
  const text = `${title} ${description ?? ""} ${categoryName ?? ""}`.toLowerCase();

  // Check from highest to lowest
  if (URGENT_KEYWORDS.some((kw) => text.includes(kw))) return "urgent";
  if (HIGH_KEYWORDS.some((kw) => text.includes(kw))) return "high";
  if (MEDIUM_KEYWORDS.some((kw) => text.includes(kw))) return "medium";

  return "low";
}

// ── AI-enhanced scoring ─────────────────────────────────────

export async function scorePriority(
  title: string,
  description: string | null,
  categoryName: string | null
): Promise<{ priority: Priority; reasoning: string }> {
  // Always compute rule-based first as fallback
  const ruleBasedPriority = scorePriorityRuleBased(
    title,
    description,
    categoryName
  );

  const prompt = `You are a civic complaint priority assessor. Rate the urgency of this complaint.

TITLE: ${title}
DESCRIPTION: ${description || "(none)"}
CATEGORY: ${categoryName || "unknown"}

Consider:
- Public safety risk (high weight)
- Number of people affected
- Infrastructure damage potential
- Health/environmental impact

Respond in EXACTLY this JSON format, nothing else:
{"priority": "low|medium|high|urgent", "reasoning": "one sentence"}`;

  const response = await callAI(prompt);
  if (!response) {
    return {
      priority: ruleBasedPriority,
      reasoning: `Rule-based: matched keywords → ${ruleBasedPriority}`,
    };
  }

  try {
    const jsonStr = response.text
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);

    const validPriorities: Priority[] = ["low", "medium", "high", "urgent"];
    if (validPriorities.includes(parsed.priority)) {
      return {
        priority: parsed.priority,
        reasoning: parsed.reasoning || "AI assessment",
      };
    }
  } catch {
    console.error("AI priority parse error, using rule-based");
  }

  return {
    priority: ruleBasedPriority,
    reasoning: `Rule-based fallback: ${ruleBasedPriority}`,
  };
}
