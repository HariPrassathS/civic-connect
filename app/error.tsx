"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 mb-6">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        An unexpected error occurred. Our team has been notified.
      </p>
      <Button className="mt-6" onClick={() => reset()}>
        Try Again
      </Button>
    </div>
  );
}
