"use client";

import { useState, useTransition } from "react";
import { toggleUpvote } from "@/app/dashboard/citizen/community/actions";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UpvoteButtonProps {
  complaintId: string;
  initialUpvotes: number;
  initiallyUpvoted: boolean;
}

export function UpvoteButton({ complaintId, initialUpvotes, initiallyUpvoted }: UpvoteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [upvoted, setUpvoted] = useState(initiallyUpvoted);
  const [upvotes, setUpvotes] = useState(initialUpvotes);

  const handleUpvote = () => {
    // Optimistic update
    const newUpvoted = !upvoted;
    setUpvoted(newUpvoted);
    setUpvotes((prev) => (newUpvoted ? prev + 1 : prev - 1));

    startTransition(async () => {
      const result = await toggleUpvote(complaintId);
      if (result.error) {
        // Revert on error
        setUpvoted(upvoted);
        setUpvotes(initialUpvotes);
        toast.error(result.error);
      }
    });
  };

  return (
    <button
      onClick={handleUpvote}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        upvoted
          ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      <ThumbsUp
        className={cn("h-4 w-4 transition-transform", upvoted && "scale-110 fill-current")}
      />
      <span>{upvotes}</span>
    </button>
  );
}
