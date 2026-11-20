import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getMailFrom, getSmtpUrl } from "@/server/lib/config";
import { logUnexpectedError } from "@/server/lib/log";

// Notification's Email Service, over SMTP (design/par.md): Mailpit outside production,
// Resend's SMTP interface in production, chosen only by SMTP_URL. Emails go to parents
// only and never carry child data (CI-email-parent, §8.1 Sensitive data).

export type EmailMessage = { to: string; subject: string; text: string };

/** `ok` only; a failure's exception never leaves this module (§8.2.1). */
export type SendResult = { ok: boolean };

let transport: { url: string; transporter: Transporter } | undefined;

function transporterFor(url: string): Transporter {
  if (transport?.url !== url) {
    transport = { url, transporter: nodemailer.createTransport(url) };
  }
  return transport.transporter;
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const url = getSmtpUrl();
  if (!url) {
    // Production without SMTP_URL: refuse rather than drop the email silently.
    logUnexpectedError("sendEmail: no SMTP_URL configured", null);
    return { ok: false };
  }
  try {
    await transporterFor(url).sendMail({
      from: getMailFrom(),
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return { ok: true };
  } catch (err) {
    // The recipient and the body are never logged (§8.2.7).
    logUnexpectedError("sendEmail", err);
    return { ok: false };
  }
}
