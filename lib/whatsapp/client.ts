export async function sendWhatsAppMessage(to: string, message: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId || token === "your_meta_whatsapp_token_here") {
    console.error("WhatsApp API credentials are not configured properly.");
    return false;
  }

  const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error sending WhatsApp message via Meta API:", data);
      return false;
    }

    console.log(`WhatsApp message sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("Fetch error sending WhatsApp message:", error);
    return false;
  }
}
