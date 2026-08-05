"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, MicOff, Camera, Check, RotateCcw, Loader2, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceEngine } from "@/lib/voice/use-voice-engine";
import {
  type ConversationStep,
  type Language,
  type CollectedData,
  INITIAL_DATA,
  getPrompt,
  getSpeechLang,
  detectLanguageChoice,
  extractPhone,
  isConfirmation,
  isDenial,
} from "@/lib/voice/conversation-machine";

export default function VoiceAssistantPage() {
  const router = useRouter();
  const { voiceState, speak, listen, stopAll, isSupported } = useVoiceEngine();

  const [step, setStep] = useState<ConversationStep>("GREETING");
  const [data, setData] = useState<CollectedData>(INITIAL_DATA);
  const [assistantText, setAssistantText] = useState("");
  const [citizenText, setCitizenText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isRunningRef = useRef(false);

  // ─── Core: Speak then Listen ────────────────────────────────
  const speakAndListen = useCallback(
    async (text: string, lang: Language): Promise<string> => {
      setAssistantText(text);
      setCitizenText("");
      const speechLang = lang === "ta" ? "ta-IN" : "en-IN";
      await speak(text, speechLang);
      // Small pause before listening
      await new Promise((r) => setTimeout(r, 500));
      const response = await listen(speechLang);
      setCitizenText(response);
      return response;
    },
    [speak, listen]
  );

  // ─── Location Detection ─────────────────────────────────────
  const detectLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 0, lng: 0 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 0, lng: 0 }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        { headers: { "User-Agent": "CivicConnectTN/1.0" } }
      );
      const geo = await res.json();
      return {
        address: geo.display_name || "",
        district: geo.address?.state_district || geo.address?.county || "",
        area: geo.address?.suburb || geo.address?.neighbourhood || geo.address?.village || "",
      };
    } catch {
      return { address: "", district: "", area: "" };
    }
  }, []);

  // ─── Main Conversation Loop ─────────────────────────────────
  const runConversation = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setStarted(true);

    let currentStep: ConversationStep = "GREETING";
    let currentData = { ...INITIAL_DATA };
    let lang: Language = "ta";

    try {
      // ── STEP 1: GREETING ──
      setStep("GREETING");
      const greetingPrompt = getPrompt("GREETING", "ta");
      const langResponse = await speakAndListen(greetingPrompt, "ta");
      lang = detectLanguageChoice(langResponse);
      currentData.language = lang;
      setData({ ...currentData });

      // ── STEP 2: LANGUAGE CONFIRMED → ASK NAME ──
      setStep("LANGUAGE");
      const langPrompt = getPrompt("LANGUAGE", lang);
      const nameResponse = await speakAndListen(langPrompt, lang);
      currentData.name = nameResponse || "Citizen";
      setData({ ...currentData });

      // ── STEP 3: ASK PHONE ──
      setStep("NAME");
      const nameConfirm = lang === "ta"
        ? `${currentData.name}, நன்றி! உங்கள் போன் நம்பர் சொல்லுங்கள்.`
        : `Thank you ${currentData.name}! Please tell me your phone number.`;
      const phoneResponse = await speakAndListen(nameConfirm, lang);
      currentData.phone = extractPhone(phoneResponse);
      setData({ ...currentData });

      // ── STEP 4: DETECT LOCATION ──
      setStep("PHONE");
      const locPrompt = getPrompt("PHONE", lang);
      setAssistantText(locPrompt);
      await speak(locPrompt, lang === "ta" ? "ta-IN" : "en-IN");

      setIsProcessing(true);
      const coords = await detectLocation();
      currentData.lat = coords.lat;
      currentData.lng = coords.lng;

      if (coords.lat !== 0) {
        const geo = await reverseGeocode(coords.lat, coords.lng);
        currentData.address = geo.address;
        currentData.district = geo.district;
        currentData.area = geo.area;
      }
      setData({ ...currentData });
      setIsProcessing(false);

      // ── STEP 5: ASK COMPLAINT ──
      setStep("LOCATION");
      const locationConfirm = lang === "ta"
        ? `உங்கள் லொக்கேஷன் கிடைத்தது${currentData.area ? ` — ${currentData.area}` : ""}. என்ன பிரச்சனை இருக்கு? சொல்லுங்கள், நான் குறிப்பு எடுக்கிறேன்.`
        : `I found your location${currentData.area ? ` — ${currentData.area}` : ""}. What is the problem? Tell me, I will note it down.`;
      const complaintResponse = await speakAndListen(locationConfirm, lang);
      currentData.complaintText = complaintResponse;
      setData({ ...currentData });

      // ── STEP 6: AI EXTRACTION ──
      setStep("COMPLAINT");
      setIsProcessing(true);
      try {
        const extractRes = await fetch("/api/voice/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: complaintResponse,
            language: lang,
          }),
        });
        const extracted = await extractRes.json();
        currentData.issueType = extracted.issue_type || "other";
        currentData.title = extracted.title || "Voice Complaint";
        currentData.description = extracted.description || complaintResponse;
        currentData.urgency = extracted.urgency || "medium";
      } catch {
        currentData.issueType = "other";
        currentData.title = "Voice Complaint";
        currentData.description = complaintResponse;
      }
      setData({ ...currentData });
      setIsProcessing(false);

      // ── STEP 7: ASK FOR PHOTO ──
      const photoPrompt = getPrompt("COMPLAINT", lang);
      const photoResponse = await speakAndListen(photoPrompt, lang);

      if (!isDenial(photoResponse)) {
        // Wait for photo capture
        setStep("PHOTO");
        const photoTakePrompt = lang === "ta"
          ? "கேமரா பட்டனை தட்டி போட்டோ எடுங்கள்."
          : "Tap the camera button to take a photo.";
        setAssistantText(photoTakePrompt);
        await speak(photoTakePrompt, lang === "ta" ? "ta-IN" : "en-IN");

        // Wait for photo — user will tap camera button
        // We'll set up a promise that resolves when the photo is captured
        await new Promise<void>((resolve) => {
          const checkPhoto = setInterval(() => {
            // Check if data has been updated with photo
            // We'll use a simpler approach — just wait a reasonable time
          }, 500);

          // Give user 15 seconds to take photo, then continue
          setTimeout(() => {
            clearInterval(checkPhoto);
            resolve();
          }, 15000);
        });
      }

      // ── STEP 8: CONFIRM ──
      setStep("CONFIRM");
      const summary = lang === "ta"
        ? `சரி, உங்கள் புகார் தயார்: ${currentData.title}${currentData.area ? `, ${currentData.area}` : ""}. சமர்ப்பிக்கவா? ஆமா என்று சொல்லுங்கள்.`
        : `Alright, your complaint is ready: ${currentData.title}${currentData.area ? `, ${currentData.area}` : ""}. Shall I submit? Say yes to confirm.`;
      const confirmResponse = await speakAndListen(summary, lang);

      if (!isConfirmation(confirmResponse)) {
        // User didn't confirm — restart
        const cancelMsg = lang === "ta"
          ? "சரி, ரத்து செய்கிறேன். மீண்டும் முயற்சி செய்யலாம்."
          : "Okay, cancelling. You can try again.";
        setAssistantText(cancelMsg);
        await speak(cancelMsg, lang === "ta" ? "ta-IN" : "en-IN");
        isRunningRef.current = false;
        setStarted(false);
        setStep("GREETING");
        return;
      }

      // ── STEP 9: SUBMIT ──
      setStep("SUBMITTING");
      const submitPrompt = getPrompt("SUBMITTING", lang);
      setAssistantText(submitPrompt);
      await speak(submitPrompt, lang === "ta" ? "ta-IN" : "en-IN");
      setIsProcessing(true);

      const submitRes = await fetch("/api/voice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentData.name,
          phone: currentData.phone,
          lat: currentData.lat,
          lng: currentData.lng,
          address: currentData.address,
          district: currentData.district,
          area: currentData.area,
          issueType: currentData.issueType,
          title: currentData.title,
          description: currentData.description,
          urgency: currentData.urgency,
          photoBase64: currentData.photoPreview,
        }),
      });
      const submitData = await submitRes.json();
      setIsProcessing(false);

      if (submitData.success) {
        setComplaintId(submitData.complaintId);
        setStep("DONE");
        const doneMsg = lang === "ta"
          ? `உங்கள் புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டது! புகார் எண்: ${submitData.complaintId?.slice(0, 8)}. நாங்கள் 48 மணி நேரத்தில் தீர்க்க முயற்சிப்போம். நன்றி!`
          : `Your complaint has been registered successfully! Complaint ID: ${submitData.complaintId?.slice(0, 8)}. We will try to resolve it within 48 hours. Thank you!`;
        setAssistantText(doneMsg);
        await speak(doneMsg, lang === "ta" ? "ta-IN" : "en-IN");
      } else {
        setStep("ERROR");
        const errorMsg = getPrompt("ERROR", lang);
        setAssistantText(errorMsg);
        await speak(errorMsg, lang === "ta" ? "ta-IN" : "en-IN");
      }
    } catch (error) {
      console.error("Conversation error:", error);
      setStep("ERROR");
      const errorMsg = getPrompt("ERROR", data.language);
      setAssistantText(errorMsg);
    }

    isRunningRef.current = false;
  }, [speakAndListen, speak, detectLocation, reverseGeocode, data.language]);

  // ─── Photo Capture Handler ──────────────────────────────────
  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setData((prev) => ({
        ...prev,
        photoFile: file,
        photoPreview: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  }

  // ─── Restart ────────────────────────────────────────────────
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
  }

  // ─── Mic icon animation class ───────────────────────────────
  const micPulseClass =
    voiceState === "listening"
      ? "animate-pulse bg-red-500 shadow-red-500/50"
      : voiceState === "speaking"
      ? "bg-blue-500 shadow-blue-500/50"
      : "bg-emerald-500 shadow-emerald-500/50";

  // ─── Ensure speech synthesis voices are loaded ──────────────
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-8 relative">
      {/* Skip link */}
      <Link
        href="/login"
        className="absolute top-4 right-4 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        Skip to Login →
      </Link>

      {/* ─── Not started — Big start button ─── */}
      {!started ? (
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              🎤 Voice Assistant
            </h1>
            <p className="text-lg text-muted-foreground">
              குரல் உதவியாளர்
            </p>
          </div>

          {/* Big tap button */}
          <button
            onClick={runConversation}
            className={`relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95`}
          >
            <Mic className="h-16 w-16" />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground/90 px-4 py-1 text-xs font-semibold text-background">
              Tap to Talk
            </span>
          </button>

          <div className="max-w-xs space-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              No typing needed. Just talk about your civic issue and our
              AI assistant will handle everything.
            </p>
            <p className="text-xs text-muted-foreground/70">
              தமிழ் மற்றும் ஆங்கிலத்தில் பேசலாம்
            </p>
          </div>

          {!isSupported && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-600 dark:text-amber-400 max-w-sm text-center">
              Voice features require Chrome or Edge browser.
              Please open this page in Chrome for the best experience.
            </div>
          )}
        </div>
      ) : (
        /* ─── Active conversation ─── */
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-medium">
              {step === "GREETING" && "🎤 Greeting"}
              {step === "LANGUAGE" && "🌐 Language"}
              {step === "NAME" && "👤 Name"}
              {step === "PHONE" && "📞 Phone"}
              {step === "LOCATION" && "📍 Location"}
              {step === "COMPLAINT" && "📝 Complaint"}
              {step === "PHOTO" && "📸 Photo"}
              {step === "CONFIRM" && "✅ Confirm"}
              {step === "SUBMITTING" && "⏳ Submitting"}
              {step === "DONE" && "🎉 Done"}
              {step === "ERROR" && "❌ Error"}
            </span>
          </div>

          {/* Animated mic */}
          <div
            className={`flex h-28 w-28 items-center justify-center rounded-full shadow-xl transition-all duration-500 ${micPulseClass}`}
          >
            {isProcessing ? (
              <Loader2 className="h-12 w-12 text-white animate-spin" />
            ) : voiceState === "listening" ? (
              <Mic className="h-12 w-12 text-white" />
            ) : voiceState === "speaking" ? (
              <Volume2 className="h-12 w-12 text-white" />
            ) : (
              <Mic className="h-12 w-12 text-white" />
            )}
          </div>

          {/* Status label */}
          <p className="text-sm font-medium text-muted-foreground">
            {voiceState === "listening" && "🔴 Listening..."}
            {voiceState === "speaking" && "🔊 Speaking..."}
            {voiceState === "idle" && isProcessing && "⏳ Processing..."}
            {voiceState === "idle" && !isProcessing && step === "DONE" && "✅ Complete!"}
            {voiceState === "idle" && !isProcessing && step !== "DONE" && "⏸️ Waiting..."}
          </p>

          {/* Assistant text bubble */}
          {assistantText && (
            <div className="w-full rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4">
              <p className="text-xs font-semibold text-blue-500 mb-1">🤖 Assistant</p>
              <p className="text-sm text-foreground leading-relaxed">
                {assistantText}
              </p>
            </div>
          )}

          {/* Citizen text bubble */}
          {citizenText && (
            <div className="w-full rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <p className="text-xs font-semibold text-emerald-500 mb-1">🗣️ You said</p>
              <p className="text-sm text-foreground leading-relaxed">
                {citizenText}
              </p>
            </div>
          )}

          {/* Photo section — visible during PHOTO step */}
          {(step === "PHOTO" || step === "CONFIRM" || step === "COMPLAINT") && (
            <div className="w-full">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              {data.photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img
                    src={data.photoPreview}
                    alt="Captured photo"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-emerald-500 text-white rounded-full p-1.5">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-24 text-lg gap-3 border-dashed border-2"
                >
                  <Camera className="h-8 w-8" />
                  📸 Take Photo
                </Button>
              )}
            </div>
          )}

          {/* Done state — show complaint ID */}
          {step === "DONE" && complaintId && (
            <div className="w-full rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                Complaint Registered!
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                ID: {complaintId.slice(0, 8)}
              </p>
            </div>
          )}

          {/* Control buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleRestart}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </Button>
            <Button
              onClick={() => {
                stopAll();
                router.push("/login");
              }}
              variant="ghost"
              size="sm"
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Exit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
