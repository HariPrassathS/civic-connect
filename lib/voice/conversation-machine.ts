/**
 * Conversation state machine for the Voice Assistant.
 * Defines all states, prompts (Tamil + English), and transition logic.
 */

export type ConversationStep =
  | "GREETING"
  | "LANGUAGE"
  | "NAME"
  | "PHONE"
  | "LOCATION"
  | "COMPLAINT"
  | "PHOTO"
  | "CONFIRM"
  | "SUBMITTING"
  | "DONE"
  | "ERROR";

export type Language = "ta" | "en";

export interface CollectedData {
  language: Language;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  address: string;
  district: string;
  area: string;
  complaintText: string;
  photoFile: File | null;
  photoPreview: string | null;
  // AI-extracted fields
  issueType: string;
  title: string;
  description: string;
  urgency: string;
}

export const INITIAL_DATA: CollectedData = {
  language: "ta",
  name: "",
  phone: "",
  lat: 0,
  lng: 0,
  address: "",
  district: "",
  area: "",
  complaintText: "",
  photoFile: null,
  photoPreview: null,
  issueType: "",
  title: "",
  description: "",
  urgency: "medium",
};

type Prompts = Record<Language, string>;

interface StepConfig {
  prompts: Prompts;
  speechLang: Record<Language, string>; // BCP47 tag for speech
  nextStep: ConversationStep;
}

/**
 * All conversation step configurations.
 * Each step has prompts in Tamil and English.
 */
export const STEP_CONFIG: Record<string, StepConfig> = {
  GREETING: {
    prompts: {
      ta: "வணக்கம்! நான் சிவிக் கனெக்ட் உதவியாளர். உங்கள் புகாரை பதிவு செய்ய நான் உதவுகிறேன். தமிழில் பேசலாமா, ஆங்கிலத்தில் பேசலாமா?",
      en: "Hello! I am the Civic Connect assistant. I will help you register your complaint. Shall we speak in Tamil or English?",
    },
    speechLang: { ta: "ta-IN", en: "en-IN" },
    nextStep: "LANGUAGE",
  },
  LANGUAGE: {
    prompts: {
      ta: "சரி, தமிழில் பேசலாம்! உங்கள் பெயர் என்ன?",
      en: "Great, let's speak in English! What is your name?",
    },
    speechLang: { ta: "ta-IN", en: "en-IN" },
    nextStep: "NAME",
  },
  NAME: {
    prompts: {
      ta: "நன்றி! உங்கள் போன் நம்பர் சொல்லுங்கள்.",
      en: "Thank you! Please tell me your phone number.",
    },
    speechLang: { ta: "ta-IN", en: "en-IN" },
    nextStep: "PHONE",
  },
  PHONE: {
    prompts: {
      ta: "சரி. இப்போது உங்கள் லொக்கேஷன் கண்டுபிடிக்கிறேன்... ஒரு நிமிடம்.",
      en: "Got it. Now let me detect your location... One moment.",
    },
    speechLang: { ta: "ta-IN", en: "en-IN" },
    nextStep: "LOCATION",
  },
  LOCATION: {
    prompts: {
      ta: "உங்கள் லொக்கேஷன் கிடைத்தது. என்ன பிரச்சனை இருக்கு? சொல்லுங்கள், நான் குறிப்பு எடுக்கிறேன்.",
      en: "I found your location. What is the problem? Tell me, I will note it down.",
    },
    speechLang: { ta: "ta-IN", en: "en-IN" },
    nextStep: "COMPLAINT",
  },
  COMPLAINT: {
    prompts: {
      ta: "புரிகிறது. பிரச்சனையின் போட்டோ எடுக்க முடியுமா? கேமரா பட்டனை தட்டுங்கள். வேண்டாம் என்றால் 'வேண்டாம்' என்று சொல்லுங்கள்.",
      en: "I understand. Can you take a photo of the problem? Tap the camera button. Say 'no' if you don't want to.",
    },
    speechLang: { ta: "ta-IN", en: "en-IN" },
    nextStep: "PHOTO",
  },
  PHOTO: {
    prompts: {
      ta: "",  // Dynamic — filled at runtime with summary
      en: "",
    },
    speechLang: { ta: "ta-IN", en: "en-IN" },
    nextStep: "CONFIRM",
  },
  CONFIRM: {
    prompts: {
      ta: "சமர்ப்பிக்கவா? 'ஆமா' என்று சொல்லுங்கள்.",
      en: "Shall I submit? Say 'yes' to confirm.",
    },
    speechLang: { ta: "ta-IN", en: "en-IN" },
    nextStep: "SUBMITTING",
  },
  SUBMITTING: {
    prompts: {
      ta: "உங்கள் புகார் சமர்ப்பிக்கப்படுகிறது... ஒரு நிமிடம்.",
      en: "Your complaint is being submitted... One moment.",
    },
    speechLang: { ta: "ta-IN", en: "en-IN" },
    nextStep: "DONE",
  },
  DONE: {
    prompts: {
      ta: "உங்கள் புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டது! நாங்கள் 48 மணி நேரத்தில் தீர்க்க முயற்சிப்போம். நன்றி!",
      en: "Your complaint has been registered successfully! We will try to resolve it within 48 hours. Thank you!",
    },
    speechLang: { ta: "ta-IN", en: "en-IN" },
    nextStep: "DONE", // Terminal state
  },
  ERROR: {
    prompts: {
      ta: "மன்னிக்கவும், ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சி செய்யுங்கள்.",
      en: "Sorry, an error occurred. Please try again.",
    },
    speechLang: { ta: "ta-IN", en: "en-IN" },
    nextStep: "GREETING",
  },
};

/**
 * Get the speech language tag for a step and selected language.
 */
export function getSpeechLang(step: ConversationStep, lang: Language): string {
  return STEP_CONFIG[step]?.speechLang[lang] ?? "ta-IN";
}

/**
 * Get the prompt text for a step and language.
 */
export function getPrompt(step: ConversationStep, lang: Language): string {
  return STEP_CONFIG[step]?.prompts[lang] ?? "";
}

/**
 * Detect language from user input.
 * If they say anything with "english" or "eng" → English
 * Otherwise → Tamil (default)
 */
export function detectLanguageChoice(input: string): Language {
  const lower = input.toLowerCase().trim();
  if (
    lower.includes("english") ||
    lower.includes("eng") ||
    lower.includes("ஆங்கிலம்")
  ) {
    return "en";
  }
  return "ta";
}

/**
 * Extract phone number digits from speech.
 * People say numbers in various ways — just extract digits.
 */
export function extractPhone(input: string): string {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, "");
  // If starts with 91 and has 12 digits, strip country code
  if (digits.startsWith("91") && digits.length === 12) {
    return digits.slice(2);
  }
  // Return last 10 digits if longer
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Check if user confirmed (said yes).
 */
export function isConfirmation(input: string): boolean {
  const lower = input.toLowerCase().trim();
  const confirmWords = [
    "yes", "yeah", "yep", "confirm", "submit", "ok", "okay",
    "ஆமா", "ஆம்", "சரி", "பண்ணு", "செய்",
    "aama", "aam", "sari", "pannu",
    "ha", "haa", "haan",
  ];
  return confirmWords.some((w) => lower.includes(w));
}

/**
 * Check if user declined (said no).
 */
export function isDenial(input: string): boolean {
  const lower = input.toLowerCase().trim();
  const denyWords = [
    "no", "nope", "cancel", "stop",
    "வேண்டாம்", "இல்ல", "நிறுத்து",
    "vendaam", "illa", "no photo",
  ];
  return denyWords.some((w) => lower.includes(w));
}
