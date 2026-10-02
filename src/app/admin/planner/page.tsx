"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw, Undo2 } from "lucide-react";
import type { AdminTerm, Submission } from "@/types";
import { useToast } from "@/components/admin/ToastProvider";
import RoomBoard, { startCardDrag } from "@/components/planner/RoomBoard";
import TutorCard from "@/components/planner/TutorCard";
import { hoursText } from "@/components/planner/format";
import { adminFetch, errorMessage } from "@/lib/adminFetch";
import { WEEKDAYS, type Weekday } from "@/utils/centerHours";
import {
  freeTimes,
  sortByFewestHours,
  tutorCourses,
  type PlannerTutor,
  type Shift,
} from "@/utils/planner";
import type { AvailabilityRow } from "@/utils/submission";
import { pickDefaultTerm } from "@/utils/term";

const cardStyle: React.CSSProperties = {
  padding: "20px",
  backgroundColor: "white",
  borderRadius: "24px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)",
};

const COVERAGE_LEGEND = [
  { label: "Nobody", color: "#fecaca" },
  { label: "Below goal", color: "#fde68a" },
  { label: "At goal", color: "#86efac" },
];

/** Changes kept for undo while the page is open. */
const UNDO_LIMIT = 20;

/** One shift added (before null), changed, or removed (after null). */
interface Change {
  before: Shift | null;
  after: Shift | null;
}

interface PlannerData {
  tutors: Submission[];
  shifts: Shift[];
  usualWeeklyHours: number | null;
}

export default function ShiftPlannerPage() {
  const { showToast } = useToast();
  const [terms, setTerms] = useState<AdminTerm[]>([]);
  const [termId, setTermId] = useState<number | null>(null);
  const [data, setData] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [plannerVersion, setPlannerVersion] = useState(0);
  const [history, setHistory] = useState<Change[]>([]);
  const [day, setDay] = useState<Weekday>("Monday");
  const [dragging, setDragging] = useState<number | null>(null);
  // Saves go out one at a time, in order, so a quick move-then-resize can't
  // reach the server backwards.
  const saving = useRef(Promise.resolve());

  // Lights up the dragged tutor's buildings a tick after the drag starts:
  // Chrome cancels a drag whose source changes as it starts. A drop that
  // lands before that tick must not leave the board lit.
  const dragActive = useRef(false);
  const beginDrag = useCallback((tutorId: number) => {
    dragActive.current = true;
    setTimeout(() => {
      if (dragActive.current) setDragging(tutorId);
    });
  }, []);
  const endDrag = useCallback(() => {
    dragActive.current = false;
    setDragging(null);
  }, []);

  useEffect(() => {
    let stale = false;
    adminFetch<{ terms: AdminTerm[] }>("/api/terms")
      .then(({ terms }) => {
        if (stale) return;
        setTerms(terms);
        setTermId(pickDefaultTerm(terms)?.id ?? null);
        if (terms.length === 0) setLoading(false);
      })
      .catch((error) => {
        if (stale) return;
        showToast(errorMessage(error, "Could not load terms."), "error");
        setLoadFailed(true);
        setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [showToast, attempt]);

  // A response for a term that is no longer selected is dropped, so one
  // term's tutors never show under another's name.
  useEffect(() => {
    if (termId === null) return;
    let stale = false;
    adminFetch<PlannerData>(`/api/planner?termId=${termId}`)
      .then((planner) => {
        if (stale) return;
        setData(planner);
        setLoadFailed(false);
      })
      .catch((error) => {
        if (stale) return;
        showToast(errorMessage(error, "Could not load the planner."), "error");
        setLoadFailed(true);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [termId, showToast, attempt, plannerVersion]);

  const refuse = useCallback((message: string) => showToast(message, "error"), [showToast]);

  /**
   * Shows a change at once, then saves it. If the save fails the board reloads
   * from the server, so it never shows a shift that isn't really there, and
   * undo starts over from what the server has.
   */
  const saveShift = useCallback(
    ({ before, after }: Change) => {
      setData((d) =>
        d && {
          ...d,
          shifts: [
            ...d.shifts.filter((s) => s.id !== (before ?? after)!.id),
            ...(after ? [after] : []),
          ],
        },
      );
      saving.current = saving.current.then(async () => {
        try {
          if (after) {
            const { id, ...body } = after;
            await adminFetch(`/api/planner/shifts/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
          } else {
            await adminFetch(`/api/planner/shifts/${before!.id}`, { method: "DELETE" });
          }
        } catch (error) {
          showToast(errorMessage(error, "That change didn't save."), "error");
          setHistory([]);
          setPlannerVersion((v) => v + 1);
        }
      });
    },
    [showToast],
  );

  const changeShift = useCallback(
    (before: Shift | null, after: Shift | null) => {
      saveShift({ before, after });
      setHistory((h) => [...h, { before, after }].slice(-UNDO_LIMIT));
    },
    [saveShift],
  );

  // Puts the last change back, on the day it happened so William sees it.
  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory(history.slice(0, -1));
    saveShift({ before: last.after, after: last.before });
    setDay((last.before ?? last.after)!.day);
  }, [history, saveShift]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.key.toLowerCase() !== "z") return;
      // Typing in a box (the usual hours) keeps its own undo.
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  const plannerTutors = useMemo<PlannerTutor[]>(
    () =>
      (data?.tutors ?? []).map((s) => ({
        id: s.id,
        courses: tutorCourses(s),
        // Always weekdays: the form only lets tutors pick Monday to Friday.
        availability: s.availability as AvailabilityRow[],
      })),
    [data],
  );
  const names = useMemo(
    () => new Map((data?.tutors ?? []).map((s) => [s.id, s.name])),
    [data],
  );

  const term = terms.find((t) => t.id === termId) ?? null;
  const shifts = data?.shifts ?? [];

  // Free that day, or already placed that day even if no longer free.
  const onToday = (s: Submission, i: number) =>
    freeTimes(plannerTutors[i], day).length > 0 ||
    shifts.some((sh) => sh.tutorId === s.id && sh.day === day);
  const listed = sortByFewestHours(
    (data?.tutors ?? []).filter(onToday),
    shifts,
  );
  const notFree = (data?.tutors ?? []).filter((s, i) => !onToday(s, i));

  return (
    <>
    {/* Dragging needs a mouse and a wide screen. */}
    <style>{`
      .planner-phone { display: none; }
      @media (max-width: 768px) {
        .planner-phone { display: block; }
        .planner-desktop { display: none; }
      }
    `}</style>
    <div className="planner-phone" style={{ ...cardStyle, color: "#475569" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
        Shift Planner
      </h1>
      The planner needs a computer: you drag tutors onto buildings with a mouse. Open this page on
      a laptop or desktop.
    </div>

    <div className="planner-desktop" style={{ animation: "fadeIn 0.5s ease" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: "800",
              color: "#0f172a",
              letterSpacing: "-0.03em",
              marginBottom: "8px",
            }}
          >
            Shift Planner
          </h1>
          <p style={{ color: "#64748b", fontSize: "1.1rem" }}>
            Place approved tutors into buildings, one day of the repeating week at a time.
          </p>
        </div>

        {terms.length > 1 && (
          <select
            value={termId ?? ""}
            onChange={(e) => {
              setLoading(true);
              setData(null);
              setHistory([]);
              setTermId(Number(e.target.value));
            }}
            aria-label="Term"
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontWeight: 600,
              background: "white",
            }}
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div style={{ ...cardStyle, color: "#64748b" }}>Loading the planner…</div>
      ) : loadFailed ? (
        <div style={{ ...cardStyle, color: "#64748b" }}>
          The planner didn&apos;t load.{" "}
          <button
            onClick={() => {
              setLoading(true);
              setAttempt((n) => n + 1);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "none",
              background: "none",
              color: "#059669",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      ) : !term ? (
        <div style={{ ...cardStyle, color: "#64748b" }}>
          Add a term on <Link href="/admin/terms">Terms &amp; Holidays</Link> first.
        </div>
      ) : data && data.tutors.length === 0 ? (
        <div style={{ ...cardStyle, color: "#64748b" }}>
          Nobody is approved for {term.name} yet. Approve tutors in{" "}
          <Link href="/admin/availability">Tutor Availability</Link> and they&apos;ll show up
          here.
        </div>
      ) : data ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {WEEKDAYS.map((d) => {
                const today = shifts.filter((s) => s.day === d);
                const active = d === day;
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setDay(d);
                    }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: active ? "1px solid #059669" : "1px solid #e2e8f0",
                      background: active ? "#ecfdf5" : "white",
                      color: active ? "#047857" : "#334155",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {d}
                    <span style={{ fontWeight: 500, color: "#64748b", marginLeft: 6 }}>
                      {hoursText(today.reduce((sum, s) => sum + s.end - s.start, 0))}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                onClick={undo}
                disabled={history.length === 0}
                title={
                  history.length === 0
                    ? "Nothing to undo"
                    : `Undo: ${describe(history[history.length - 1], names)} (Ctrl+Z or ⌘Z)`
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: history.length === 0 ? "#cbd5e1" : "#334155",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: history.length === 0 ? "default" : "pointer",
                }}
              >
                <Undo2 size={15} /> Undo
              </button>
              <UsualHours
                value={data.usualWeeklyHours}
                onSaved={(usualWeeklyHours) => setData({ ...data, usualWeeklyHours })}
              />
              <div style={{ display: "flex", gap: 10, fontSize: "0.75rem", color: "#64748b" }}>
                {COVERAGE_LEGEND.map((l) => (
                  <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div
              style={{
                ...cardStyle,
                width: 250,
                flexShrink: 0,
                padding: "16px 12px",
                maxHeight: "calc(100vh - 120px)",
                overflowY: "auto",
                position: "sticky",
                top: 16,
              }}
            >
              <h3 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 800 }}>
                Free {day}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: "0.75rem", color: "#64748b" }}>
                Drag a tutor onto a building at the time their shift should start.
              </p>
              {listed.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    startCardDrag(e, s.id);
                    beginDrag(s.id);
                  }}
                  onDragEnd={endDrag}
                  style={{ cursor: "grab" }}
                >
                  <TutorCard
                    submission={s}
                    tutor={plannerTutors[data.tutors.indexOf(s)]}
                    shifts={shifts}
                    day={day}
                    usualHours={data.usualWeeklyHours}
                  />
                </div>
              ))}
              {listed.length === 0 && (
                <p style={{ fontSize: "0.8rem", color: "#64748b" }}>Nobody is free {day}.</p>
              )}
              {notFree.length > 0 && (
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "10px 0 0" }}>
                  Not free {day}: {notFree.map((s) => s.name).join(", ")}
                </p>
              )}
            </div>

            <div style={{ ...cardStyle, flex: 1, minWidth: 0, overflowX: "auto" }}>
              <RoomBoard
                tutors={plannerTutors}
                names={names}
                shifts={shifts}
                day={day}
                dragging={dragging}
                beginDrag={beginDrag}
                endDrag={endDrag}
                onChange={changeShift}
                onRefuse={refuse}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
    </>
  );
}

/** "change Alex Rivera's Monday shift", for the Undo button's tooltip. */
function describe({ before, after }: Change, names: Map<number, string>): string {
  const shift = (after ?? before)!;
  const what = before === null ? "add" : after === null ? "remove" : "change";
  return `${what} ${names.get(shift.tutorId) ?? "a tutor"}'s ${shift.day} shift`;
}

/** William's usual weekly hours per tutor. Saved in the database, not the code. */
function UsualHours({
  value,
  onSaved,
}: {
  value: number | null;
  onSaved: (hours: number | null) => void;
}) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [saving, setSaving] = useState(false);
  const parsed = draft.trim() === "" ? null : Number(draft);
  const changed = parsed !== value;

  const save = async () => {
    setSaving(true);
    try {
      await adminFetch("/api/planner/usual-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usualWeeklyHours: parsed }),
      });
      onSaved(parsed);
      showToast(parsed === null ? "Usual hours cleared." : `Usual hours set to ${parsed}.`, "success");
    } catch (error) {
      showToast(errorMessage(error, "Failed to save usual hours."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (changed && !saving) save();
      }}
      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "#475569" }}
    >
      <label htmlFor="usual-hours" style={{ fontWeight: 600 }}>
        Usual hours / week
      </label>
      <input
        id="usual-hours"
        type="number"
        min={0.25}
        max={20}
        step={0.25}
        value={draft}
        placeholder="Not set"
        onChange={(e) => setDraft(e.target.value)}
        style={{
          width: 84,
          padding: "6px 8px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
        }}
      />
      {changed && (
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "none",
            background: "#059669",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </form>
  );
}
