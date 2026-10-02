"use client";

import { AlertTriangle } from "lucide-react";
import { CENTER_HOURS, hhmmToMinutes, type Weekday } from "@/utils/centerHours";
import { formatCourseCode } from "@/utils/courseCodes";
import {
  BUILDINGS,
  COVERAGE_GOAL,
  OPEN_LAB,
  STEP_MINUTES,
  addsNothingNew,
  buildingWeeklyMinutes,
  coverageAt,
  shiftWarnings,
  type Building,
  type Coverage,
  type PlannerTutor,
  type Shift,
} from "@/utils/planner";
import { BUILDING_INFO, clock, hoursText, timeRange } from "./format";

/** Height of one 15-minute step on the board. */
const STEP_H = 14;
const STRIP_W = 10;

const WARNING_TEXT = {
  "outside-availability": "Outside their availability",
  "wrong-building": "None of their courses are taught here",
  "unknown-subjects": "Their subjects need review in the inbox",
  "same-subjects": "Someone here already covers all their courses",
} as const;

/** Red when nobody is on, amber below the goal, green at it. */
function coverageColor(c: Coverage): string {
  if (c.count === 0) return "#fecaca";
  return c.count < c.goal ? "#fde68a" : "#86efac";
}

function coverageTitle(c: Coverage, minute: number): string {
  const courses = c.courses.map((code) =>
    code === OPEN_LAB ? "Open Computer Lab" : formatCourseCode(code),
  );
  return `${clock(minute)}: ${c.count} on, goal ${c.goal}${
    courses.length > 0 ? ` — ${courses.join(", ")}` : " — nobody here"
  }`;
}

/**
 * Side-by-side lanes for shifts that overlap in the same building. Each group
 * of overlapping shifts splits the width on its own, so a shift alone later in
 * the day gets the full column.
 */
function lanes(list: Shift[]) {
  const sorted = [...list].sort((a, b) => a.start - b.start || a.end - b.end);
  const placed = new Map<string, { lane: number; of: number }>();
  let group: Shift[] = [];
  let laneEnds: number[] = [];
  const closeGroup = () => {
    for (const s of group) placed.get(s.id)!.of = laneEnds.length;
    group = [];
    laneEnds = [];
  };
  for (const s of sorted) {
    if (group.length > 0 && laneEnds.every((end) => end <= s.start)) closeGroup();
    let i = laneEnds.findIndex((end) => end <= s.start);
    if (i === -1) {
      i = laneEnds.length;
      laneEnds.push(s.end);
    } else {
      laneEnds[i] = s.end;
    }
    placed.set(s.id, { lane: i, of: 0 });
    group.push(s);
  }
  closeGroup();
  return placed;
}

interface Props {
  tutors: PlannerTutor[];
  names: Map<number, string>;
  shifts: Shift[];
  day: Weekday;
}

/** Buildings as columns and time running down, for one day. */
export default function RoomBoard({ tutors, names, shifts, day }: Props) {
  const open = hhmmToMinutes(CENTER_HOURS[day].open);
  const close = hhmmToMinutes(CENTER_HOURS[day].close);
  const steps: number[] = [];
  for (let m = open; m < close; m += STEP_MINUTES) steps.push(m);
  const height = steps.length * STEP_H;
  const y = (minute: number) => ((minute - open) / STEP_MINUTES) * STEP_H;

  const today = shifts.filter((s) => s.day === day);
  const weekTotals = buildingWeeklyMinutes(shifts);
  const tutorById = new Map(tutors.map((t) => [t.id, t]));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `52px repeat(${BUILDINGS.length}, minmax(150px, 1fr))`,
        columnGap: 12,
        minWidth: 52 + BUILDINGS.length * 162,
      }}
    >
      <div />
      {BUILDINGS.map((b) => (
        <div key={b} style={{ paddingBottom: 10 }}>
          <div style={{ fontWeight: 800, color: BUILDING_INFO[b].color, fontSize: "0.95rem" }}>
            {b}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
            {BUILDING_INFO[b].name} · goal {COVERAGE_GOAL[b]}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
            {hoursText(weekTotals[b])} planned this week
          </div>
        </div>
      ))}

      <div style={{ position: "relative", height }}>
        {steps
          .filter((m) => m % 60 === 0)
          .map((m) => (
            <span
              key={m}
              style={{
                position: "absolute",
                top: y(m) - 7,
                right: 0,
                fontSize: "0.72rem",
                color: "#94a3b8",
                whiteSpace: "nowrap",
              }}
            >
              {clock(m)}
            </span>
          ))}
      </div>

      {BUILDINGS.map((b) => (
        <BuildingColumn
          key={b}
          building={b}
          day={day}
          steps={steps}
          height={height}
          y={y}
          tutors={tutors}
          tutorById={tutorById}
          names={names}
          shifts={shifts}
          today={today.filter((s) => s.building === b)}
        />
      ))}
    </div>
  );
}

function BuildingColumn({
  building,
  day,
  steps,
  height,
  y,
  tutors,
  tutorById,
  names,
  shifts,
  today,
}: {
  building: Building;
  day: Weekday;
  steps: number[];
  height: number;
  y: (minute: number) => number;
  tutors: PlannerTutor[];
  tutorById: Map<number, PlannerTutor>;
  names: Map<number, string>;
  shifts: Shift[];
  today: Shift[];
}) {
  const placed = lanes(today);
  const color = BUILDING_INFO[building].color;

  return (
    <div style={{ display: "flex", gap: 4, height }}>
      <div style={{ width: STRIP_W, flexShrink: 0 }}>
        {steps.map((m) => {
          const c = coverageAt(tutors, shifts, building, day, m);
          return (
            <div
              key={m}
              title={coverageTitle(c, m)}
              style={{
                height: STEP_H,
                background: coverageColor(c),
                borderTop: m % 60 === 0 ? "1px solid white" : undefined,
                boxSizing: "border-box",
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          position: "relative",
          flex: 1,
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          background: `repeating-linear-gradient(to bottom, #f8fafc 0 ${STEP_H * 4 - 1}px, #e2e8f0 ${
            STEP_H * 4 - 1
          }px ${STEP_H * 4}px)`,
        }}
      >
        {today.map((s) => {
          const tutor = tutorById.get(s.tutorId);
          const warnings = [
            ...(tutor ? shiftWarnings(s, tutor) : []),
            ...(tutor && addsNothingNew(s, tutors, shifts) ? (["same-subjects"] as const) : []),
          ];
          const outside = warnings.includes("outside-availability");
          const { lane: i, of: count } = placed.get(s.id) ?? { lane: 0, of: 1 };
          const name = names.get(s.tutorId) ?? "Unknown tutor";
          return (
            <div
              key={s.id}
              title={[`${name}, ${timeRange(s.start, s.end)}`, ...warnings.map((w) => WARNING_TEXT[w])].join(
                "\n",
              )}
              style={{
                position: "absolute",
                top: y(s.start) + 1,
                height: y(s.end) - y(s.start) - 2,
                left: `calc(${(i / count) * 100}% + 3px)`,
                width: `calc(${100 / count}% - 6px)`,
                boxSizing: "border-box",
                background: outside ? "#dc2626" : color,
                outline: outside ? "2px solid #7f1d1d" : undefined,
                color: "white",
                borderRadius: 8,
                padding: "3px 8px",
                fontSize: "0.74rem",
                overflow: "hidden",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              <div style={{ fontWeight: 700, whiteSpace: "nowrap", display: "flex", gap: 4 }}>
                {warnings.length > 0 && <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
              </div>
              <div style={{ opacity: 0.9, whiteSpace: "nowrap" }}>{timeRange(s.start, s.end)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
