"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2, XCircle } from "lucide-react";
import { acceptResolution, rejectResolution } from "./resolution-actions";
import { toast } from "sonner";

export function ResolutionReviewBlock({ complaintId }: { complaintId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [view, setView] = useState<"initial" | "accept" | "reject">("initial");
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (rating === 0) {
      toast.error("Please provide a rating");
      return;
    }
    setLoading(true);
    const res = await acceptResolution(complaintId, rating, comment);
    setLoading(false);
    if (res.error) {
      toast.error("Error", { description: res.error });
    } else {
      toast.success("Feedback submitted", { description: "Complaint closed successfully." });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    setLoading(true);
    const res = await rejectResolution(complaintId, rejectReason);
    setLoading(false);
    if (res.error) {
      toast.error("Error", { description: res.error });
    } else {
      toast.success("Issue Reopened", { description: "The assigned officer has been notified." });
    }
  };

  if (view === "initial") {
    return (
      <div className="mb-6 rounded-xl border border-green-200 bg-green-50/50 p-5 dark:border-green-900/30 dark:bg-green-900/10">
        <h3 className="mb-2 text-lg font-semibold text-green-800 dark:text-green-400">
          Resolution Submitted
        </h3>
        <p className="mb-4 text-sm text-green-700 dark:text-green-300">
          The assigned official has marked this issue as resolved. Please review the work and confirm.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => setView("accept")} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Accept & Close
          </Button>
          <Button variant="outline" onClick={() => setView("reject")}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject & Reopen
          </Button>
        </div>
      </div>
    );
  }

  if (view === "accept") {
    return (
      <div className="mb-6 rounded-xl border bg-card p-5">
        <h3 className="mb-4 text-lg font-semibold">Provide Feedback</h3>
        <div className="mb-4 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-1 focus:outline-none"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(rating)}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hover || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Leave a comment (optional)..."
          className="mb-4"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex gap-3">
          <Button onClick={handleAccept} disabled={loading}>
            {loading ? "Submitting..." : "Submit Feedback"}
          </Button>
          <Button variant="ghost" onClick={() => setView("initial")} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/30 dark:bg-red-900/10">
      <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-400">
        Reject Resolution
      </h3>
      <p className="mb-4 text-sm text-red-700 dark:text-red-300">
        Please explain why the issue is not resolved. The task will be sent back to the assigned team.
      </p>
      <Textarea
        placeholder="Reason for rejection..."
        className="mb-4 bg-background"
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
      />
      <div className="flex gap-3">
        <Button variant="destructive" onClick={handleReject} disabled={loading}>
          {loading ? "Reopening..." : "Submit Rejection"}
        </Button>
        <Button variant="ghost" onClick={() => setView("initial")} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
