const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "onboarding@resend.dev";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM;

async function sendEmail({ to, subject, text, html }) {
  if (!RESEND_API_KEY) {
    console.log(
      `[notify:email] (no RESEND_API_KEY) to=${to} subject="${subject}" body=${text}`
    );
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[notify:email] Resend error", response.status, body);
    throw new Error("Email sending failed");
  }
  return response.json();
}

async function sendSMS({ to, body }) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    console.log(`[notify:sms] (no twilio creds) to=${to} body=${body}`);
    return { skipped: true };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
      ).toString("base64")}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[notify:sms] Twilio error", response.status, errBody);
    throw new Error("SMS sending failed");
  }
  return response.json();
}

module.exports = { sendEmail, sendSMS };
