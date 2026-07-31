"use client";

import { useState, useRef, useEffect } from "react";
import { ImagePlus, X, Mic, Square, FileVideo, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeotagCamera } from "./geotag-camera";

export interface PendingFile {
  file: File;
  preview: string;
  type: "image" | "video" | "audio";
}

interface MediaUploadProps {
  files: PendingFile[];
  onChange: (files: PendingFile[]) => void;
  maxFiles?: number;
}

export function MediaUpload({
  files,
  onChange,
  maxFiles = 5,
}: MediaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 10 minutes max (600 seconds)
  const MAX_RECORD_TIME = 600;

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setRecordTime((prev) => {
          if (prev >= MAX_RECORD_TIME - 1) {
            stopRecording();
            return MAX_RECORD_TIME;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: PendingFile[] = [];
    for (let i = 0; i < selected.length && files.length + newFiles.length < maxFiles; i++) {
      const file = selected[i];
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) continue;

      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        type: isImage ? "image" : "video",
      });
    }

    onChange([...files, ...newFiles]);
    e.target.value = "";
  }

  function handleGeotagCapture(file: File, preview: string) {
    if (files.length >= maxFiles) return;
    onChange([...files, { file, preview, type: "image" }]);
  }

  function removeFile(index: number) {
    const updated = [...files];
    URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    onChange(updated);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        
        // Remove existing audio to restrict to 1 voice note
        const filteredFiles = files.filter(f => f.type !== "audio");
        
        onChange([
          ...filteredFiles,
          { file, preview: URL.createObjectURL(blob), type: "audio" },
        ]);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordTime(0);
    } catch {
      // Microphone permission denied
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <ImagePlus className="h-4 w-4 text-primary" />
        Media & Voice Notes
      </label>

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Audio Preview if any */}
          {files.filter(f => f.type === "audio").map((f, i) => {
            const originalIndex = files.findIndex(file => file === f);
            return (
              <div key={`audio-${i}`} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="rounded-full bg-blue-500/10 p-2">
                    <Mic className="h-4 w-4 text-blue-500" />
                  </div>
                  <audio src={f.preview} controls className="h-8 max-w-[200px] w-full" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFile(originalIndex)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          {/* Image/Video Grid */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {files.filter(f => f.type !== "audio").map((f, i) => {
              const originalIndex = files.findIndex(file => file === f);
              return (
                <div
                  key={originalIndex}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                >
                  {f.type === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.preview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  {f.type === "video" && (
                    <div className="flex h-full w-full items-center justify-center bg-black">
                      <FileVideo className="h-8 w-8 text-white/50" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(originalIndex)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recording Indicator */}
      {recording && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-500 animate-pulse">
          <div className="flex items-center gap-2 font-medium">
            <Mic className="h-4 w-4" />
            Recording...
          </div>
          <div className="font-mono">{formatTime(recordTime)} / 10:00</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <GeotagCamera 
          onCapture={handleGeotagCapture} 
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= maxFiles}
          className="gap-2"
        >
          <ImagePlus className="h-4 w-4 text-blue-500" />
          Gallery
        </Button>

        <Button
          type="button"
          variant={recording ? "destructive" : "outline"}
          onClick={recording ? stopRecording : startRecording}
          disabled={files.length >= maxFiles && !recording}
          className="gap-2"
        >
          {recording ? (
            <>
              <Square className="h-4 w-4" /> Stop
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 text-purple-500" />
              Voice Note
            </>
          )}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        Max 10 minutes per voice note. Captured photos include GPS verification.
      </p>
    </div>
  );
}
