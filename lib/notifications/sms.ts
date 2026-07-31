/**
 * Twilio SMS stub interface. Hidden behind a feature flag so it can be enabled later.
 */
export async function sendSMS(toPhone: string, message: string) {
  const isEnabled = process.env.TWILIO_ENABLED === "true";
  
  if (!isEnabled) {
    console.log(`[SMS Stub] To: ${toPhone} | Msg: ${message}`);
    return true;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !fromPhone) {
    console.error("Twilio environment variables are missing.");
    return false;
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        To: toPhone,
        From: fromPhone,
        Body: message,
      }),
    });

    if (!res.ok) {
      console.error("Twilio API Error:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("SMS send failed:", err);
    return false;
  }
}
