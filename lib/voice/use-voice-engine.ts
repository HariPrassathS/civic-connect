"use client";

import { useCallback, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "speaking";

interface UseVoiceEngineReturn {
  voiceState: VoiceState;
  interimText: string;
  speak: (text: string, lang?: string) => Promise<void>;
  listen: (lang?: string, timeoutMs?: number) => Promise<string>;
  listenContinuous: (
    lang: string,
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    timeoutMs?: number
  ) => void;
  stopListening: () => void;
  stopAll: () => void;
  isSupported: boolean;
}

/**
 * Production-grade voice engine with:
 * - Interim results (real-time transcript as user speaks)
 * - Continuous listening mode for long speech
 * - Auto-retry on silence (re-prompts user)
 * - Smart voice selection for Tamil/English
 * - Chrome resume hack (Chrome pauses synthesis after 15s)
 */
export function useVoiceEngine(): UseVoiceEngineReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // ─── Chrome TTS bug fix ─────────────────────────────────────
  // Chrome pauses speech synthesis after ~15s. We resume it every 10s.
  const startResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    resumeTimerRef.current = setInterval(() => {
      if (typeof window !== "undefined" && window.speechSynthesis.speaking) {
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

  // ─── Smart voice picker ─────────────────────────────────────
  const pickVoice = useCallback((lang: string): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined") return null;
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = lang.split("-")[0];

    // Priority: Google voices > local voices > any match
    const googleVoice = voices.find(
      (v) => v.lang.startsWith(langPrefix) && v.name.toLowerCase().includes("google")
    );
    if (googleVoice) return googleVoice;

    const networkVoice = voices.find(
      (v) => v.lang.startsWith(langPrefix) && !v.localService
    );
    if (networkVoice) return networkVoice;

    const localVoice = voices.find((v) => v.lang.startsWith(langPrefix));
    return localVoice || null;
  }, []);

  // ─── TTS: Speak text aloud ──────────────────────────────────
  const speak = useCallback(
    (text: string, lang: string = "ta-IN"): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve();
          return;
        }

        window.speechSynthesis.cancel();
        stopResumeTimer();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.85; // Slower for elderly
        utterance.pitch = 1.05;
        utterance.volume = 1.0;

        const voice = pickVoice(lang);
        if (voice) utterance.voice = voice;

        synthRef.current = utterance;
        setVoiceState("speaking");
        startResumeTimer();

        utterance.onend = () => {
          stopResumeTimer();
          setVoiceState("idle");
          resolve();
        };
        utterance.onerror = (e) => {
          stopResumeTimer();
          setVoiceState("idle");
          console.warn("TTS error:", e.error);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [pickVoice, startResumeTimer, stopResumeTimer]
  );

  // ─── STT: Single-shot listen with timeout ───────────────────
  const listen = useCallback(
    (lang: string = "ta-IN", timeoutMs: number = 8000): Promise<string> => {
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
        recognition.interimResults = true; // Show real-time text
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

        // Timeout: if no speech detected, resolve with empty
        const timer = setTimeout(() => {
          if (!resolved) {
            try { recognition.stop(); } catch {}
            safeResolve(finalTranscript);
          }
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

  // ─── STT: Continuous listen for long speech ─────────────────
  const listenContinuous = useCallback(
    (
      lang: string,
      onInterim: (text: string) => void,
      onFinal: (text: string) => void,
      timeoutMs: number = 15000
    ) => {
      if (typeof window === "undefined") return;

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) return;

      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = true;

      setVoiceState("listening");

      let fullTranscript = "";

      const timer = setTimeout(() => {
        try { recognition.stop(); } catch {}
      }, timeoutMs);

      recognition.onresult = (event: any) => {
        let interim = "";
        let sessionFinal = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            sessionFinal += text;
          } else {
            interim += text;
          }
        }
        if (sessionFinal) {
          fullTranscript += sessionFinal + " ";
        }
        onInterim(fullTranscript + interim);
        setInterimText(fullTranscript + interim);
      };

      recognition.onend = () => {
        clearTimeout(timer);
        setVoiceState("idle");
        setInterimText("");
        recognitionRef.current = null;
        onFinal(fullTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        clearTimeout(timer);
        console.warn("Continuous STT error:", event.error);
        setVoiceState("idle");
        setInterimText("");
        recognitionRef.current = null;
        onFinal(fullTranscript.trim());
      };

      try {
        recognition.start();
      } catch (e) {
        console.warn("Continuous STT start failed:", e);
        onFinal("");
      }
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
    listenContinuous,
    stopListening,
    stopAll,
    isSupported,
  };
}
