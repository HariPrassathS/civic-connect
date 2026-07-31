"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ROLE_DASHBOARD_PATH } from "@/types/database";
import type { UserRole } from "@/types/database";

export type AuthResult = {
  error?: string;
  success?: string;
};

export async function login(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Get user's role to redirect to correct dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      const path =
        ROLE_DASHBOARD_PATH[profile.role as UserRole] || "/dashboard/citizen";
      redirect(path);
    }
  }

  redirect("/dashboard/citizen");
}

export async function signup(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const fullName = formData.get("full_name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const phone = (formData.get("phone") as string) || undefined;
  const role = "citizen";

  if (!fullName || !email || !password) {
    return { error: "Full name, email, and password are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
        role: role,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email verification is off, user is already logged in
  if (data.session) {
    const path = ROLE_DASHBOARD_PATH[role as UserRole] || "/dashboard/citizen";
    redirect(path);
  }

  return {
    success: "Account created! You can now log in.",
  };
}

export async function loginWithOtp(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const phone = formData.get("phone") as string;

  if (!phone) {
    return { error: "Phone number is required." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "OTP sent! Check your phone." };
}

export async function verifyOtp(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const phone = formData.get("phone") as string;
  const token = formData.get("token") as string;

  if (!phone || !token) {
    return { error: "Phone number and OTP are required." };
  }

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    return { error: error.message };
  }

  // Get user's role to redirect to correct dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      const path =
        ROLE_DASHBOARD_PATH[profile.role as UserRole] || "/dashboard/citizen";
      redirect(path);
    }
  }

  redirect("/dashboard/citizen");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
