"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Globe, RefreshCw, Undo2 } from "lucide-react";
import type { AdminTerm, Submission } from "@/types";
import { useToast } from "@/components/admin/ToastProvider";
import RoomBoard, { startCardDrag } from "@/components/planner/RoomBoard";
import TutorCard from "@/components/planner/TutorCard";
import WeekSummary from "@/components/planner/WeekSummary";
import PublishDialog from "@/components/planner/PublishDialog";
import { hoursText, usualHoursText } from "@/components/planner/format";
import { adminFetch, errorMessage } from "@/lib/adminFetch";
import { readRememberedTerm, rememberTerm } from "@/lib/rememberedTerm";
import { WEEKDAYS, type Weekday } from "@/utils/centerHours";
import {
  freeTimes,
  keepOrder,
  sortByFewestHours,
  tutorCourses,
  type PlannerTutor,
  type Shift,
  type UsualHours,
} from "@/utils/planner";
import {
  forgetFailedChange,
  recordChange,
  restoreChange,
  type Change,
} from "@/utils/plannerHistory";
import { planPublish, samePublicRows, type PublishStatus } from "@/utils/publish";
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
  { label: "Nobody, or MS has no Calc or Stats", color: "#fecaca" },
  { label: "Below goal", color: "#fde68a" },
  { label: "MS is missing Chemistry or Physics", color: "#d9f99d" },
  { label: "All covered", color: "#86efac" },
];

interface PlannerData {
  tutors: Submission[];
  shifts: Shift[];
  usualHours: UsualHours | null;
}

export default function ShiftPlannerPage() {
  const { showToast } = useToast();
  const [terms, setTerms] = useState<AdminTerm[]>([]);
  const [termId, setTermId] = useState<number | null>(null);
  const [data, setData] = useState<PlannerData | null>(null);
  // The term `data` belongs to: the old term's data stays up while a new one loads.
  const [loadedTermId, setLoadedTermId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [plannerVersion, setPlannerVersion] = useState(0);
  const [history, setHistory] = useState<Change[]>([]);
  // Every tutor seen since the page opened, so the undo list can still name a
  // pending tutor who left the board when their last shift was removed.
  const [names, setNames] = useState(new Map<number, string>());
  const [day, setDay] = useState<Weekday>("Monday");
  // The Week tab: every tutor's hours, in place of the day's board.
  const [showWeek, setShowWeek] = useState(false);
  // When the term was last published and who is on the public schedule now.
  const [publishStatus, setPublishStatus] = useState<PublishStatus | null>(null);
  const [publishVersion, setPublishVersion] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  // The tutor list's order, set when a day opens (see keepOrder).
  const [order, setOrder] = useState({ key: "", ids: [] as number[] });
  const [dragging, setDragging] = useState<number | null>(null);
  // Saves go out one at a time, in order, so a quick move-then-resize can't
  // reach the server backwards.
  const saving = useRef(Promise.resolve());
  const queuedSaves = useRef(0);
  const reloadWhenSaved = useRef(false);

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
        setTermId(pickDefaultTerm(terms, readRememberedTerm())?.id ?? null);
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
        setLoadedTermId(termId);
        setNames((m) => new Map([...m, ...planner.tutors.map((s) => [s.id, s.name] as const)]));
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

  useEffect(() => {
    if (termId === null) return;
    let stale = false;
    setPublishStatus(null);
    adminFetch<PublishStatus>(`/api/planner/publish?termId=${termId}`)
      .then((status) => {
        if (!stale) setPublishStatus(status);
      })
      .catch((error) => {
        if (!stale) showToast(errorMessage(error, "Could not check when this term was published."), "error");
      });
    return () => {
      stale = true;
    };
  }, [termId, showToast, attempt, publishVersion]);

  // The review screen reads the server fresh, once queued saves are out:
  // Publish uses what the server has, and Manage Staff or Tutor Availability
  // may have changed tutors in another tab since the page loaded.
  const [openingReview, setOpeningReview] = useState(false);
  const selectedTermId = useRef(termId);
  useEffect(() => {
    selectedTermId.current = termId;
  }, [termId]);
  const openReview = async () => {
    if (termId === null) return;
    setOpeningReview(true);
    try {
      await saving.current;
      const [planner, status] = await Promise.all([
        adminFetch<PlannerData>(`/api/planner?termId=${termId}`),
        adminFetch<PublishStatus>(`/api/planner/publish?termId=${termId}`),
      ]);
      if (selectedTermId.current !== termId) return;
      setData(planner);
      setNames((m) => new Map([...m, ...planner.tutors.map((s) => [s.id, s.name] as const)]));
      setPublishStatus(status);
      setReviewing(true);
    } catch (error) {
      showToast(errorMessage(error, "Could not open the review screen."), "error");
    } finally {
      setOpeningReview(false);
    }
  };

  const refuse = useCallback((message: string) => showToast(message, "error"), [showToast]);

  /**
   * Shows a change at once, then saves it. If the save fails, `onFail` fixes
   * the undo list, and once the saves still queued have gone out the board
   * reloads from the server, so it never shows a shift that isn't really there.
   */
  const saveShift = useCallback(
    ({ before, after }: Change, onFail: () => void) => {
      setData((d) =>
        d && {
          ...d,
          shifts: [
            ...d.shifts.filter((s) => s.id !== (before ?? after)!.id),
            ...(after ? [after] : []),
          ],
        },
      );
      queuedSaves.current++;
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
          onFail();
          reloadWhenSaved.current = true;
        } finally {
          queuedSaves.current--;
          if (queuedSaves.current === 0 && reloadWhenSaved.current) {
            reloadWhenSaved.current = false;
            setPlannerVersion((v) => v + 1);
          }
        }
      });
    },
    [showToast],
  );

  const changeShift = useCallback(
    (before: Shift | null, after: Shift | null) => {
      const change = { before, after };
      saveShift(change, () => setHistory((h) => forgetFailedChange(h, change)));
      setHistory((h) => recordChange(h, change));
    },
    [saveShift],
  );

  // Puts the last change back, on the day it happened so William sees it.
  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory(history.slice(0, -1));
    // Bringing back a tutor who left the board: reload once it saves, so
    // their card and coverage come back with them.
    const tutorId = (last.before ?? last.after)!.tutorId;
    if (!data?.tutors.some((s) => s.id === tutorId)) reloadWhenSaved.current = true;
    saveShift({ before: last.after, after: last.before }, () =>
      setHistory((h) => restoreChange(h, last)),
    );
    setDay((last.before ?? last.after)!.day);
  }, [history, data, saveShift]);

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

  const term = terms.find((t) => t.id === termId) ?? null;
  const shifts = data?.shifts ?? [];

  // Worked out here from the board, so "not published" follows every move.
  // Subjects and names count too: publishing again would change them as well.
  const plan = useMemo(() => (data ? planPublish(data.tutors, data.shifts) : null), [data]);
  const lastPublished = publishStatus?.lastPublished ?? null;
  const changedSincePublished =
    plan !== null && lastPublished !== null && !samePublicRows(plan.tutors, lastPublished.tutors);
  const activeTerm = terms.find((t) => t.isActive);

  // Free that day, or already placed that day even if no longer free.
  const onToday = (s: Submission, i: number) =>
    freeTimes(plannerTutors[i], day).length > 0 ||
    shifts.some((sh) => sh.tutorId === s.id && sh.day === day);
  const freeToday = (data?.tutors ?? []).filter(onToday);
  // Fewest hours first when William opens a day, then held while he works on
  // it: a card that jumped down after a drop looked to him like it had left.
  const orderKey = `${loadedTermId}-${day}`;
  if (data && order.key !== orderKey) {
    setOrder({ key: orderKey, ids: sortByFewestHours(freeToday, shifts).map((s) => s.id) });
  }
  const listed =
    order.key === orderKey ? keepOrder(freeToday, order.ids) : sortByFewestHours(freeToday, shifts);
  const notFree = (data?.tutors ?? []).filter((s, i) => !onToday(s, i));

  return (
    <>
    {/* Dragging needs a mouse and a wide screen, and the board uses all of it. */}
    <style>{`
      .admin-content:has(.planner-desktop) { max-width: 1800px !important; }
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

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {term && plan && publishStatus && (
            <>
              <span style={{ fontSize: "0.85rem", color: "#64748b", textAlign: "right", whiteSpace: "nowrap" }}>
                {lastPublished ? (
                  <>
                    Published{" "}
                    {new Date(lastPublished.at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {changedSincePublished && (
                      <span style={{ display: "block", color: "#b45309", fontWeight: 700 }}>
                        Changes not published yet
                      </span>
                    )}
                  </>
                ) : (
                  "Not published yet"
                )}
              </span>
              <button
                onClick={openReview}
                disabled={openingReview}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: "#059669",
                  color: "white",
                  fontWeight: 700,
                  cursor: openingReview ? "default" : "pointer",
                }}
              >
                <Globe size={16} /> {openingReview ? "Checking…" : "Publish"}
              </button>
            </>
          )}
          {terms.length > 1 && (
            <select
              value={termId ?? ""}
              onChange={(e) => {
                setLoading(true);
                setData(null);
                setHistory([]);
                setTermId(Number(e.target.value));
                rememberTerm(Number(e.target.value));
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
      </div>

      {reviewing && term && plan && publishStatus && (
        <PublishDialog
          termId={term.id}
          termName={term.name}
          activeTerm={activeTerm ?? null}
          plan={plan}
          status={publishStatus}
          onCancel={() => setReviewing(false)}
          onPublished={({ tutors }) => {
            setReviewing(false);
            showToast(`Published: ${tutors} ${tutors === 1 ? "tutor is" : "tutors are"} on the public schedule.`);
            setPublishVersion((n) => n + 1);
            // Publishing made this term the active one.
            setTerms((ts) => ts.map((t) => ({ ...t, isActive: t.id === term.id })));
          }}
        />
      )}

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
          <Link href="/admin/availability">Tutor Availability</Link>{" "}
          and they&apos;ll show up here.
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
              {[...WEEKDAYS, "Week" as const].map((d) => {
                const counted = d === "Week" ? shifts : shifts.filter((s) => s.day === d);
                const active = d === "Week" ? showWeek : !showWeek && d === day;
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setShowWeek(d === "Week");
                      if (d !== "Week") setDay(d);
                    }}
                    aria-pressed={active}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: active ? "1px solid #059669" : "1px solid #e2e8f0",
                      background: active ? "#ecfdf5" : "white",
                      color: active ? "#047857" : "#334155",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      marginLeft: d === "Week" ? 8 : 0,
                    }}
                  >
                    {d}
                    <span style={{ fontWeight: 500, color: "#64748b", marginLeft: 6 }}>
                      {hoursText(counted.reduce((sum, s) => sum + s.end - s.start, 0))}
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
                value={data.usualHours}
                onSaved={(usualHours) => setData({ ...data, usualHours })}
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

          {showWeek ? (
            <div style={{ ...cardStyle, overflowX: "auto" }}>
              <WeekSummary
                tutors={data.tutors}
                shifts={shifts}
                usualHours={data.usualHours}
                onOpenDay={(d) => {
                  setShowWeek(false);
                  setDay(d);
                }}
              />
            </div>
          ) : (
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
                      usualHours={data.usualHours}
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
                  hours={term.buildingHours}
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
          )}
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

/** William's usual weekly hours per tutor, a range. Saved in the database, not the code. */
function UsualHours({
  value,
  onSaved,
}: {
  value: UsualHours | null;
  onSaved: (hours: UsualHours | null) => void;
}) {
  const { showToast } = useToast();
  const [min, setMin] = useState(value === null ? "" : String(value.min));
  const [max, setMax] = useState(value === null ? "" : String(value.max));
  const [saving, setSaving] = useState(false);
  // Both blank clears the range; one blank isn't a range yet.
  const blank = min.trim() === "" && max.trim() === "";
  const parsed: UsualHours | null = blank ? null : { min: Number(min), max: Number(max) };
  const complete = blank || (min.trim() !== "" && max.trim() !== "");
  const changed = parsed?.min !== value?.min || parsed?.max !== value?.max;

  const save = async () => {
    setSaving(true);
    try {
      await adminFetch("/api/planner/usual-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usualHours: parsed }),
      });
      onSaved(parsed);
      showToast(
        parsed === null ? "Usual hours cleared." : `Usual hours set to ${usualHoursText(parsed)}.`,
        "success",
      );
    } catch (error) {
      showToast(errorMessage(error, "Failed to save usual hours."), "error");
    } finally {
      setSaving(false);
    }
  };

  const input = (id: string, label: string, text: string, setText: (t: string) => void) => (
    <input
      id={id}
      aria-label={label}
      type="number"
      min={0.25}
      max={20}
      step={0.25}
      value={text}
      placeholder="Not set"
      onChange={(e) => setText(e.target.value)}
      style={{
        width: 72,
        padding: "6px 8px",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
      }}
    />
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (changed && complete && !saving) save();
      }}
      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "#475569" }}
    >
      <label htmlFor="usual-hours-min" style={{ fontWeight: 600 }}>
        Usual hours / week
      </label>
      {input("usual-hours-min", "Fewest usual hours a week", min, setMin)}
      to
      {input("usual-hours-max", "Most usual hours a week", max, setMax)}
      {changed && (
        <button
          type="submit"
          disabled={saving || !complete}
          title={complete ? undefined : "Fill in both numbers, or clear both"}
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
