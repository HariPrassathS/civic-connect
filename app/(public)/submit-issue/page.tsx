"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Send,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryPicker } from "@/components/complaints/category-picker";
import { LocationPicker } from "@/components/complaints/location-picker";
import {
  MediaUpload,
  type PendingFile,
} from "@/components/complaints/media-upload";
import { submitIssue } from "./actions";

export default function SubmitIssuePage() {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      // Add controlled state values
      if (categoryId) formData.set("category_id", categoryId);
      formData.set("lat", lat.toString());
      formData.set("lng", lng.toString());
      formData.set("visibility", visibility);

      // Add media files
      formData.delete("media");
      for (const f of files) {
        formData.append("media", f.file);
      }

      const result = await submitIssue(formData);
      if (result?.error) {
        setError(result.error);
      }
      // On success, server action redirects
    } catch {
      // redirect() throws NEXT_REDIRECT — expected
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-cyan-500">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold">Submit Issue</span>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Pothole on MG Road near Bus Stop"
              required
              className="h-10"
            />
          </div>

          {/* Category */}
          <CategoryPicker
            onSelect={setCategoryId}
            selectedId={categoryId}
          />

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Describe the issue in detail — what, where, how long it's been like this..."
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          {/* Location */}
          <LocationPicker
            onLocationChange={(newLat, newLng) => {
              setLat(newLat);
              setLng(newLng);
            }}
          />

          {/* Media */}
          <MediaUpload files={files} onChange={setFiles} />

          {/* Visibility */}
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              {visibility === "public" ? (
                <Eye className="h-5 w-5 text-blue-500" />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {visibility === "public"
                    ? "Public Issue"
                    : "Private Issue"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {visibility === "public"
                    ? "Visible to all citizens and officials"
                    : "Only visible to you and assigned officials"}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={visibility === "public"}
              onClick={() =>
                setVisibility(visibility === "public" ? "private" : "public")
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                visibility === "public" ? "bg-blue-600" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                  visibility === "public"
                    ? "translate-x-5"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            Submit Issue
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Not logged in?{" "}
          <Link href="/login" className="text-blue-500 hover:text-blue-400">
            Sign in first
          </Link>{" "}
          to track your issue after submission.
        </p>
      </main>
    </div>
  );
}
