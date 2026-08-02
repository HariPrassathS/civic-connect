"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Loader2, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendMagicLink } from "../actions";
import { signInWithPopup } from "firebase/auth";
import { getFirebase } from "@/lib/firebase/config";
import { createBrowserClient } from "@supabase/ssr";

// Google SVG icon
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// Telegram SVG icon
function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141a.506.506 0 01.171.325c.016.093.036.306.02.472z"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Telegram OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  // ─── Google Sign-In (Firebase) ──────────────────────────────
  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    try {
      const { auth, googleProvider } = await getFirebase();
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Bridge Firebase user to Supabase
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Google sign-in failed.");
        return;
      }

      // Use the token_hash to verify OTP and create a Supabase session
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: data.token_hash,
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      router.push("/dashboard/citizen");
      router.refresh();
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        // User closed the popup, not an error
        return;
      }
      console.error("Google login error:", err);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  // ─── Magic Link ─────────────────────────────────────────────
  async function handleMagicLink(formData: FormData) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await sendMagicLink(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.success);
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── Telegram OTP Send ─────────────────────────────────────
  async function handleTelegramOtpSend() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send OTP.");
      } else {
        setOtpSent(true);
        setSuccess("OTP sent to your Telegram! Check @Civic_ai_complaint_bot");
      }
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Telegram OTP Verify ───────────────────────────────────
  async function handleTelegramOtpVerify() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/telegram/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed.");
        return;
      }

      // Use the token_hash to create a Supabase session
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: data.token_hash,
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      router.push("/dashboard/citizen");
      router.refresh();
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>
          Log in to your Civic Connect account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* ── Google Sign-In ──────────────────────── */}
        <Button
          id="google-login-btn"
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="h-11 w-full gap-3 border-border/50 bg-white text-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Sign in with Google
        </Button>

        {/* ── Divider ─────────────────────────────── */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/40" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or continue with</span>
          </div>
        </div>

        {/* ── Email Magic Link & Telegram OTP Tabs ── */}
        <Tabs defaultValue="email">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="email" className="flex-1 gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email Link
            </TabsTrigger>
            <TabsTrigger value="telegram" className="flex-1 gap-1.5">
              <TelegramIcon />
              Telegram OTP
            </TabsTrigger>
          </TabsList>

          {/* ── Email Magic Link ─────────────────── */}
          <TabsContent value="email">
            <form action={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email Address</Label>
                <Input
                  id="magic-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="h-10"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="h-10 w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Magic Link
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                We&apos;ll send a login link to your email — no password needed!
              </p>
            </form>
          </TabsContent>

          {/* ── Telegram OTP ─────────────────────── */}
          <TabsContent value="telegram">
            {!otpSent ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tg-phone">Phone Number</Label>
                  <Input
                    id="tg-phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleTelegramOtpSend}
                  disabled={loading || !phone}
                  className="h-10 w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TelegramIcon />
                  )}
                  Send Telegram OTP
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  You must have started <span className="font-medium text-blue-400">@Civic_ai_complaint_bot</span> on Telegram first.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>OTP sent via Telegram to {phone}</Label>
                  <Input
                    id="tg-otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    className="h-10 text-center text-lg tracking-widest"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleTelegramOtpVerify}
                  disabled={loading || otp.length !== 6}
                  className="h-10 w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify OTP
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setSuccess(null);
                  }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Change phone number
                </button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-500 transition-colors hover:text-blue-400"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
