"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Loader2, Eye, EyeOff } from "lucide-react";
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
import { login, loginWithOtp, verifyOtp } from "../actions";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState("");

  async function handleEmailLogin(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
      // If no error, the server action redirects
    } catch {
      // redirect() throws a NEXT_REDIRECT error — that's expected
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpRequest(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = await loginWithOtp(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setOtpSent(true);
        setPhone(formData.get("phone") as string);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpVerify(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      formData.set("phone", phone);
      const result = await verifyOtp(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect() throws
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
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Tabs defaultValue="email">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="email" className="flex-1 gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex-1 gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Phone OTP
            </TabsTrigger>
          </TabsList>

          {/* ── Email/Password Login ─────────────────── */}
          <TabsContent value="email">
            <form action={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="h-10 w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Login
              </Button>
            </form>
          </TabsContent>

          {/* ── Phone OTP Login ──────────────────────── */}
          <TabsContent value="phone">
            {!otpSent ? (
              <form action={handleOtpRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    required
                    className="h-10"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send OTP
                </Button>
              </form>
            ) : (
              <form action={handleOtpVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label>OTP sent to {phone}</Label>
                  <Input
                    id="token"
                    name="token"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    required
                    maxLength={6}
                    className="h-10 text-center text-lg tracking-widest"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify OTP
                </Button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Change phone number
                </button>
              </form>
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
