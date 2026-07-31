/**
 * Sentiment analysis.
 * Per PROJECT.md §8: "Single LLM call on complaint description, cached, non-blocking"
 * Falls back to 'neutral' if AI unavailable.
 */

import { callAI } from "./provider";

export type Sentiment = "positive" | "neutral" | "negative" | "angry";

export async function analyzeSentiment(
  title: string,
  description: string | null
): Promise<{ sentiment: Sentiment; reasoning: string }> {
  if (!description && !title) {
    return { sentiment: "neutral", reasoning: "No text to analyze" };
  }

  const prompt = `Classify the sentiment of this civic complaint in one word.

TITLE: ${title}
DESCRIPTION: ${description || "(none)"}

Options: positive, neutral, negative, angry

"positive" = grateful/appreciative tone
"neutral" = factual/informational
"negative" = frustrated/dissatisfied
"angry" = hostile/threatening/extremely upset

Respond in EXACTLY this JSON format, nothing else:
{"sentiment": "positive|neutral|negative|angry", "reasoning": "one sentence"}`;

  const response = await callAI(prompt);
  if (!response) {
    // Simple rule-based fallback
    return {
      sentiment: ruleSentiment(title, description),
      reasoning: "AI unavailable, rule-based fallback",
    };
  }

  try {
    const jsonStr = response.text
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);

    const valid: Sentiment[] = ["positive", "neutral", "negative", "angry"];
    if (valid.includes(parsed.sentiment)) {
      return {
        sentiment: parsed.sentiment,
        reasoning: parsed.reasoning || "AI assessment",
      };
    }
  } catch {
    console.error("AI sentiment parse error, using fallback");
  }

  return {
    sentiment: ruleSentiment(title, description),
    reasoning: "AI response unparseable, rule-based fallback",
  };
}

function ruleSentiment(
  title: string,
  description: string | null
): Sentiment {
  const text = `${title} ${description ?? ""}`.toLowerCase();

  const angryWords = [
    "worst", "pathetic", "useless", "incompetent", "corrupt",
    "disgusting", "shame", "criminal", "negligence", "outrageous",
  ];
  const negativeWords = [
    "frustrated", "disappointed", "unhappy", "problem", "issue",
    "complaint", "failure", "ignored", "delay", "neglect",
  ];

  if (angryWords.some((w) => text.includes(w))) return "angry";
  if (negativeWords.some((w) => text.includes(w))) return "negative";
  return "neutral";
}
