"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RefreshCw, Check, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface GeotagCameraProps {
  onCapture: (file: File, preview: string) => void;
  buttonLabel?: string;
}

export function GeotagCamera({ onCapture, buttonLabel = "Take Photo" }: GeotagCameraProps) {
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      setErrorMsg("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      // Get location
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          (err) => {
            setErrorMsg("Could not get location. Ensure permissions are granted.");
          },
          { enableHighAccuracy: true }
        );
      } else {
        setErrorMsg("Geolocation not supported on this device.");
      }
    } catch (err) {
      setErrorMsg("Camera access denied or unavailable.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [open, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Set canvas to actual video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw Geotag Overlay
    const timestamp = new Date().toLocaleString();
    const coordString = location 
      ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}` 
      : "Location Unknown";

    context.fillStyle = "rgba(0, 0, 0, 0.6)";
    context.fillRect(0, canvas.height - 70, canvas.width, 70);

    context.font = "bold 16px sans-serif";
    context.fillStyle = "#ffffff";
    context.fillText("CivicConnect TN - Verified Capture", 15, canvas.height - 45);
    
    context.font = "14px monospace";
    context.fillStyle = "#e2e8f0";
    context.fillText(`${timestamp} | ${coordString}`, 15, canvas.height - 20);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `geotag-${Date.now()}.jpg`, { type: "image/jpeg" });
        const preview = URL.createObjectURL(blob);
        onCapture(file, preview);
        setOpen(false);
      }
    }, "image/jpeg", 0.85);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 gap-2">
        <Camera className="h-4 w-4 text-emerald-500" />
        {buttonLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-500" />
            Live Geotag Camera
          </DialogTitle>
        </DialogHeader>
        <div className="relative flex aspect-[3/4] sm:aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-black">
          {errorMsg ? (
            <div className="p-4 text-center text-sm text-red-400">{errorMsg}</div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Overlay preview on the live view */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-3 text-xs text-white backdrop-blur-sm">
                <p className="font-semibold text-emerald-400">Live GPS Active</p>
                {location ? (
                  <p className="font-mono">Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</p>
                ) : (
                  <p className="animate-pulse text-yellow-300">Acquiring GPS...</p>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button 
            onClick={capturePhoto} 
            disabled={!!errorMsg} 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Camera className="mr-2 h-4 w-4" /> Capture Tagged Photo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
