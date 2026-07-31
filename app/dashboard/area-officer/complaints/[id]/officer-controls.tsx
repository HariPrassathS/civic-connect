"use client";

import { useState } from "react";
import { verifyResolution } from "./actions";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function OfficerControls({
  complaintId,
  currentStatus,
}: {
  complaintId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleVerify = async (approved: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verifyResolution(complaintId, approved, note);
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message || "Failed to update resolution");
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === "resolved" || currentStatus === "closed") {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Verification</h3>
        <p className="text-sm text-green-500 font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Resolution verified and approved
        </p>
      </div>
    );
  }

  if (currentStatus !== "resolution_submitted") {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Verification</h3>
        <p className="text-sm text-muted-foreground">Waiting for field worker to submit resolution.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-4 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Verify Resolution</h3>
      
      {error && <div className="text-sm text-red-500">{error}</div>}
      
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Verification Note (Optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add your comments here..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          rows={3}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => handleVerify(true)}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Approve Resolution
        </button>
        <button
          onClick={() => handleVerify(false)}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Reject (Needs Rework)
        </button>
      </div>
    </div>
  );
}
