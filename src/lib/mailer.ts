import "server-only";
import nodemailer from "nodemailer";
import { submissionAlertMessage, type SubmissionAlert } from "@/utils/submissionAlert";

/**
 * Email goes out through the site's own Gmail account with an app password
 * (see .env.example). Only the live site sends: anywhere else the email is
 * printed to the terminal, so a test submission never reaches William.
 */

type MailEnv = Partial<
  Record<"NODE_ENV" | "GMAIL_USER" | "GMAIL_APP_PASSWORD" | "ALERT_EMAIL", string>
>;

export type MailTransport = {
  sendMail(message: {
    from: { name: string; address: string };
    to: string;
    replyTo: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
};

export function mailSettings(env: MailEnv) {
  const user = env.GMAIL_USER?.trim();
  // Google shows app passwords in groups of four; the spaces aren't part of it.
  const pass = env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  const alertTo = env.ALERT_EMAIL?.trim();
  return user && pass && alertTo ? { user, pass, alertTo } : null;
}

function gmail(user: string, pass: string): MailTransport {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    // A stuck connection must not hold the request open for minutes.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

/**
 * Tells William a tutor sent or updated their availability. Never throws:
 * the submission is already saved, and a failed email must not undo that.
 */
export async function sendSubmissionAlert(
  alert: SubmissionAlert,
  env: MailEnv = process.env,
  transport?: MailTransport,
): Promise<"sent" | "printed" | "skipped" | "failed"> {
  const { subject, text } = submissionAlertMessage(alert);

  if (env.NODE_ENV !== "production") {
    console.info(`[submission alert] Not sent outside the live site. It would say:\n${subject}\n\n${text}`);
    return "printed";
  }

  const settings = mailSettings(env);
  if (!settings) {
    console.warn(
      "[submission alert] Not sent: GMAIL_USER, GMAIL_APP_PASSWORD or ALERT_EMAIL is not set.",
    );
    return "skipped";
  }

  try {
    await (transport ?? gmail(settings.user, settings.pass)).sendMail({
      from: { name: "EVC Tutoring", address: settings.user },
      to: settings.alertTo,
      replyTo: alert.email,
      subject,
      text,
    });
    console.info(`[submission alert] Sent: ${subject}`);
    return "sent";
  } catch (error) {
    // Only the message: the error object can carry SMTP details we don't want in logs.
    console.error(
      "[submission alert] Gmail refused it:",
      error instanceof Error ? error.message : String(error),
    );
    return "failed";
  }
}
