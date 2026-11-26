/**
 * The email William gets each time a tutor sends or updates their
 * availability. He doesn't check the dashboard out of habit, so this tells him
 * there is something to review and links him to it.
 *
 * Plain text only: Outlook makes the link clickable, and tutor-typed text
 * never has to be escaped into HTML. The student ID and William's usual hours
 * are never part of it.
 */
import { SUBMISSION_FLAG_LABELS, type SubmissionFlag } from "./submission";

/** Always the live site, so an alert sent from a test run still opens the real inbox. */
export const INBOX_URL = "https://evctutoring.com/admin/availability";

export type SubmissionAlert = {
  name: string;
  /** Becomes the Reply-To, so William can answer the tutor directly. */
  email: string;
  termName: string;
  resubmitted: boolean;
  /** The tutor already had planner shifts, which now carry "Availability changed". */
  hadShifts: boolean;
  subjects: string;
  units: number;
  flags: SubmissionFlag[];
};

/** Tutor-typed text on one line: no line breaks or control characters. */
function oneLine(text: string): string {
  return text
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function submissionAlertMessage(alert: SubmissionAlert): { subject: string; text: string } {
  const name = oneLine(alert.name);
  const term = oneLine(alert.termName);

  const subject = `${alert.resubmitted ? "Updated" : "New"} availability: ${name} (${term})`;

  const opening = alert.resubmitted
    ? [
        `${name} updated their availability for ${term}. The new answers replace their old ones.`,
        ...(alert.hadShifts
          ? ["They already have shifts on the planner, so check those shifts still fit."]
          : []),
      ]
    : [`${name} sent their availability for ${term}.`];

  const details = [
    `Subjects: ${oneLine(alert.subjects)}`,
    `Units: ${alert.units}`,
    ...(alert.flags.length > 0
      ? [`Needs a look: ${alert.flags.map((f) => SUBMISSION_FLAG_LABELS[f]).join(", ")}`]
      : []),
  ];

  const text = [
    ...opening,
    "",
    ...details,
    "",
    "Open Tutor Availability to review it:",
    INBOX_URL,
    "",
    `Reply to this email to write to ${name}.`,
    "",
    "Sent automatically by the EVC tutoring schedule site.",
  ].join("\n");

  return { subject, text };
}
