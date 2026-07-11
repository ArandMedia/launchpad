import { db } from "./db";

// Called whenever a milestone completes or a client-visible update is posted.
// Keeps a NotificationLog row so you always have an audit trail of what
// clients were told and when — important once you're managing hundreds
// of active client relationships at once.

export async function notifyClient({
  projectId,
  recipientEmail,
  subject,
  body,
}: {
  projectId: string;
  recipientEmail: string;
  subject: string;
  body: string;
}) {
  let success = true;

  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — skipping actual send (dev mode)");
    } else {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.NOTIFY_FROM_EMAIL || "updates@arandmedia.com",
          to: recipientEmail,
          subject,
          html: body,
        }),
      });
      success = res.ok;
    }
  } catch (err) {
    console.error("Notification send failed:", err);
    success = false;
  }

  await db.notificationLog.create({
    data: {
      channel: "EMAIL",
      recipient: recipientEmail,
      subject,
      projectId,
      success,
    },
  });

  return success;
}

// SMS is a placeholder — wire up Twilio here when you're ready for day-one SMS.
export async function notifyClientSMS(_args: {
  projectId: string;
  phone: string;
  message: string;
}) {
  console.warn("SMS notifications not yet configured — add Twilio integration here.");
}
