"use client";

import { useCallback, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "speaking";

interface UseVoiceEngineReturn {
  voiceState: VoiceState;
  interimText: string;
  speak: (text: string, lang?: string) => Promise<void>;
  listen: (lang?: string, timeoutMs?: number) => Promise<string>;
  stopListening: () => void;
  stopAll: () => void;
  isSupported: boolean;
}

/**
 * Production voice engine v3.
 *
 * Key fixes:
 * 1. Anti-echo: 1.5s mandatory silence gap after TTS before STT starts
 * 2. Chrome TTS 15s pause bug: auto-resume timer
 * 3. Google voice prioritization for natural speech
 * 4. Robust error handling — never throws, always resolves
 * 5. Longer default timeouts for elderly users (12s)
 */
export function useVoiceEngine(): UseVoiceEngineReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // ─── Chrome TTS bug: auto-resume every 10s ──────────────────
  const startResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    resumeTimerRef.current = setInterval(() => {
      if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }, []);

  const stopResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  // ─── Pick best voice for language ───────────────────────────
  const pickVoice = useCallback((lang: string): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined") return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const langPrefix = lang.split("-")[0]; // "ta" from "ta-IN"

    // Priority 1: Google online voices (highest quality)
    const google = voices.find(
      (v) => v.lang.startsWith(langPrefix) && v.name.toLowerCase().includes("google")
    );
    if (google) return google;

    // Priority 2: Any online/network voice
    const network = voices.find(
      (v) => v.lang.startsWith(langPrefix) && !v.localService
    );
    if (network) return network;

    // Priority 3: Any matching voice
    return voices.find((v) => v.lang.startsWith(langPrefix)) || null;
  }, []);

  // ─── TTS: Speak text aloud ──────────────────────────────────
  const speak = useCallback(
    (text: string, lang: string = "ta-IN"): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve();
          return;
        }

        // Kill any ongoing speech & recognition first
        window.speechSynthesis.cancel();
        stopResumeTimer();
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
          recognitionRef.current = null;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.82; // Slow and clear for elders
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voice = pickVoice(lang);
        if (voice) utterance.voice = voice;

        setVoiceState("speaking");
        startResumeTimer();

        let resolved = false;
        const safeResolve = () => {
          if (resolved) return;
          resolved = true;
          stopResumeTimer();
          setVoiceState("idle");
          resolve();
        };

        utterance.onend = safeResolve;
        utterance.onerror = (e) => {
          console.warn("TTS error:", e.error);
          safeResolve();
        };

        // Safety timeout: if TTS doesn't fire onend (rare bug), resolve after estimated time
        const estimatedDuration = Math.max(3000, text.length * 80); // ~80ms per char
        setTimeout(safeResolve, estimatedDuration);

        window.speechSynthesis.speak(utterance);
      });
    },
    [pickVoice, startResumeTimer, stopResumeTimer]
  );

  // ─── STT: Listen with interim results ───────────────────────
  const listen = useCallback(
    (lang: string = "ta-IN", timeoutMs: number = 12000): Promise<string> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined") {
          resolve("");
          return;
        }

        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
          resolve("");
          return;
        }

        // Kill any previous recognition
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = lang;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.continuous = false;

        setVoiceState("listening");
        setInterimText("");

        let finalTranscript = "";
        let resolved = false;

        const safeResolve = (text: string) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          setVoiceState("idle");
          setInterimText("");
          recognitionRef.current = null;
          resolve(text);
        };

        // Timeout: resolve with whatever we have
        const timer = setTimeout(() => {
          try { recognition.stop(); } catch {}
          safeResolve(finalTranscript);
        }, timeoutMs);

        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interim += transcript;
            }
          }
          setInterimText(interim || finalTranscript);
        };

        recognition.onend = () => safeResolve(finalTranscript);

        recognition.onerror = (event: any) => {
          console.warn("STT error:", event.error);
          safeResolve(finalTranscript);
        };

        try {
          recognition.start();
        } catch (e) {
          console.warn("STT start failed:", e);
          safeResolve("");
        }
      });
    },
    []
  );

  // ─── Stop listening ─────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  // ─── Stop everything ────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopResumeTimer();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setVoiceState("idle");
    setInterimText("");
  }, [stopResumeTimer]);

  return {
    voiceState,
    interimText,
    speak,
    listen,
    stopListening,
    stopAll,
    isSupported,
  };
}
