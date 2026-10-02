"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { CENTER_HOURS, hhmmToMinutes, type Weekday } from "@/utils/centerHours";
import { formatCourseCode } from "@/utils/courseCodes";
import {
  BUILDINGS,
  COVERAGE_GOAL,
  OPEN_LAB,
  STEP_MINUTES,
  addsNothingNew,
  buildingWeeklyMinutes,
  buildingsFor,
  coverageAt,
  freeTimes,
  moveShift,
  resizeShift,
  shiftForDrop,
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

type Resizing = { id: string; top: number; end: number };

/** What a drag carries: a tutor card, or a shift and where on it it was grabbed. */
type DragData = { kind: "tutor"; tutorId: number } | { kind: "shift"; id: string; grabY: number };

const DRAG_TYPE = "application/x-planner";

export function startCardDrag(e: React.DragEvent, tutorId: number) {
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ kind: "tutor", tutorId } satisfies DragData));
  e.dataTransfer.effectAllowed = "copyMove";
}

interface Props {
  tutors: PlannerTutor[];
  names: Map<number, string>;
  shifts: Shift[];
  day: Weekday;
  /** The tutor being dragged, to light up their buildings and free time. */
  dragging: number | null;
  beginDrag: (tutorId: number) => void;
  endDrag: () => void;
  /** One shift added (before null), changed, or removed (after null). */
  onChange: (before: Shift | null, after: Shift | null) => void;
  /** Why a drop didn't make a shift. */
  onRefuse: (message: string) => void;
}

/** Buildings as columns and time running down, for one day. */
export default function RoomBoard({
  tutors,
  names,
  shifts,
  day,
  dragging,
  beginDrag,
  endDrag,
  onChange,
  onRefuse,
}: Props) {
  const open = hhmmToMinutes(CENTER_HOURS[day].open);
  const close = hhmmToMinutes(CENTER_HOURS[day].close);
  const steps: number[] = [];
  for (let m = open; m < close; m += STEP_MINUTES) steps.push(m);
  const height = steps.length * STEP_H;
  const y = (minute: number) => ((minute - open) / STEP_MINUTES) * STEP_H;
  const minuteAt = (px: number) => open + (px / STEP_H) * STEP_MINUTES;

  const today = shifts.filter((s) => s.day === day);
  const weekTotals = buildingWeeklyMinutes(shifts);
  const tutorById = new Map(tutors.map((t) => [t.id, t]));
  const draggingTutor = dragging === null ? undefined : tutorById.get(dragging);
  const lit = draggingTutor ? buildingsFor(draggingTutor.courses) : [];
  const nameOf = (tutorId: number) => names.get(tutorId) ?? "Unknown tutor";

  const drop = (building: Building, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    endDrag();
    let data: DragData;
    try {
      data = JSON.parse(e.dataTransfer.getData(DRAG_TYPE));
    } catch {
      return;
    }
    const top = e.currentTarget.getBoundingClientRect().top;

    if (data.kind === "tutor") {
      const tutor = tutorById.get(data.tutorId);
      if (!tutor) return;
      const minute = minuteAt(e.clientY - top);
      const fit = shiftForDrop(tutor, shifts, day, minute);
      if (!fit) {
        const start = Math.floor(minute / STEP_MINUTES) * STEP_MINUTES;
        const busy = shifts.some(
          (s) => s.tutorId === tutor.id && s.day === day && s.start <= start && start < s.end,
        );
        onRefuse(
          busy
            ? `${nameOf(tutor.id)} already has a shift at ${clock(start)}.`
            : `Less than an hour is left after ${clock(start)} before closing or ${nameOf(tutor.id)}'s next shift.`,
        );
        return;
      }
      onChange(null, { id: crypto.randomUUID(), tutorId: tutor.id, day, building, ...fit });
    } else {
      const shift = shifts.find((s) => s.id === data.id);
      if (!shift) return;
      const moved = moveShift(shift, shifts, day, building, minuteAt(e.clientY - top - data.grabY));
      if (!moved) {
        onRefuse(`${nameOf(shift.tutorId)} already has a shift at that time.`);
        return;
      }
      if (moved.start !== shift.start || moved.building !== shift.building) onChange(shift, moved);
    }
  };

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
          minuteAt={minuteAt}
          tutors={tutors}
          tutorById={tutorById}
          nameOf={nameOf}
          shifts={shifts}
          today={today.filter((s) => s.building === b)}
          draggingTutor={draggingTutor}
          lit={lit.includes(b)}
          beginDrag={beginDrag}
          endDrag={endDrag}
          onDrop={(e) => drop(b, e)}
          onChange={onChange}
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
  minuteAt,
  tutors,
  tutorById,
  nameOf,
  shifts,
  today,
  draggingTutor,
  lit,
  beginDrag,
  endDrag,
  onDrop,
  onChange,
}: {
  building: Building;
  day: Weekday;
  steps: number[];
  height: number;
  y: (minute: number) => number;
  minuteAt: (px: number) => number;
  tutors: PlannerTutor[];
  tutorById: Map<number, PlannerTutor>;
  nameOf: (tutorId: number) => string;
  shifts: Shift[];
  today: Shift[];
  draggingTutor: PlannerTutor | undefined;
  lit: boolean;
  beginDrag: (tutorId: number) => void;
  endDrag: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onChange: (before: Shift | null, after: Shift | null) => void;
}) {
  // The end a shift's bottom edge is being dragged to, shown before it saves.
  // Followed with window listeners, so the mouse can leave the thin handle.
  const [resizing, setResizing] = useState<Resizing | null>(null);
  const resizeRef = useRef<Resizing | null>(null);
  const latest = useRef({ today, shifts, minuteAt, onChange });
  useEffect(() => {
    latest.current = { today, shifts, minuteAt, onChange };
  });
  const resizingId = resizing?.id ?? null;
  useEffect(() => {
    if (resizingId === null) return;
    const originalOf = (r: Resizing) => latest.current.today.find((t) => t.id === r.id);
    const move = (e: PointerEvent) => {
      const r = resizeRef.current;
      const original = r && originalOf(r);
      if (!r || !original) return;
      const { shifts, minuteAt } = latest.current;
      const end = resizeShift(original, shifts, minuteAt(e.clientY - r.top)).end;
      if (end === r.end) return;
      resizeRef.current = { ...r, end };
      setResizing(resizeRef.current);
    };
    const up = () => {
      const r = resizeRef.current;
      const original = r && originalOf(r);
      if (r && original && r.end !== original.end) {
        latest.current.onChange(original, { ...original, end: r.end });
      }
      resizeRef.current = null;
      setResizing(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [resizingId]);
  const shown = today.map((s) => (resizing?.id === s.id ? { ...s, end: resizing.end } : s));
  const placed = lanes(shown);
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
        data-building-column
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={onDrop}
        style={{
          position: "relative",
          flex: 1,
          borderRadius: 10,
          border: lit ? `2px solid ${color}` : "1px solid #e2e8f0",
          boxShadow: lit ? `0 0 0 3px ${color}33` : undefined,
          background: `repeating-linear-gradient(to bottom, #f8fafc 0 ${STEP_H * 4 - 1}px, #e2e8f0 ${
            STEP_H * 4 - 1
          }px ${STEP_H * 4}px)`,
        }}
      >
        {draggingTutor &&
          freeTimes(draggingTutor, day).map((f) => (
            <div
              key={f.start}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: y(f.start),
                height: y(f.end) - y(f.start),
                background: "rgba(16,185,129,0.12)",
                borderTop: "2px dashed #10b981",
                borderBottom: "2px dashed #10b981",
                boxSizing: "border-box",
                pointerEvents: "none",
              }}
            />
          ))}

        {shown.map((s) => {
          const tutor = tutorById.get(s.tutorId);
          const warnings = [
            ...(tutor ? shiftWarnings(s, tutor) : []),
            ...(tutor && addsNothingNew(s, tutors, shifts) ? (["same-subjects"] as const) : []),
          ];
          const outside = warnings.includes("outside-availability");
          const { lane: i, of: count } = placed.get(s.id) ?? { lane: 0, of: 1 };
          const name = nameOf(s.tutorId);
          const original = today.find((t) => t.id === s.id)!;
          return (
            <div
              key={s.id}
              style={{
                position: "absolute",
                top: y(s.start) + 1,
                height: y(s.end) - y(s.start) - 2,
                left: `calc(${(i / count) * 100}% + 3px)`,
                width: `calc(${100 / count}% - 6px)`,
                // Let drops land on the column underneath while dragging.
                pointerEvents: draggingTutor ? "none" : undefined,
              }}
            >
              <div
                draggable
                onDragStart={(e) => {
                  const grabY = e.clientY - e.currentTarget.getBoundingClientRect().top;
                  e.dataTransfer.setData(
                    DRAG_TYPE,
                    JSON.stringify({ kind: "shift", id: s.id, grabY } satisfies DragData),
                  );
                  e.dataTransfer.effectAllowed = "move";
                  beginDrag(s.tutorId);
                }}
                onDragEnd={endDrag}
                title={[`${name}, ${timeRange(s.start, s.end)}`, ...warnings.map((w) => WARNING_TEXT[w])].join(
                  "\n",
                )}
                style={{
                  height: "100%",
                  boxSizing: "border-box",
                  background: outside ? "#dc2626" : color,
                  outline: outside ? "2px solid #7f1d1d" : undefined,
                  color: "white",
                  borderRadius: 8,
                  padding: "3px 18px 3px 8px",
                  fontSize: "0.74rem",
                  overflow: "hidden",
                  cursor: "grab",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                }}
              >
                <div style={{ fontWeight: 700, whiteSpace: "nowrap", display: "flex", gap: 4 }}>
                  {warnings.length > 0 && (
                    <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  )}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                </div>
                <div style={{ opacity: 0.9, whiteSpace: "nowrap" }}>{timeRange(s.start, s.end)}</div>
              </div>

              <button
                onClick={() => onChange(original, null)}
                aria-label={`Remove ${name}'s shift`}
                title="Remove this shift"
                style={{
                  position: "absolute",
                  top: 3,
                  right: 3,
                  border: "none",
                  background: "rgba(255,255,255,0.25)",
                  color: "white",
                  borderRadius: 4,
                  padding: 1,
                  display: "flex",
                  cursor: "pointer",
                }}
              >
                <X size={12} />
              </button>

              <div
                title="Drag to change the length"
                onPointerDown={(e) => {
                  const column = e.currentTarget.closest<HTMLElement>("[data-building-column]");
                  if (!column) return;
                  e.preventDefault();
                  resizeRef.current = {
                    id: s.id,
                    top: column.getBoundingClientRect().top,
                    end: s.end,
                  };
                  setResizing(resizeRef.current);
                }}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: -3,
                  height: 9,
                  cursor: "ns-resize",
                  touchAction: "none",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
