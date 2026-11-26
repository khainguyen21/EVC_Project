import { describe, expect, it } from "vitest";
import {
  INBOX_URL,
  submissionAlertMessage,
  type SubmissionAlert,
} from "./submissionAlert";

const alert: SubmissionAlert = {
  name: "Sam Tutor",
  email: "sam@example.com",
  termName: "Spring 2027",
  resubmitted: false,
  hadShifts: false,
  subjects: "COMSC-020, COMSC-075",
  units: 17,
  flags: [],
};

describe("submissionAlertMessage", () => {
  it("names the tutor and the term for a new submission", () => {
    const { subject, text } = submissionAlertMessage(alert);
    expect(subject).toBe("New availability: Sam Tutor (Spring 2027)");
    expect(text).toContain("Sam Tutor sent their availability for Spring 2027.");
    expect(text).not.toContain("updated");
  });

  it("says a resubmission is an update that replaced the old answers", () => {
    const { subject, text } = submissionAlertMessage({ ...alert, resubmitted: true });
    expect(subject).toBe("Updated availability: Sam Tutor (Spring 2027)");
    expect(text).toContain("Sam Tutor updated their availability for Spring 2027.");
    expect(text).toContain("replace");
    expect(text).not.toContain("shifts");
  });

  it("warns when the tutor already had shifts on the planner", () => {
    const { text } = submissionAlertMessage({ ...alert, resubmitted: true, hadShifts: true });
    expect(text).toContain("already have shifts on the planner");
  });

  it("links to the Tutor Availability inbox on the live site", () => {
    expect(INBOX_URL).toBe("https://evctutoring.com/admin/availability");
    expect(submissionAlertMessage(alert).text).toContain(INBOX_URL);
  });

  it("lists subjects and units", () => {
    const { text } = submissionAlertMessage({ ...alert, units: 12.5 });
    expect(text).toContain("Subjects: COMSC-020, COMSC-075");
    expect(text).toContain("Units: 12.5");
  });

  it("lists flags with the inbox's own words, and nothing when there are none", () => {
    expect(submissionAlertMessage(alert).text).not.toContain("Needs a look");
    const { text } = submissionAlertMessage({
      ...alert,
      units: 3,
      flags: ["under-units", "subjects-need-review"],
    });
    expect(text).toContain("Needs a look: Under 6 units, Subjects need review");
  });

  it("says replies go to the tutor", () => {
    expect(submissionAlertMessage(alert).text).toContain("Reply to this email to write to Sam Tutor.");
  });

  it("keeps typed line breaks and control characters out of the subject and lines", () => {
    const { subject, text } = submissionAlertMessage({
      ...alert,
      name: "Sam\r\nBcc: someone@example.com\u0000  Tutor",
      subjects: "MATH 63,\nMATH 71\t\tPHYS 4A",
    });
    expect(subject).toBe("New availability: Sam Bcc: someone@example.com Tutor (Spring 2027)");
    expect(subject).not.toMatch(/[\r\n\u0000]/);
    expect(text).toContain("Subjects: MATH 63, MATH 71 PHYS 4A");
    expect(text.split("\n")[0]).toBe(
      "Sam Bcc: someone@example.com Tutor sent their availability for Spring 2027.",
    );
  });

  it("treats Unicode line separators like line breaks", () => {
    const { subject } = submissionAlertMessage({ ...alert, name: "Sam\u2028Tutor\u2029" });
    expect(subject).toBe("New availability: Sam Tutor (Spring 2027)");
  });

  it("never mentions William's usual hours", () => {
    for (const flags of [[], ["under-units"]] as const) {
      for (const resubmitted of [false, true]) {
        const { text } = submissionAlertMessage({ ...alert, flags: [...flags], resubmitted, hadShifts: resubmitted });
        expect(text.toLowerCase()).not.toContain("usual");
        expect(text.toLowerCase()).not.toContain("hours");
      }
    }
  });
});
