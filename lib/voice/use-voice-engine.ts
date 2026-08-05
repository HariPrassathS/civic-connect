"use client";

import { useCallback, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "speaking";

interface UseVoiceEngineReturn {
  voiceState: VoiceState;
  speak: (text: string, lang?: string) => Promise<void>;
  listen: (lang?: string) => Promise<string>;
  stopAll: () => void;
  isSupported: boolean;
}

/**
 * Custom hook that wraps Web Speech API for text-to-speech and speech-to-text.
 * Uses browser-native APIs — no external services needed.
 */
export function useVoiceEngine(): UseVoiceEngineReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check browser support
  const isSupported =
    typeof window !== "undefined" &&
    ("speechSynthesis" in window) &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  /**
   * Speak text aloud using Web Speech API TTS.
   * Returns a promise that resolves when speaking is complete.
   */
  const speak = useCallback(
    (text: string, lang: string = "ta-IN"): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve();
          return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9; // Slightly slower for elders
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to pick a good voice for the language
        const voices = window.speechSynthesis.getVoices();
        const langPrefix = lang.split("-")[0]; // "ta" from "ta-IN"
        const preferred = voices.find(
          (v) => v.lang.startsWith(langPrefix) && v.localService
        );
        if (preferred) {
          utterance.voice = preferred;
        } else {
          // Fallback: any voice matching language
          const fallback = voices.find((v) => v.lang.startsWith(langPrefix));
          if (fallback) utterance.voice = fallback;
        }

        synthRef.current = utterance;
        setVoiceState("speaking");

        utterance.onend = () => {
          setVoiceState("idle");
          resolve();
        };
        utterance.onerror = () => {
          setVoiceState("idle");
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    []
  );

  /**
   * Listen to the microphone and return the transcript.
   * Returns a promise that resolves with the final recognized text.
   */
  const listen = useCallback(
    (lang: string = "ta-IN"): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (typeof window === "undefined") {
          reject(new Error("Not in browser"));
          return;
        }

        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
          reject(new Error("Speech recognition not supported"));
          return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = lang;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        setVoiceState("listening");

        let finalTranscript = "";

        recognition.onresult = (event: any) => {
          finalTranscript = event.results[0][0].transcript;
        };

        recognition.onend = () => {
          setVoiceState("idle");
          recognitionRef.current = null;
          resolve(finalTranscript);
        };

        recognition.onerror = (event: any) => {
          setVoiceState("idle");
          recognitionRef.current = null;
          // Return empty string on errors like "no-speech" instead of rejecting
          if (event.error === "no-speech" || event.error === "aborted") {
            resolve("");
          } else {
            resolve(""); // Graceful degradation
          }
        };

        recognition.start();
      });
    },
    []
  );

  /**
   * Stop all ongoing speech and listening.
   */
  const stopAll = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setVoiceState("idle");
  }, []);

  return {
    voiceState,
    speak,
    listen,
    stopAll,
    isSupported,
  };
}
