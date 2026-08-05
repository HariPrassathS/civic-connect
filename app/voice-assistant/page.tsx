"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mic, Camera, Check, RotateCcw, Loader2, Volume2, X,
  ChevronRight, Phone, MapPin, MessageSquare, Send, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceEngine } from "@/lib/voice/use-voice-engine";
import {
  type ConversationStep,
  type Language,
  type CollectedData,
  INITIAL_DATA,
  detectLanguageChoice,
  extractPhone,
  isConfirmation,
  isDenial,
} from "@/lib/voice/conversation-machine";

// ─── Step metadata for progress bar ───────────────────────────
const STEPS_ORDER: ConversationStep[] = [
  "GREETING", "LANGUAGE", "NAME", "PHONE", "LOCATION",
  "COMPLAINT", "PHOTO", "CONFIRM", "SUBMITTING", "DONE",
];
const STEP_LABELS: Record<string, { icon: string; label: string }> = {
  GREETING: { icon: "👋", label: "Welcome" },
  LANGUAGE: { icon: "🌐", label: "Language" },
  NAME: { icon: "👤", label: "Name" },
  PHONE: { icon: "📞", label: "Phone" },
  LOCATION: { icon: "📍", label: "Location" },
  COMPLAINT: { icon: "📝", label: "Issue" },
  PHOTO: { icon: "📸", label: "Photo" },
  CONFIRM: { icon: "✅", label: "Confirm" },
  SUBMITTING: { icon: "⏳", label: "Submit" },
  DONE: { icon: "🎉", label: "Done" },
  ERROR: { icon: "❌", label: "Error" },
};

// ─── Retry wrapper: re-asks if user says nothing ──────────────
async function listenWithRetry(
  listenFn: (lang: string, timeout?: number) => Promise<string>,
  speakFn: (text: string, lang: string) => Promise<void>,
  lang: Language,
  retryPrompt: string,
  maxRetries: number = 2,
  timeoutMs: number = 10000
): Promise<string> {
  const speechLang = lang === "ta" ? "ta-IN" : "en-IN";
  let attempts = 0;

  while (attempts <= maxRetries) {
    const result = await listenFn(speechLang, timeoutMs);
    if (result && result.trim().length > 0) {
      return result.trim();
    }
    attempts++;
    if (attempts <= maxRetries) {
      await speakFn(retryPrompt, speechLang);
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return ""; // Give up after retries
}

export default function VoiceAssistantPage() {
  const router = useRouter();
  const { voiceState, interimText, speak, listen, stopAll, isSupported } =
    useVoiceEngine();

  const [step, setStep] = useState<ConversationStep>("GREETING");
  const [data, setData] = useState<CollectedData>(INITIAL_DATA);
  const [assistantText, setAssistantText] = useState("");
  const [citizenText, setCitizenText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [conversationLog, setConversationLog] = useState<
    { role: "assistant" | "citizen"; text: string }[]
  >([]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isRunningRef = useRef(false);
  const photoResolveRef = useRef<(() => void) | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationLog, assistantText, citizenText]);

  // Load voices on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();
    }
  }, []);

  // ─── Helpers ────────────────────────────────────────────────
  const addLog = useCallback(
    (role: "assistant" | "citizen", text: string) => {
      if (!text) return;
      setConversationLog((prev) => [...prev, { role, text }]);
    },
    []
  );

  const speakAndLog = useCallback(
    async (text: string, lang: Language) => {
      setAssistantText(text);
      setCitizenText("");
      addLog("assistant", text);
      const speechLang = lang === "ta" ? "ta-IN" : "en-IN";
      await speak(text, speechLang);
      await new Promise((r) => setTimeout(r, 400));
    },
    [speak, addLog]
  );

  const speakListenLog = useCallback(
    async (
      text: string,
      lang: Language,
      retryMsg?: string,
      timeout?: number
    ): Promise<string> => {
      await speakAndLog(text, lang);
      const retry =
        retryMsg ||
        (lang === "ta"
          ? "மன்னிக்கவும், கேட்கவில்லை. மீண்டும் சொல்லுங்கள்."
          : "Sorry, I didn't catch that. Please say it again.");
      const response = await listenWithRetry(listen, speak, lang, retry, 2, timeout || 10000);
      setCitizenText(response);
      if (response) addLog("citizen", response);
      return response;
    },
    [speakAndLog, listen, speak, addLog]
  );

  // ─── Haptic feedback ───────────────────────────────────────
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // ─── Location Detection ─────────────────────────────────────
  const detectLocation = useCallback(
    (): Promise<{ lat: number; lng: number }> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ lat: 0, lng: 0 });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 0, lng: 0 }),
          { enableHighAccuracy: true, timeout: 15000 }
        );
      });
    },
    []
  );

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        { headers: { "User-Agent": "CivicConnectTN/1.0" } }
      );
      const geo = await res.json();
      return {
        address: geo.display_name || "",
        district:
          geo.address?.state_district || geo.address?.county || "",
        area:
          geo.address?.suburb ||
          geo.address?.neighbourhood ||
          geo.address?.village ||
          "",
        city: geo.address?.city || geo.address?.town || "",
      };
    } catch {
      return { address: "", district: "", area: "", city: "" };
    }
  }, []);

  // ─── Main Conversation ─────────────────────────────────────
  const runConversation = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setStarted(true);
    vibrate(100);

    let d = { ...INITIAL_DATA };
    let lang: Language = "ta";

    try {
      // ── 1. GREETING ──
      setStep("GREETING");
      const langInput = await speakListenLog(
        "வணக்கம்! நான் சிவிக் கனெக்ட் உதவியாளர். உங்கள் பிரச்சனையை சொல்லுங்கள், நான் உதவுகிறேன். தமிழில் பேசலாமா, English-ல் பேசலாமா?",
        "ta",
        "Tamil-ல் பேசணுமா, English-ல் பேசணுமா? சொல்லுங்கள்.",
        12000
      );
      lang = detectLanguageChoice(langInput);
      d.language = lang;
      setData({ ...d });

      // ── 2. NAME ──
      setStep("LANGUAGE");
      const confirmLangMsg =
        lang === "ta"
          ? "சரி, தமிழில் பேசலாம்! உங்கள் பெயர் என்ன?"
          : "Great, let's speak in English! What is your name?";
      const nameInput = await speakListenLog(
        confirmLangMsg,
        lang,
        lang === "ta"
          ? "உங்கள் பெயர் சொல்லுங்கள்."
          : "Please tell me your name."
      );
      d.name = nameInput || "Citizen";
      setData({ ...d });

      // ── 3. PHONE ──
      setStep("NAME");
      const phonePrompt =
        lang === "ta"
          ? `${d.name}, நன்றி! உங்கள் மொபைல் நம்பர் சொல்லுங்கள்.`
          : `Thank you ${d.name}! Please tell me your mobile number.`;
      const phoneInput = await speakListenLog(
        phonePrompt,
        lang,
        lang === "ta"
          ? "உங்கள் 10 இலக்க மொபைல் நம்பர் சொல்லுங்கள்."
          : "Please say your 10-digit mobile number.",
        12000
      );
      d.phone = extractPhone(phoneInput);
      setData({ ...d });

      // Confirm phone
      if (d.phone && d.phone.length === 10) {
        const phoneConfirm =
          lang === "ta"
            ? `உங்கள் நம்பர் ${d.phone.split("").join(" ")}. சரியா?`
            : `Your number is ${d.phone.split("").join(" ")}. Is that correct?`;
        const phoneOk = await speakListenLog(phoneConfirm, lang);
        if (isDenial(phoneOk)) {
          const retryPhone = await speakListenLog(
            lang === "ta"
              ? "சரி, மீண்டும் சொல்லுங்கள்."
              : "Okay, please say it again.",
            lang,
            undefined,
            12000
          );
          d.phone = extractPhone(retryPhone);
          setData({ ...d });
        }
      }

      // ── 4. LOCATION ──
      setStep("PHONE");
      await speakAndLog(
        lang === "ta"
          ? "சரி. உங்கள் இருப்பிடம் கண்டுபிடிக்கிறேன்... ஒரு நிமிடம்."
          : "Got it. Detecting your location... One moment.",
        lang
      );

      setIsProcessing(true);
      vibrate(50);
      const coords = await detectLocation();
      d.lat = coords.lat;
      d.lng = coords.lng;

      if (coords.lat !== 0) {
        const geo = await reverseGeocode(coords.lat, coords.lng);
        d.address = geo.address;
        d.district = geo.district;
        d.area = geo.area;
      }
      setData({ ...d });
      setIsProcessing(false);
      setStep("LOCATION");

      // ── 5. COMPLAINT (LONG LISTEN) ──
      const locationMsg = d.area
        ? lang === "ta"
          ? `உங்கள் இருப்பிடம் ${d.area}${d.district ? `, ${d.district}` : ""} என்று கண்டறியப்பட்டது. இப்போது என்ன பிரச்சனை இருக்கு? விரிவாக சொல்லுங்கள்.`
          : `Your location is ${d.area}${d.district ? `, ${d.district}` : ""}. Now tell me, what is the problem? Please describe in detail.`
        : lang === "ta"
          ? "இருப்பிடம் கிடைக்கவில்லை, ஆனால் பரவாயில்லை. என்ன பிரச்சனை இருக்கு? விரிவாக சொல்லுங்கள்."
          : "Could not detect location, but that's okay. What is the problem? Please describe in detail.";

      const complaintInput = await speakListenLog(
        locationMsg,
        lang,
        lang === "ta"
          ? "பிரச்சனையை சொல்லுங்கள். உதாரணமாக: ரோட்ல குழி இருக்கு, தண்ணி வரலை, குப்பை அள்ளலை."
          : "Please describe the problem. For example: pothole on road, no water supply, garbage not collected.",
        15000
      );
      d.complaintText = complaintInput;
      setData({ ...d });

      // If complaint is empty, try one more time with examples
      if (!complaintInput) {
        const retryComplaint = await speakListenLog(
          lang === "ta"
            ? "பிரச்சனையை சொல்ல முடியவில்லை. டைப் செய்து கொடுங்கள் அல்லது மீண்டும் பேசுங்கள்."
            : "I couldn't hear the problem. Please try speaking again or tap Restart.",
          lang,
          undefined,
          15000
        );
        d.complaintText = retryComplaint || "Civic issue reported via voice";
        setData({ ...d });
      }

      // ── 6. AI EXTRACTION ──
      setStep("COMPLAINT");
      setIsProcessing(true);
      await speakAndLog(
        lang === "ta"
          ? "புரிகிறது. உங்கள் புகாரை பகுப்பாய்வு செய்கிறேன்..."
          : "I understand. Analyzing your complaint...",
        lang
      );

      try {
        const extractRes = await fetch("/api/voice/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: d.complaintText,
            language: lang,
            location: d.area || d.district || "",
          }),
        });
        const extracted = await extractRes.json();
        d.issueType = extracted.issue_type || "other";
        d.title = extracted.title || "Voice Complaint";
        d.description = extracted.description || d.complaintText;
        d.urgency = extracted.urgency || "medium";
      } catch {
        d.issueType = "other";
        d.title = "Voice Complaint";
        d.description = d.complaintText;
      }
      setData({ ...d });
      setIsProcessing(false);

      // Read back the understanding
      const understandMsg =
        lang === "ta"
          ? `புரிந்தது: "${d.title}". வகை: ${d.issueType}. இது சரியா?`
          : `I understood: "${d.title}". Category: ${d.issueType}. Is this correct?`;
      const understandOk = await speakListenLog(understandMsg, lang);
      if (isDenial(understandOk)) {
        // Let user re-describe
        const redescribe = await speakListenLog(
          lang === "ta"
            ? "சரி, மீண்டும் விரிவாக சொல்லுங்கள்."
            : "Okay, please describe the problem again in more detail.",
          lang,
          undefined,
          15000
        );
        if (redescribe) {
          d.complaintText = redescribe;
          setData({ ...d });
          // Re-extract
          setIsProcessing(true);
          try {
            const re = await fetch("/api/voice/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transcript: redescribe,
                language: lang,
                location: d.area || d.district || "",
              }),
            });
            const rx = await re.json();
            d.issueType = rx.issue_type || d.issueType;
            d.title = rx.title || d.title;
            d.description = rx.description || redescribe;
            d.urgency = rx.urgency || d.urgency;
          } catch {}
          setData({ ...d });
          setIsProcessing(false);
        }
      }

      // ── 7. PHOTO ──
      setStep("PHOTO");
      const photoAsk =
        lang === "ta"
          ? "பிரச்சனையின் போட்டோ எடுக்க முடியுமா? கேமரா பட்டனை தட்டுங்கள். வேண்டாம் என்றால் 'வேண்டாம்' என்று சொல்லுங்கள்."
          : "Can you take a photo of the problem? Tap the camera button below. Say 'no' if you don't want to.";
      const photoResp = await speakListenLog(photoAsk, lang);

      if (!isDenial(photoResp)) {
        await speakAndLog(
          lang === "ta"
            ? "கீழே உள்ள கேமரா பட்டனை தட்டி போட்டோ எடுங்கள். எடுத்த பிறகு நான் தொடர்வேன்."
            : "Tap the camera button below to take a photo. I will continue after you take it.",
          lang
        );

        // Event-driven photo wait — resolves when photo is captured or timeout
        await new Promise<void>((resolve) => {
          photoResolveRef.current = resolve;
          // Auto-open camera
          setTimeout(() => cameraInputRef.current?.click(), 800);
          // Safety timeout: 30 seconds
          setTimeout(() => {
            photoResolveRef.current = null;
            resolve();
          }, 30000);
        });

        if (d.photoPreview) {
          await speakAndLog(
            lang === "ta" ? "போட்டோ எடுக்கப்பட்டது! நன்றி." : "Photo captured! Thank you.",
            lang
          );
        }
      } else {
        await speakAndLog(
          lang === "ta"
            ? "சரி, போட்டோ இல்லாமலேயே தொடர்கிறேன்."
            : "Okay, continuing without a photo.",
          lang
        );
      }

      // ── 8. CONFIRM ──
      setStep("CONFIRM");
      vibrate([50, 100, 50]);
      const summaryParts = [
        lang === "ta" ? "உங்கள் புகார் சுருக்கம்:" : "Your complaint summary:",
        `• ${lang === "ta" ? "பெயர்" : "Name"}: ${d.name}`,
        `• ${lang === "ta" ? "பிரச்சனை" : "Issue"}: ${d.title}`,
        d.area ? `• ${lang === "ta" ? "இடம்" : "Location"}: ${d.area}` : "",
        `• ${lang === "ta" ? "அவசரம்" : "Urgency"}: ${d.urgency}`,
        d.photoPreview
          ? `• ${lang === "ta" ? "போட்டோ" : "Photo"}: ✅`
          : "",
        "",
        lang === "ta"
          ? "சமர்ப்பிக்கவா? 'ஆமா' என்று சொல்லுங்கள்."
          : "Shall I submit? Say 'yes' to confirm.",
      ]
        .filter(Boolean)
        .join("\n");

      const confirmResp = await speakListenLog(
        summaryParts.replace(/\n/g, ". "), // TTS reads periods better
        lang
      );

      if (!isConfirmation(confirmResp)) {
        await speakAndLog(
          lang === "ta"
            ? "சரி, ரத்து செய்கிறேன். மீண்டும் முயற்சிக்க 'Restart' அழுத்துங்கள்."
            : "Okay, cancelled. Tap 'Restart' to try again.",
          lang
        );
        isRunningRef.current = false;
        return;
      }

      // ── 9. SUBMIT ──
      setStep("SUBMITTING");
      await speakAndLog(
        lang === "ta"
          ? "உங்கள் புகார் சமர்ப்பிக்கப்படுகிறது..."
          : "Submitting your complaint...",
        lang
      );
      setIsProcessing(true);
      vibrate(100);

      const submitRes = await fetch("/api/voice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: d.name,
          phone: d.phone,
          lat: d.lat,
          lng: d.lng,
          address: d.address,
          district: d.district,
          area: d.area,
          issueType: d.issueType,
          title: d.title,
          description: d.description,
          urgency: d.urgency,
          photoBase64: d.photoPreview,
        }),
      });
      const result = await submitRes.json();
      setIsProcessing(false);

      // ── 10. DONE ──
      if (result.success) {
        setComplaintId(result.complaintId);
        setStep("DONE");
        vibrate([100, 50, 100, 50, 200]);
        const shortId = result.complaintId?.slice(0, 8) || "N/A";
        await speakAndLog(
          lang === "ta"
            ? `உங்கள் புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டது! புகார் எண்: ${shortId}. நாங்கள் 48 மணி நேரத்தில் தீர்க்க முயற்சிப்போம். நன்றி, ${d.name}!`
            : `Your complaint has been registered successfully! Complaint ID: ${shortId}. We will try to resolve it within 48 hours. Thank you, ${d.name}!`,
          lang
        );
      } else {
        setStep("ERROR");
        await speakAndLog(
          lang === "ta"
            ? "மன்னிக்கவும், பதிவு செய்ய இயலவில்லை. மீண்டும் முயற்சிக்கவும்."
            : "Sorry, submission failed. Please try again.",
          lang
        );
      }
    } catch (error) {
      console.error("Conversation error:", error);
      setStep("ERROR");
      setAssistantText(
        data.language === "ta"
          ? "ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்."
          : "An error occurred. Please try again."
      );
    }

    isRunningRef.current = false;
  }, [
    speakListenLog,
    speakAndLog,
    listen,
    speak,
    detectLocation,
    reverseGeocode,
    vibrate,
    addLog,
    data.language,
  ]);

  // ─── Photo Handler (event-driven) ──────────────────────────
  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result as string;
      setData((prev) => ({
        ...prev,
        photoFile: file,
        photoPreview: preview,
      }));
      vibrate(100);
      // Resolve the photo wait promise
      if (photoResolveRef.current) {
        photoResolveRef.current();
        photoResolveRef.current = null;
      }
    };
    reader.readAsDataURL(file);
  }

  // ─── Restart ───────────────────────────────────────────────
  function handleRestart() {
    stopAll();
    isRunningRef.current = false;
    setStarted(false);
    setStep("GREETING");
    setData(INITIAL_DATA);
    setAssistantText("");
    setCitizenText("");
    setComplaintId(null);
    setIsProcessing(false);
    setConversationLog([]);
    photoResolveRef.current = null;
  }

  // ─── Progress percentage ───────────────────────────────────
  const currentIdx = STEPS_ORDER.indexOf(step);
  const progress = step === "DONE" ? 100 : Math.round(((currentIdx >= 0 ? currentIdx : 0) / (STEPS_ORDER.length - 1)) * 100);

  // ─── Mic animation ─────────────────────────────────────────
  const micClass =
    voiceState === "listening"
      ? "bg-red-500 shadow-red-500/40 scale-110"
      : voiceState === "speaking"
      ? "bg-blue-500 shadow-blue-500/40"
      : isProcessing
      ? "bg-amber-500 shadow-amber-500/40"
      : "bg-emerald-500 shadow-emerald-500/40";

  return (
    <div className="flex min-h-screen flex-col relative">
      {/* Skip link */}
      <Link
        href="/login"
        className="absolute top-3 right-4 z-50 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        Skip →
      </Link>

      {/* ─── START SCREEN ─── */}
      {!started ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 gap-10">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Voice Assistant
            </h1>
            <p className="text-xl text-muted-foreground">குரல் உதவியாளர்</p>
            <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto">
              Just talk about your civic issue. No typing needed.
              <br />
              தமிழ் மற்றும் English-ல் பேசலாம்.
            </p>
          </div>

          <button
            onClick={runConversation}
            disabled={!isSupported}
            className="relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic className="h-20 w-20" />
            {/* Pulse rings */}
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping" />
            <span className="absolute inset-0 rounded-full border border-emerald-400/20 animate-pulse" />
          </button>

          <p className="text-lg font-semibold text-emerald-500 animate-pulse">
            Tap to Start Talking
          </p>

          {!isSupported && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-5 py-3 text-sm text-amber-600 max-w-sm text-center">
              ⚠️ Voice requires Chrome or Edge browser. Please switch to Chrome.
            </div>
          )}
        </div>
      ) : (
        /* ─── ACTIVE CONVERSATION ─── */
        <div className="flex flex-1 flex-col">
          {/* Progress bar */}
          <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-sm border-b border-border/30 px-4 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {STEP_LABELS[step]?.icon} {STEP_LABELS[step]?.label}
              </span>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-lg mx-auto w-full">
            {conversationLog.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-blue-500/10 text-foreground border border-blue-500/20"
                      : "bg-emerald-500/10 text-foreground border border-emerald-500/20"
                  }`}
                >
                  <p className="text-[0.65rem] font-bold mb-0.5 opacity-60">
                    {msg.role === "assistant" ? "🤖 Assistant" : "🗣️ You"}
                  </p>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Live interim text */}
            {voiceState === "listening" && interimText && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-emerald-500/5 border border-emerald-500/10 text-muted-foreground italic">
                  {interimText}...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Photo area */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />

          {step === "PHOTO" && (
            <div className="px-4 pb-2 max-w-lg mx-auto w-full">
              {data.photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-emerald-500/30">
                  <img
                    src={data.photoPreview}
                    alt="Captured"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-20 text-base gap-3 border-dashed border-2 border-emerald-500/30 hover:bg-emerald-500/5"
                >
                  <Camera className="h-7 w-7 text-emerald-500" />
                  📸 Tap to Take Photo
                </Button>
              )}
            </div>
          )}

          {/* Done celebration */}
          {step === "DONE" && complaintId && (
            <div className="px-4 pb-2 max-w-lg mx-auto w-full">
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                  Complaint Registered! 🎉
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  ID: {complaintId.slice(0, 8)}
                </p>
              </div>
            </div>
          )}

          {/* Bottom bar: Mic status + controls */}
          <div className="sticky bottom-0 border-t border-border/30 bg-background/90 backdrop-blur-sm px-4 py-3">
            <div className="flex items-center justify-between max-w-lg mx-auto">
              {/* Mic indicator */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${micClass}`}
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : voiceState === "listening" ? (
                    <Mic className="h-5 w-5 text-white animate-pulse" />
                  ) : voiceState === "speaking" ? (
                    <Volume2 className="h-5 w-5 text-white" />
                  ) : (
                    <Mic className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {voiceState === "listening" && "🔴 Listening..."}
                    {voiceState === "speaking" && "🔊 Speaking..."}
                    {voiceState === "idle" && isProcessing && "⏳ Processing..."}
                    {voiceState === "idle" && !isProcessing && step === "DONE" && "✅ Complete!"}
                    {voiceState === "idle" && !isProcessing && step !== "DONE" && "⏸️ Waiting..."}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                <Button onClick={handleRestart} variant="outline" size="sm" className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restart
                </Button>
                <Button
                  onClick={() => { stopAll(); router.push("/login"); }}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
