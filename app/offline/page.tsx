"use client";

import { useEffect, useState } from "react";
import { Shield, WifiOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="mb-4 text-lg text-muted-foreground">You are back online!</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-6">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">You&apos;re Offline</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        CivicConnect requires an internet connection. Please check your network
        and try again.
      </p>
      <Button
        className="mt-6"
        onClick={() => window.location.reload()}
      >
        Retry
      </Button>
      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-blue-600 to-cyan-500">
          <Shield className="h-3 w-3 text-white" />
        </div>
        CivicConnect TN
      </div>
    </div>
  );
}
