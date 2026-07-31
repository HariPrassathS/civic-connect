/**
 * Minimal Resend API integration via fetch to avoid heavy SDK dependencies.
 */
export async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[Email Stub] To: ${to} | Subj: ${subject}`);
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Civic Connect <notifications@civicconnect.com>", // You must verify this domain in Resend
        to: [to],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      console.error("Resend API Error:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email send failed:", err);
    return false;
  }
}
