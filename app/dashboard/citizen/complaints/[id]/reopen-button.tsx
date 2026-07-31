"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface ReopenButtonProps {
  complaintId: string;
}

export function ReopenButton({ complaintId }: ReopenButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReopen() {
    startTransition(async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Update complaint status
      const { error } = await supabase
        .from("complaints")
        .update({ status: "received", escalation_level: 1 })
        .eq("id", complaintId)
        .eq("citizen_id", user.id);

      if (error) return;

      // Add audit trail
      await supabase.from("complaint_updates").insert({
        complaint_id: complaintId,
        actor_id: user.id,
        note: "Issue reopened by citizen",
        status_from: "closed",
        status_to: "received",
      });

      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReopen}
      disabled={isPending}
      className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RotateCcw className="h-3.5 w-3.5" />
      )}
      Reopen Issue
    </Button>
  );
}
