/**
 * Sends a push notification via Firebase Cloud Messaging HTTP v1 API.
 * This requires a service account credential or Google Auth library,
 * but for this stub we just log it if config is missing.
 */
export async function sendPush(token: string, title: string, body: string, link?: string) {
  const serverKey = process.env.FCM_SERVER_KEY;
  
  if (!serverKey) {
    console.log(`[Push Stub] To Token: ${token} | Subj: ${title}`);
    return true;
  }

  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
        },
        data: {
          click_action: link || "/",
        },
      }),
    });

    if (!res.ok) {
      console.error("FCM API Error:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Push send failed:", err);
    return false;
  }
}
