/**
 * Conversation state machine for the Voice Assistant.
 * Defines all states, prompts (Tamil + English), and transition logic.
 */

export type ConversationStep =
  | "GREETING"
  | "LANGUAGE"
  | "NAME"
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
  lat: number;
  lng: number;
  address: string;
  district: string;
  area: string;
  complaintText: string;
  photoFile: File | null;
  photoPreview: string | null;
  issueType: string;
  title: string;
  description: string;
  urgency: string;
}

export const INITIAL_DATA: CollectedData = {
  language: "ta",
  name: "",
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
  speechLang: Record<Language, string>;
  nextStep: ConversationStep;
}

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
      ta: "நன்றி! உங்கள் லொக்கேஷன் கண்டுபிடிக்கிறேன்... ஒரு நிமிடம்.",
      en: "Thank you! Let me detect your location... One moment.",
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
      ta: "",
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
    nextStep: "DONE",
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

export function getSpeechLang(step: ConversationStep, lang: Language): string {
  return STEP_CONFIG[step]?.speechLang[lang] ?? "ta-IN";
}

export function getPrompt(step: ConversationStep, lang: Language): string {
  return STEP_CONFIG[step]?.prompts[lang] ?? "";
}

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

export function isConfirmation(input: string): boolean {
  const lower = input.toLowerCase().trim();
  const confirmWords = [
    "yes", "yeah", "yep", "confirm", "submit", "ok", "okay",
    "ஆமா", "ஆம்", "சரி", "பண்ணு", "செய்", "ஓகே",
    "aama", "aam", "sari", "pannu",
    "ha", "haa", "haan",
  ];
  return confirmWords.some((w) => lower.includes(w));
}

export function isDenial(input: string): boolean {
  const lower = input.toLowerCase().trim();
  const denyWords = [
    "no", "nope", "cancel", "stop",
    "வேண்டாம்", "இல்ல", "நிறுத்து", "வேணாம்",
    "vendaam", "illa", "no photo",
  ];
  return denyWords.some((w) => lower.includes(w));
}
