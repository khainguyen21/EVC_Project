"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import type { Submission } from "@/types";
import type { Weekday } from "@/utils/centerHours";
import { freeTimes, hoursColor, weeklyMinutes, type PlannerTutor, type Shift } from "@/utils/planner";
import { BUILDING_INFO, HOURS_TONE, courseLines, hoursText, timeRange } from "./format";

const badge = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "1px 8px",
  borderRadius: 999,
  background: bg,
  color,
  fontSize: "0.7rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
});

interface Props {
  submission: Submission;
  tutor: PlannerTutor;
  shifts: Shift[];
  day: Weekday;
  usualHours: number | null;
}

/** One tutor in the list on the left: who they are, what they cover, their week so far. */
export default function TutorCard({ submission, tutor, shifts, day, usualHours }: Props) {
  const week = weeklyMinutes(tutor.id, shifts);
  const tone = HOURS_TONE[hoursColor(week, usualHours)];
  const today = shifts
    .filter((s) => s.tutorId === tutor.id && s.day === day)
    .sort((a, b) => a.start - b.start);
  const free = freeTimes(tutor, day);
  const lines = courseLines(tutor.courses);

  return (
    <div
      style={{
        padding: "10px 12px",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        marginBottom: 8,
        background: "white",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: "0.88rem" }}>{submission.name}</strong>
        <span title={tone.label} style={{ ...badge(tone.bg, tone.color), alignSelf: "center" }}>
          {hoursText(week)}
          {usualHours !== null && ` / ${usualHours}`}
        </span>
      </div>

      {submission.status === "pending" && (
        <div style={{ marginTop: 4 }}>
          <span
            title="They resubmitted after you placed them. Approve them again in the inbox once you've checked their shifts."
            style={badge("#fffbeb", "#b45309")}
          >
            <RefreshCw size={11} /> Availability changed
          </span>
        </div>
      )}

      {lines.length > 0 ? (
        <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: 4 }}>
          {lines.join(" · ")}
        </div>
      ) : (
        <div style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: 4 }}>
          <AlertTriangle size={11} style={{ verticalAlign: "-1px" }} /> Fix their subjects in the
          inbox before placing them.
        </div>
      )}

      <div style={{ fontSize: "0.75rem", color: "#047857", marginTop: 2 }}>
        {free.length > 0
          ? `Free ${free.map((f) => timeRange(f.start, f.end)).join(", ")}`
          : `Not free ${day} anymore`}
      </div>

      {today.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 8px", marginTop: 4 }}>
          {today.map((s) => (
            <span
              key={s.id}
              style={{ fontSize: "0.72rem", fontWeight: 700, color: BUILDING_INFO[s.building].color }}
            >
              ● {s.building} {timeRange(s.start, s.end)}
            </span>
          ))}
        </div>
      )}

      {submission.notes && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "#64748b",
            fontStyle: "italic",
            marginTop: 4,
            whiteSpace: "pre-wrap",
          }}
        >
          “{submission.notes}”
        </div>
      )}
    </div>
  );
}
