"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Request notification permissions and save the FCM token to the profile.
 * Note: Requires the firebase app to be initialized with valid config in the environment.
 */
export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    console.log("Notification permission granted.");
    // In a real Firebase setup, you would initialize Firebase app here
    // and call getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY })
    
    // Stub implementation:
    const token = "stub-fcm-token-" + Math.random().toString(36).substring(7);
    
    // Save to profile
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase
        .from("profiles")
        .update({ fcm_token: token })
        .eq("id", user.id);
      console.log("FCM token saved to profile");
    }
  } else {
    console.log("Notification permission denied.");
  }
}
