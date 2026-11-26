import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { mailSettings, sendSubmissionAlert, type MailTransport } from "./mailer";
import type { SubmissionAlert } from "@/utils/submissionAlert";

const alert: SubmissionAlert = {
  name: "Sam Tutor",
  email: "sam@example.com",
  termName: "Spring 2027",
  resubmitted: false,
  hadShifts: false,
  subjects: "MATH 63",
  units: 12,
  flags: [],
};

const env = {
  NODE_ENV: "production",
  GMAIL_USER: "site@example.com",
  GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop",
  ALERT_EMAIL: "boss@example.edu",
} as const;

function fakeTransport(result: "ok" | Error = "ok") {
  const sendMail = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return { messageId: "<1@example.com>" };
  });
  const transport: MailTransport = { sendMail };
  return { transport, sendMail };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mailSettings", () => {
  it("reads the three settings and drops the spaces Google shows in app passwords", () => {
    expect(mailSettings(env)).toEqual({
      user: "site@example.com",
      pass: "abcdefghijklmnop",
      alertTo: "boss@example.edu",
    });
  });

  it.each(["GMAIL_USER", "GMAIL_APP_PASSWORD", "ALERT_EMAIL"] as const)(
    "is null when %s is missing or blank",
    (key) => {
      expect(mailSettings({ ...env, [key]: undefined })).toBeNull();
      expect(mailSettings({ ...env, [key]: "   " })).toBeNull();
    },
  );
});

describe("sendSubmissionAlert", () => {
  it("sends from the site's Gmail to William, with replies going to the tutor", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const { transport, sendMail } = fakeTransport();
    await expect(sendSubmissionAlert(alert, env, transport)).resolves.toBe("sent");
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({
      from: { name: "EVC Tutoring", address: "site@example.com" },
      to: "boss@example.edu",
      replyTo: "sam@example.com",
      subject: "New availability: Sam Tutor (Spring 2027)",
      text: expect.stringContaining("Sam Tutor sent their availability"),
    });
  });

  it("only prints the email outside production, so test runs never reach William", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { transport, sendMail } = fakeTransport();
    const result = await sendSubmissionAlert(alert, { ...env, NODE_ENV: "development" }, transport);
    expect(result).toBe("printed");
    expect(sendMail).not.toHaveBeenCalled();
    expect(String(info.mock.calls[0]?.[0])).toContain("New availability: Sam Tutor");
  });

  it("skips quietly when a setting is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { transport, sendMail } = fakeTransport();
    const result = await sendSubmissionAlert(alert, { ...env, ALERT_EMAIL: undefined }, transport);
    expect(result).toBe("skipped");
    expect(sendMail).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("never throws when Gmail refuses, and never logs the password", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { transport } = fakeTransport(new Error("Invalid login: 535-5.7.8"));
    await expect(sendSubmissionAlert(alert, env, transport)).resolves.toBe("failed");
    expect(error).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).toContain("535-5.7.8");
    expect(logged).not.toContain("abcd");
  });
});
