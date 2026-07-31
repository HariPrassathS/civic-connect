import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "./email";
import { sendPush } from "./push";
import { sendSMS } from "./sms";
import type { NotificationChannel } from "@/types/database";

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  channels: NotificationChannel[];
  link?: string; // Optional URL to open when clicked
}

/**
 * Unified Notification Dispatcher.
 * Always writes to the DB (for the in-app bell) and then fans out to external channels.
 */
export async function dispatchNotification({
  userId,
  title,
  body,
  channels,
  link,
}: NotificationPayload) {
  const supabase = await createClient();

  // 1. Always ensure 'in_app' is triggered so it's logged in the DB
  const resolvedChannels = new Set(channels);
  resolvedChannels.add("in_app");

  // Fetch the user profile (we need email/phone/fcm_token for external channels)
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, fcm_token")
    .eq("id", userId)
    .single();

  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  const email = userData?.user?.email;

  // 2. Write to DB for in-app bell
  const { data: dbNotif, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      title,
      body,
      channel: "in_app", 
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert notification into DB:", error);
    return false;
  }

  // 3. Fan out to external channels (do not block on these)
  const promises: Promise<any>[] = [];

  if (resolvedChannels.has("email") && email) {
    promises.push(sendEmail(email, title, body));
  }

  if (resolvedChannels.has("sms") && profile?.phone) {
    promises.push(sendSMS(profile.phone, body));
  }

  if (resolvedChannels.has("push") && profile?.fcm_token) {
    promises.push(sendPush(profile.fcm_token, title, body, link));
  }

  // Await them in parallel (swallowing errors so one failure doesn't crash the loop)
  await Promise.allSettled(promises);

  return true;
}
