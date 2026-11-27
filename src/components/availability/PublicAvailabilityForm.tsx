"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import AvailabilityForm from "./AvailabilityForm";
import sign from "@/components/SchedulePage.module.css";
import styles from "@/components/PublicPage.module.css";
import { formatHour, type BuildingHours } from "@/utils/centerHours";
import {
  resolveAvailability,
  type SubmissionInput,
} from "@/utils/submission";

interface Props {
  code: string;
  termName: string;
  hours: BuildingHours;
}

interface Receipt {
  input: SubmissionInput;
  resubmitted: boolean;
}

export default function PublicAvailabilityForm({ code, termName, hours }: Props) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const submit = async (input: SubmissionInput, honeypot: string) => {
    let res: Response;
    try {
      res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, code, website: honeypot }),
      });
    } catch {
      throw new Error("Network error. Check your connection and try again.");
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.error ?? `Something went wrong (${res.status}).`);
    }
    setReceipt({ input, resubmitted: Boolean(body?.resubmitted) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (receipt) {
    const { input, resubmitted } = receipt;
    return (
      <div>
        <div className={styles.callout} role="status">
          <h2 className={styles.boxTitle}>
            <CheckCircle2
              className={styles.boxTitleIcon}
              size={24}
              aria-hidden="true"
            />
            Thanks, {input.name.split(" ")[0]}!
          </h2>
          <p className={styles.boxText}>
            {resubmitted
              ? `Your ${termName} availability has been updated. This replaces what you sent before.`
              : `William has your ${termName} availability.`}{" "}
            Need to change something? Open the same link again and resubmit
            with the same student ID.
          </p>
        </div>

        <section className={styles.section} aria-labelledby="sent-title">
          <div className={sign.subjectHead}>
            <h2 id="sent-title" className={sign.subjectTitle}>
              What you sent
            </h2>
          </div>
          <dl className={styles.details}>
            <dt>Student ID</dt>
            <dd>{input.studentId}</dd>
            <dt>Subjects</dt>
            <dd>{input.subjects}</dd>
            <dt>Availability</dt>
            <dd>
              {/* One day per line reads faster than one long run. */}
              {resolveAvailability(input.availability, hours).map((r, i) => (
                <div key={i}>
                  {`${r.day} ${formatHour(r.start)}–${formatHour(r.end)}${r.allDay ? " (all day)" : ""}`}
                </div>
              ))}
            </dd>
            <dt>Units</dt>
            <dd>{input.units}</dd>
            <dt>II 90 training</dt>
            <dd>{input.trainingDone ? "Done" : "Not yet"}</dd>
          </dl>
        </section>
      </div>
    );
  }

  return (
    <AvailabilityForm
      hours={hours}
      publicForm
      submitLabel="Send my availability"
      onSubmit={submit}
    />
  );
}
