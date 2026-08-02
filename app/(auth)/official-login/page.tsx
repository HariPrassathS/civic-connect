"use client";

import { useState } from "react";
import { login } from "../actions";
import { Shield, Lock, Mail, Loader2, Users, Building, MapPin, Briefcase, UserCog, User, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

const DEMO_ACCOUNTS = [
  { role: "Field Worker", email: "fieldworker@civicconnect.demo", icon: Users, color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
  { role: "Area Officer", email: "areaofficer@civicconnect.demo", icon: MapPin, color: "bg-green-500/10 text-green-500 hover:bg-green-500/20" },
  { role: "Dept Head", email: "depthead@civicconnect.demo", icon: Briefcase, color: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20" },
  { role: "Commissioner", email: "commissioner@civicconnect.demo", icon: Building, color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20" },
  { role: "District Collector", email: "collector@civicconnect.demo", icon: UserCheck, color: "bg-red-500/10 text-red-500 hover:bg-red-500/20" },
  { role: "Chief Secretary", email: "chiefsecretary@civicconnect.demo", icon: User, color: "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20" },
  { role: "Chief Minister", email: "chiefminister@civicconnect.demo", icon: Shield, color: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" },
  { role: "System Admin", email: "admin@civicconnect.demo", icon: UserCog, color: "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20" },
];

export default function OfficialLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | false>(false); // tracks which email is loading, or false

  async function handleLogin(formData: FormData, loadingKey: string) {
    setError(null);
    setLoading(loadingKey);

    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
      // If success, the login action will automatically redirect
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      // We don't unset loading here if successful because the page is redirecting
      // But if there's an error, we should stop loading
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Official Portal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access your administrative dashboard
          </p>
        </div>

        <Card className="border-border/50 shadow-2xl">
          <Tabs defaultValue="demo" className="w-full">
            <CardHeader className="pb-3 border-b border-border/10 mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="demo">Demo Quick Login</TabsTrigger>
                <TabsTrigger value="manual">Manual Login</TabsTrigger>
              </TabsList>
            </CardHeader>

            {error && (
              <div className="mx-6 mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 text-center">
                {error}
              </div>
            )}

            <TabsContent value="demo">
              <CardContent>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-foreground">Select your role to login</h3>
                  <p className="text-xs text-muted-foreground mt-1">One-click login using default seed credentials</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {DEMO_ACCOUNTS.map((account) => {
                    const Icon = account.icon;
                    const isSpinning = loading === account.email;
                    
                    return (
                      <form
                        key={account.role}
                        action={(formData) => handleLogin(formData, account.email)}
                      >
                        <input type="hidden" name="email" value={account.email} />
                        <input type="hidden" name="password" value="Password123!" />
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={loading !== false}
                          className={`w-full h-auto py-4 flex flex-col items-center gap-2 border-border/50 transition-all ${account.color}`}
                        >
                          {isSpinning ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <Icon className="h-6 w-6" />
                          )}
                          <span className="text-xs font-semibold">{account.role}</span>
                        </Button>
                      </form>
                    );
                  })}
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="manual">
              <CardContent>
                <form action={(formData) => handleLogin(formData, "manual")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Official Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="officer@civicconnect.gov"
                        required
                        className="pl-9"
                        disabled={loading !== false}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="pl-9"
                        disabled={loading !== false}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 mt-2"
                    disabled={loading !== false}
                  >
                    {loading === "manual" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="mr-2 h-4 w-4" />
                    )}
                    Sign in Manually
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Are you a citizen?{" "}
            <Link
              href="/login"
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Go to Citizen Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
