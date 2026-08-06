"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mic, Camera, Check, RotateCcw, Loader2, Volume2, X, CheckCircle2,
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

// ─── Step metadata ────────────────────────────────────────────
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

/**
 * ANTI-ECHO DELAY: Wait this long after TTS finishes before starting STT.
 * This prevents the mic from picking up the speaker's output.
 * 1.5 seconds is safe for most devices.
 */
const ANTI_ECHO_DELAY = 1500;

/**
 * How long to wait for user speech before giving up (ms).
 * Elders need more time to think and respond.
 */
const LISTEN_TIMEOUT = 12000;

/**
 * Safe wait helper
 */
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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
  const [chatLog, setChatLog] = useState<
    { role: "assistant" | "citizen"; text: string }[]
  >([]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isRunningRef = useRef(false);
  const photoResolveRef = useRef<(() => void) | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, assistantText, citizenText, interimText]);

  // Load voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();
    }
  }, []);

  // ─── Chat log helper ───────────────────────────────────────
  const log = useCallback(
    (role: "assistant" | "citizen", text: string) => {
      if (!text) return;
      setChatLog((prev) => [...prev, { role, text }]);
    },
    []
  );

  // ─── CORE: Speak → wait (anti-echo) → Listen ──────────────
  // This is the critical function. The long gap prevents self-hearing.
  const askAndListen = useCallback(
    async (
      prompt: string,
      lang: Language,
      timeout: number = LISTEN_TIMEOUT
    ): Promise<string> => {
      const speechLang = lang === "ta" ? "ta-IN" : "en-IN";

      // 1. Show & speak the prompt
      setAssistantText(prompt);
      setCitizenText("");
      log("assistant", prompt);
      await speak(prompt, speechLang);

      // 2. ANTI-ECHO GAP — critical! Wait for speaker to fully stop
      await wait(ANTI_ECHO_DELAY);

      // 3. Now listen
      const result = await listen(speechLang, timeout);
      const cleaned = result.trim();
      setCitizenText(cleaned);
      if (cleaned) log("citizen", cleaned);

      return cleaned;
    },
    [speak, listen, log]
  );

  // ─── Speak-only (no listen after) ──────────────────────────
  const sayOnly = useCallback(
    async (text: string, lang: Language) => {
      const speechLang = lang === "ta" ? "ta-IN" : "en-IN";
      setAssistantText(text);
      log("assistant", text);
      await speak(text, speechLang);
      await wait(500); // small pause after
    },
    [speak, log]
  );

  // ─── Ask with retry (up to 2 retries on empty) ─────────────
  const askWithRetry = useCallback(
    async (
      prompt: string,
      retryPrompt: string,
      lang: Language,
      timeout: number = LISTEN_TIMEOUT,
      maxRetries: number = 2
    ): Promise<string> => {
      // First attempt
      let result = await askAndListen(prompt, lang, timeout);
      if (result) return result;

      // Retries
      for (let i = 0; i < maxRetries; i++) {
        result = await askAndListen(retryPrompt, lang, timeout);
        if (result) return result;
      }
      return "";
    },
    [askAndListen]
  );

  // ─── Vibrate helper ────────────────────────────────────────
  const vibrate = useCallback((p: number | number[]) => {
    try { navigator?.vibrate?.(p); } catch {}
  }, []);

  // ─── Location (CRASH-PROOF) ────────────────────────────────
  const safeGetLocation = useCallback(async (): Promise<{
    lat: number;
    lng: number;
    address: string;
    district: string;
    area: string;
  }> => {
    const fallback = { lat: 0, lng: 0, address: "", district: "", area: "" };

    try {
      // Check if geolocation is available
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        return fallback;
      }

      // Get coordinates with timeout
      const coords = await new Promise<{ lat: number; lng: number }>(
        (resolve) => {
          const timer = setTimeout(() => resolve({ lat: 0, lng: 0 }), 10000);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(timer);
              resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            },
            () => {
              clearTimeout(timer);
              resolve({ lat: 0, lng: 0 });
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        }
      );

      if (coords.lat === 0 && coords.lng === 0) {
        return fallback;
      }

      // Reverse geocode with timeout
      try {
        const controller = new AbortController();
        const geoTimer = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=16&addressdetails=1`,
          {
            headers: { "User-Agent": "CivicConnectTN/1.0" },
            signal: controller.signal,
          }
        );
        clearTimeout(geoTimer);

        const geo = await res.json();
        return {
          lat: coords.lat,
          lng: coords.lng,
          address: geo.display_name || "",
          district:
            geo.address?.state_district || geo.address?.county || "",
          area:
            geo.address?.suburb ||
            geo.address?.neighbourhood ||
            geo.address?.village ||
            "",
        };
      } catch {
        // Geocode failed but we have coordinates
        return { ...coords, address: "", district: "", area: "" };
      }
    } catch {
      return fallback;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // MAIN CONVERSATION — Each step is wrapped in try-catch
  // ═══════════════════════════════════════════════════════════
  const runConversation = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setStarted(true);
    vibrate(100);

    let d = { ...INITIAL_DATA };
    let lang: Language = "ta";

    // ── STEP 1: GREETING + LANGUAGE ─────────────────────────
    try {
      setStep("GREETING");
      const langInput = await askWithRetry(
        "வணக்கம்! நான் சிவிக் கனெக்ட் உதவியாளர். உங்கள் பிரச்சனையை பதிவு செய்ய நான் உதவுகிறேன். தமிழில் பேசலாமா, English-ல பேசலாமா?",
        "Tamil-ல பேசணுமா? English-ல பேசணுமா? சொல்லுங்கள்.",
        "ta",
        12000,
        1
      );
      lang = detectLanguageChoice(langInput);
      d.language = lang;
      setData({ ...d });
    } catch (e) {
      console.error("Step GREETING failed:", e);
      lang = "ta";
      d.language = lang;
    }

    // ── STEP 2: NAME ────────────────────────────────────────
    try {
      setStep("NAME");
      const namePrompt =
        lang === "ta"
          ? "சரி, தமிழில் பேசலாம்! உங்கள் பெயர் என்ன?"
          : "Great! What is your name?";
      const retryName =
        lang === "ta"
          ? "உங்கள் பெயர் சொல்லுங்கள்."
          : "Please tell me your name.";
      const nameInput = await askWithRetry(namePrompt, retryName, lang);
      d.name = nameInput || "Citizen";
      setData({ ...d });
    } catch (e) {
      console.error("Step NAME failed:", e);
      d.name = "Citizen";
    }

    // ── STEP 3: LOCATION (CRASH-PROOF & MANUAL) ──────────────
    try {
      setStep("LOCATION");
      
      // Fetch GPS silently in background for coordinates (don't block speech)
      safeGetLocation().then(loc => {
        d.lat = loc.lat;
        d.lng = loc.lng;
        setData(prev => ({ ...prev, lat: loc.lat, lng: loc.lng }));
      }).catch(() => {});

      const locationPrompt =
        lang === "ta"
          ? `${d.name}, நன்றி! பிரச்சனை எந்த ஏரியாவில் உள்ளது? உங்கள் ஏரியா பெயரை சொல்லுங்கள்.`
          : `Thank you ${d.name}! Which area is the problem located in? Tell me the area name.`;
      const retryLoc =
        lang === "ta"
          ? "பிரச்சனை நடக்கும் ஏரியா பெயரை சொல்லுங்கள்."
          : "Please say the name of the area.";
      
      const manualLoc = await askWithRetry(locationPrompt, retryLoc, lang, 12000, 2);
      d.area = manualLoc || "Unknown Area";
      d.address = d.area;
      setData({ ...d });

    } catch (e) {
      console.error("Step LOCATION failed:", e);
      d.area = "Unknown Area";
      d.address = "Unknown Area";
      setData({ ...d });
    }

    // ── STEP 5: COMPLAINT ───────────────────────────────────
    try {
      setStep("COMPLAINT");
      const complaintPrompt =
        lang === "ta"
          ? "இப்போது என்ன பிரச்சனை இருக்கு? விரிவாக சொல்லுங்கள், நான் குறிப்பு எடுக்கிறேன்."
          : "Now, what is the problem? Please describe it in detail, I will note it down.";
      const retryComplaint =
        lang === "ta"
          ? "பிரச்சனையை சொல்லுங்கள். உதாரணம்: ரோட்ல குழி, தண்ணி வரலை, குப்பை."
          : "Please describe the problem. Example: pothole on road, no water, garbage.";
      const complaintInput = await askWithRetry(
        complaintPrompt,
        retryComplaint,
        lang,
        15000,
        2
      );

      d.complaintText = complaintInput || "Civic issue reported via voice";
      setData({ ...d });

      // AI Extraction
      setIsProcessing(true);
      await sayOnly(
        lang === "ta"
          ? "புரிகிறது. பகுப்பாய்வு செய்கிறேன்..."
          : "Understood. Analyzing...",
        lang
      );

      try {
        const res = await fetch("/api/voice/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: d.complaintText,
            language: lang,
            location: d.area || d.district || "",
          }),
        });
        const ex = await res.json();
        d.issueType = ex.issue_type || "other";
        d.title = ex.title || "Voice Complaint";
        d.description = ex.description || d.complaintText;
        d.urgency = ex.urgency || "medium";
      } catch {
        d.issueType = "other";
        d.title = "Voice Complaint";
        d.description = d.complaintText;
      }
      setData({ ...d });
      setIsProcessing(false);

      // Confirm understanding
      const confirmUnderstand =
        lang === "ta"
          ? `நான் புரிந்தது: "${d.title}". சரியா?`
          : `I understood: "${d.title}". Is that correct?`;
      const ok = await askAndListen(confirmUnderstand, lang, 8000);

      if (isDenial(ok)) {
        const redo = await askAndListen(
          lang === "ta"
            ? "சரி, மீண்டும் விரிவாக சொல்லுங்கள்."
            : "Okay, please describe again in detail.",
          lang,
          15000
        );
        if (redo) {
          d.complaintText = redo;
          setIsProcessing(true);
          try {
            const r2 = await fetch("/api/voice/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transcript: redo,
                language: lang,
                location: d.area || "",
              }),
            });
            const e2 = await r2.json();
            d.issueType = e2.issue_type || d.issueType;
            d.title = e2.title || d.title;
            d.description = e2.description || redo;
            d.urgency = e2.urgency || d.urgency;
          } catch {}
          setData({ ...d });
          setIsProcessing(false);
        }
      }
    } catch (e) {
      console.error("Step COMPLAINT failed:", e);
      setIsProcessing(false);
    }

    // ── STEP 6: PHOTO ───────────────────────────────────────
    try {
      setStep("PHOTO");
      const photoResp = await askAndListen(
        lang === "ta"
          ? "பிரச்சனையின் போட்டோ எடுக்க முடியுமா? 'ஆமா' அல்லது 'வேண்டாம்' என்று சொல்லுங்கள்."
          : "Can you take a photo of the problem? Say 'yes' or 'no'.",
        lang,
        8000
      );

      if (!isDenial(photoResp)) {
        await sayOnly(
          lang === "ta"
            ? "கீழே கேமரா பட்டனை தட்டுங்கள். போட்டோ எடுத்தபின் நான் தொடர்வேன்."
            : "Tap the camera button below. I will continue after you take the photo.",
          lang
        );

        // Event-driven: wait for photo or 25s timeout
        await new Promise<void>((resolve) => {
          photoResolveRef.current = resolve;
          setTimeout(() => cameraInputRef.current?.click(), 1000);
          setTimeout(() => {
            photoResolveRef.current = null;
            resolve();
          }, 25000);
        });

        if (d.photoPreview) {
          await sayOnly(
            lang === "ta" ? "போட்டோ சேர்க்கப்பட்டது!" : "Photo added!",
            lang
          );
        }
      } else {
        await sayOnly(
          lang === "ta"
            ? "சரி, போட்டோ இல்லாமல் தொடர்கிறேன்."
            : "Okay, continuing without photo.",
          lang
        );
      }
    } catch (e) {
      console.error("Step PHOTO failed:", e);
    }

    // ── STEP 7: CONFIRM ─────────────────────────────────────
    try {
      setStep("CONFIRM");
      vibrate([50, 100, 50]);

      const summary =
        lang === "ta"
          ? `உங்கள் புகார் தயார். பெயர்: ${d.name}. பிரச்சனை: ${d.title}. ${d.area ? `இடம்: ${d.area}. ` : ""}சமர்ப்பிக்கவா? ஆமா என்று சொல்லுங்கள்.`
          : `Your complaint is ready. Name: ${d.name}. Issue: ${d.title}. ${d.area ? `Location: ${d.area}. ` : ""}Shall I submit? Say yes.`;

      const confirm = await askAndListen(summary, lang, 10000);

      if (!isConfirmation(confirm) && confirm !== "") {
        // They said something that's not yes — check if it's explicitly no
        if (isDenial(confirm)) {
          await sayOnly(
            lang === "ta"
              ? "சரி, ரத்து செய்கிறேன்."
              : "Okay, cancelling.",
            lang
          );
          isRunningRef.current = false;
          return;
        }
        // Ambiguous — ask one more time
        const retryConfirm = await askAndListen(
          lang === "ta"
            ? "சமர்ப்பிக்கணுமா? ஆமா அல்லது வேண்டாம் சொல்லுங்கள்."
            : "Should I submit? Say yes or no.",
          lang,
          8000
        );
        if (!isConfirmation(retryConfirm)) {
          await sayOnly(
            lang === "ta" ? "சரி, ரத்து செய்கிறேன்." : "Okay, cancelling.",
            lang
          );
          isRunningRef.current = false;
          return;
        }
      }
      // Empty response = treat as yes (elder might have just nodded)
    } catch (e) {
      console.error("Step CONFIRM failed:", e);
    }

    // ── STEP 8: SUBMIT ──────────────────────────────────────
    try {
      setStep("SUBMITTING");
      await sayOnly(
        lang === "ta"
          ? "சமர்ப்பிக்கிறேன்... ஒரு நிமிடம்."
          : "Submitting... One moment.",
        lang
      );
      setIsProcessing(true);
      vibrate(100);

      const submitRes = await fetch("/api/voice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: d.name,
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

      if (result.success) {
        setComplaintId(result.complaintId);
        setStep("DONE");
        vibrate([100, 50, 100, 50, 200]);
        const shortId = result.complaintId?.slice(0, 8) || "";
        await sayOnly(
          lang === "ta"
            ? `வெற்றி! உங்கள் புகார் பதிவு செய்யப்பட்டது. எண்: ${shortId}. 48 மணி நேரத்தில் நடவடிக்கை எடுப்போம். நன்றி ${d.name}!`
            : `Success! Your complaint is registered. ID: ${shortId}. We will act within 48 hours. Thank you ${d.name}!`,
          lang
        );
      } else {
        setStep("ERROR");
        await sayOnly(
          lang === "ta"
            ? "மன்னிக்கவும், சமர்ப்பிக்க இயலவில்லை. மீண்டும் முயற்சிக்கவும்."
            : "Sorry, submission failed. Please try again.",
          lang
        );
      }
    } catch (e) {
      console.error("Step SUBMIT failed:", e);
      setIsProcessing(false);
      setStep("ERROR");
      await sayOnly(
        lang === "ta"
          ? "ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்."
          : "An error occurred. Please try again.",
        lang
      );
    }

    isRunningRef.current = false;
  }, [askAndListen, askWithRetry, sayOnly, safeGetLocation, vibrate, listen, speak]);

  // ─── Photo handler (event-driven) ─────────────────────────
  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result as string;
      setData((prev) => ({ ...prev, photoFile: file, photoPreview: preview }));
      vibrate(100);
      if (photoResolveRef.current) {
        photoResolveRef.current();
        photoResolveRef.current = null;
      }
    };
    reader.readAsDataURL(file);
  }

  // ─── Restart ──────────────────────────────────────────────
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
    setChatLog([]);
    photoResolveRef.current = null;
  }

  // ─── UI helpers ───────────────────────────────────────────
  const currentIdx = STEPS_ORDER.indexOf(step);
  const progress =
    step === "DONE"
      ? 100
      : Math.round(
          ((currentIdx >= 0 ? currentIdx : 0) / (STEPS_ORDER.length - 1)) * 100
        );

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
            <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto leading-relaxed">
              Just talk about your civic issue. No typing needed.
              <br />
              தமிழ் மற்றும் English-ல் பேசலாம்.
            </p>
          </div>

          <button
            onClick={runConversation}
            disabled={!isSupported}
            className="relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Mic className="h-20 w-20" />
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping" />
          </button>

          <p className="text-lg font-semibold text-emerald-500 animate-pulse">
            Tap to Start
          </p>

          {!isSupported && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-5 py-3 text-sm text-amber-600 max-w-sm text-center">
              ⚠️ Voice requires Chrome or Edge. Please switch browser.
            </div>
          )}
        </div>
      ) : (
        /* ─── ACTIVE CONVERSATION ─── */
        <div className="flex flex-1 flex-col">
          {/* Progress */}
          <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-sm border-b border-border/30 px-4 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {STEP_LABELS[step]?.icon} {STEP_LABELS[step]?.label}
              </span>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-lg mx-auto w-full">
            {chatLog.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-blue-500/10 border border-blue-500/20"
                      : "bg-emerald-500/10 border border-emerald-500/20"
                  }`}
                >
                  <p className="text-[0.65rem] font-bold mb-0.5 opacity-50">
                    {msg.role === "assistant" ? "🤖 Assistant" : "🗣️ You"}
                  </p>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Live interim */}
            {voiceState === "listening" && interimText && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-emerald-500/5 border border-dashed border-emerald-500/20 text-muted-foreground italic">
                  {interimText}...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Photo */}
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
                  <img src={data.photoPreview} alt="Photo" className="w-full h-40 object-cover" />
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1.5">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-20 text-base gap-3 border-dashed border-2 border-emerald-500/30"
                >
                  <Camera className="h-7 w-7 text-emerald-500" />
                  📸 Tap to Take Photo
                </Button>
              )}
            </div>
          )}

          {/* Done */}
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

          {/* Bottom bar */}
          <div className="sticky bottom-0 border-t border-border/30 bg-background/90 backdrop-blur-sm px-4 py-3">
            <div className="flex items-center justify-between max-w-lg mx-auto">
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
                <p className="text-sm font-medium">
                  {voiceState === "listening" && "🔴 Listening..."}
                  {voiceState === "speaking" && "🔊 Speaking..."}
                  {voiceState === "idle" && isProcessing && "⏳ Processing..."}
                  {voiceState === "idle" && !isProcessing && step === "DONE" && "✅ Done!"}
                  {voiceState === "idle" && !isProcessing && step !== "DONE" && "⏸️ Waiting..."}
                </p>
              </div>
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
