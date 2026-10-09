"use client";

import type { Submission } from "@/types";
import { WEEKDAYS, type Weekday } from "@/utils/centerHours";
import {
  hoursColor,
  minutesByDay,
  sortByFewestHours,
  weeklyMinutes,
  type Shift,
  type UsualHours,
} from "@/utils/planner";
import { HOURS_TONE, hoursText, usualHoursText } from "./format";

interface Props {
  tutors: Submission[];
  shifts: Shift[];
  usualHours: UsualHours | null;
  onOpenDay: (day: Weekday) => void;
}

const cell: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid #e2e8f0",
  textAlign: "right",
  whiteSpace: "nowrap",
};

/**
 * Every tutor's hours each day and for the week, so William can see at a
 * glance who is under, inside or over his usual hours, and the week's total
 * for the budget. Fewest hours first, like the tutor list.
 */
export default function WeekSummary({ tutors, shifts, usualHours, onOpenDay }: Props) {
  const totals = minutesByDay(shifts);
  const all = shifts.reduce((sum, s) => sum + s.end - s.start, 0);

  const dayButton = (day: Weekday, minutes: number, label: string) => (
    <button
      onClick={() => onOpenDay(day)}
      title={`Open ${day}`}
      aria-label={`${label}, ${day}: ${hoursText(minutes)}. Open ${day}`}
      style={{
        border: "none",
        background: "none",
        padding: 0,
        font: "inherit",
        color: minutes === 0 ? "#cbd5e1" : "inherit",
        cursor: "pointer",
      }}
    >
      {minutes === 0 ? "–" : hoursText(minutes)}
    </button>
  );

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "#64748b" }}>
        {usualHours === null
          ? "Set your usual hours above to color each tutor's week. Red is the 20-hour limit."
          : `Gray is under ${usualHoursText(usualHours)} hours, green is inside, amber is over. Red is the 20-hour limit.`}{" "}
        Click a day&apos;s hours to open that day.
      </p>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>
            <th style={{ ...cell, textAlign: "left" }}>Tutor</th>
            {WEEKDAYS.map((d) => (
              <th key={d} style={cell}>
                {d.slice(0, 3)}
              </th>
            ))}
            <th style={cell}>Week</th>
          </tr>
        </thead>
        <tbody>
          {sortByFewestHours(tutors, shifts).map((t) => {
            const byDay = minutesByDay(shifts, t.id);
            const week = weeklyMinutes(t.id, shifts);
            const tone = HOURS_TONE[hoursColor(week, usualHours)];
            return (
              <tr key={t.id}>
                <td style={{ ...cell, textAlign: "left", fontWeight: 600 }}>{t.name}</td>
                {WEEKDAYS.map((d) => (
                  <td key={d} style={cell}>
                    {dayButton(d, byDay[d], t.name)}
                  </td>
                ))}
                <td style={cell}>
                  <span
                    title={tone.label}
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: tone.bg,
                      color: tone.color,
                      fontWeight: 700,
                    }}
                  >
                    {hoursText(week)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 800 }}>
            <td style={{ ...cell, textAlign: "left", borderBottom: "none" }}>All tutors</td>
            {WEEKDAYS.map((d) => (
              <td key={d} style={{ ...cell, borderBottom: "none" }}>
                {dayButton(d, totals[d], "All tutors")}
              </td>
            ))}
            <td style={{ ...cell, borderBottom: "none" }}>{hoursText(all)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
