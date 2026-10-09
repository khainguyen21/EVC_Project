"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import AvailabilityForm from "./AvailabilityForm";
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
        <div className="info-section__highlight">
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={22} /> Thanks, {input.name.split(" ")[0]}!
          </h3>
          <p>
            {resubmitted
              ? `Your ${termName} availability has been updated. This replaces what you sent before.`
              : `William has your ${termName} availability.`}{" "}
            Need to change something? Open the same link again and resubmit
            with the same student ID.
          </p>
        </div>

        <h3 style={{ color: "var(--primary-color)", margin: "20px 0 12px 0" }}>
          What you sent
        </h3>
        <ul className="info-section__list">
          <li className="info-section__list-item">
            <strong>Student ID:</strong> {input.studentId}
          </li>
          <li className="info-section__list-item">
            <strong>Subjects:</strong> {input.subjects}
          </li>
          <li className="info-section__list-item">
            <strong>Availability:</strong>{" "}
            {resolveAvailability(input.availability, hours)
              .map(
                (r) =>
                  `${r.day} ${formatHour(r.start)}–${formatHour(r.end)}${r.allDay ? " (all day)" : ""}`,
              )
              .join("; ")}
          </li>
          <li className="info-section__list-item">
            <strong>Units:</strong> {input.units}
          </li>
          <li className="info-section__list-item">
            <strong>II 90 training:</strong>{" "}
            {input.trainingDone ? "Done" : "Not yet"}
          </li>
        </ul>
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
