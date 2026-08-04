type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type EmailDeliveryResult =
  | { delivered: true; provider: "resend" }
  | { delivered: false; provider: "development"; reason: string };

export async function sendAuthEmail(input: SendEmailInput): Promise<EmailDeliveryResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim() || "BluePass <onboarding@resend.dev>";

  if (!resendApiKey) {
    console.info("auth.email.development_link", {
      to: input.to,
      subject: input.subject,
      text: input.text,
    });

    return {
      delivered: false,
      provider: "development",
      reason: "RESEND_API_KEY is not configured.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const message = `Unable to send auth email: ${response.status} ${body}`.trim();

    if (process.env.NODE_ENV !== "production") {
      console.warn("auth.email.development_fallback", {
        to: input.to,
        subject: input.subject,
        message,
      });

      return {
        delivered: false,
        provider: "development",
        reason: message,
      };
    }

    throw new Error(message);
  }

  return { delivered: true, provider: "resend" };
}
