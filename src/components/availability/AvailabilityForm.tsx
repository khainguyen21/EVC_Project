"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Submission } from "@/types";
import { formatCourseCode, parseCourseCodes } from "@/utils/courseCodes";
import {
  WEEKDAYS,
  dayHours,
  formatHour,
  formatOpenHours,
  timeMarks,
  type BuildingHours,
  type Weekday,
} from "@/utils/centerHours";
import {
  findUnrecognizedSubjects,
  submissionSchema,
  type SubmissionInput,
} from "@/utils/submission";

interface Row {
  key: number;
  day: Weekday;
  allDay: boolean;
  start: string;
  end: string;
}

export interface AvailabilityFormProps {
  /** The term's building hours, which limit the times tutors can pick. */
  hours: BuildingHours;
  /** Pre-fills the form when William edits an existing submission. */
  initial?: Submission;
  /** The student ID is how resubmissions find a row, so edits cannot change it. */
  lockStudentId?: boolean;
  /**
   * Public mode adds the honeypot field bots fill in and people never see, and
   * asks the tutor to check their student ID before sending.
   */
  publicForm?: boolean;
  submitLabel: string;
  /** Throw an Error to show its message above the button. */
  onSubmit: (input: SubmissionInput, honeypot: string) => Promise<void>;
}

let nextKey = 0;
const newRow = (day: Weekday = "Monday"): Row => ({
  key: nextKey++,
  day,
  allDay: false,
  start: "",
  end: "",
});

export default function AvailabilityForm({
  hours,
  initial,
  lockStudentId = false,
  publicForm = false,
  submitLabel,
  onSubmit,
}: AvailabilityFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [studentId, setStudentId] = useState(initial?.studentId ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [units, setUnits] = useState(initial ? String(initial.units) : "");
  const [trainingDone, setTrainingDone] = useState<boolean | null>(
    initial?.trainingDone ?? null,
  );
  const [subjects, setSubjects] = useState(initial?.subjectsRaw ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.availability.length
      ? initial.availability.map((r) => ({
          key: nextKey++,
          day: r.day as Weekday,
          allDay: r.allDay,
          start: r.start,
          end: r.end,
        }))
      : [newRow()],
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [honeypot, setHoneypot] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A resubmission is matched by student ID, so a typo files the form under
  // the wrong person. Tutors see their ID and email once more before sending.
  const [toConfirm, setToConfirm] = useState<SubmissionInput | null>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (toConfirm) confirmDialog.current?.showModal();
  }, [toConfirm]);

  // Messages describe the last submit attempt, so editing a field clears its
  // own. Row messages are keyed by position, which shifts when a row is
  // removed, so any row change clears all of them.
  const clearError = (key: string) => {
    setSubmitError(null);
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (k === key || (key === "availability" && k.startsWith("availability"))) {
          delete next[k];
        }
      }
      return next;
    });
  };

  const codes = useMemo(() => parseCourseCodes(subjects), [subjects]);
  const unrecognized = useMemo(
    () => findUnrecognizedSubjects(subjects),
    [subjects],
  );

  const updateRow = (key: number, patch: Partial<Row>) => {
    clearError("availability");
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        // Switching to a day with shorter hours can strand a chosen time.
        const marks = timeMarks(hours, next.day);
        if (next.start && !marks.slice(0, -1).includes(next.start)) next.start = "";
        if (next.end && (!marks.includes(next.end) || next.end <= next.start)) {
          next.end = "";
        }
        return next;
      }),
    );
  };

  const addRow = () => {
    clearError("availability");
    setRows((prev) => {
      // Suggest the first weekday not listed yet.
      const used = new Set(prev.map((r) => r.day));
      return [...prev, newRow(WEEKDAYS.find((d) => !used.has(d)) ?? "Monday")];
    });
  };

  const send = async (input: SubmissionInput) => {
    setSubmitting(true);
    try {
      await onSubmit(input, honeypot);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const nextErrors: Record<string, string> = {};
    if (trainingDone === null) {
      nextErrors.trainingDone = "Please answer this question";
    }

    const result = submissionSchema(hours).safeParse({
      name,
      studentId,
      email,
      units: units.trim() === "" ? NaN : Number(units),
      trainingDone: trainingDone ?? false,
      subjects,
      availability: rows.map(({ day, allDay, start, end }) => ({
        day,
        allDay,
        start,
        end,
      })),
      notes,
    });

    if (!result.success) {
      for (const issue of result.error.issues) {
        // "availability.2" for a row, the field name for everything else.
        const key =
          issue.path[0] === "availability" && typeof issue.path[1] === "number"
            ? `availability.${issue.path[1]}`
            : String(issue.path[0]);
        nextErrors[key] ??= issue.message;
      }
    }

    setErrors(nextErrors);
    if (!result.success || Object.keys(nextErrors).length > 0) {
      setSubmitError("Please fix the highlighted fields.");
      return;
    }

    if (publicForm) {
      setToConfirm(result.data);
      return;
    }
    await send(result.data);
  };

  const fieldError = (key: string) =>
    errors[key] ? <span className="avail-form__error">{errors[key]}</span> : null;

  return (
    <form className="avail-form" onSubmit={handleSubmit} noValidate>
      <div className="avail-form__grid">
        <label className="avail-form__field">
          <span className="avail-form__label">Full name</span>
          <input
            className="avail-form__input"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
            autoComplete="name"
          />
          {fieldError("name")}
        </label>

        <label className="avail-form__field">
          <span className="avail-form__label">Student ID</span>
          <input
            className="avail-form__input"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value.replace(/\D/g, ""));
              clearError("studentId");
            }}
            inputMode="numeric"
            maxLength={7}
            placeholder="7 digits"
            disabled={lockStudentId}
          />
          {lockStudentId ? (
            <span className="avail-form__hint">
              Can&apos;t be changed: a tutor&apos;s resubmission uses it to
              replace this entry.
            </span>
          ) : (
            fieldError("studentId")
          )}
        </label>

        <label className="avail-form__field">
          <span className="avail-form__label">Email</span>
          <input
            className="avail-form__input"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            autoComplete="email"
          />
          {fieldError("email")}
        </label>

        <label className="avail-form__field">
          <span className="avail-form__label">Units this term</span>
          <input
            className="avail-form__input"
            type="number"
            min={0}
            step={0.5}
            value={units}
            onChange={(e) => {
              setUnits(e.target.value);
              clearError("units");
            }}
            inputMode="decimal"
          />
          {fieldError("units")}
        </label>
      </div>

      <div className="avail-form__field">
        <span className="avail-form__label">
          Have you taken the online tutor training course (II 90)?
        </span>
        <div className="avail-form__radios">
          <label>
            <input
              type="radio"
              name="trainingDone"
              checked={trainingDone === true}
              onChange={() => {
                setTrainingDone(true);
                clearError("trainingDone");
              }}
            />
            Yes
          </label>
          <label>
            <input
              type="radio"
              name="trainingDone"
              checked={trainingDone === false}
              onChange={() => {
                setTrainingDone(false);
                clearError("trainingDone");
              }}
            />
            Not yet
          </label>
        </div>
        {fieldError("trainingDone")}
      </div>

      <label className="avail-form__field">
        <span className="avail-form__label">Subjects you can tutor</span>
        <span className="avail-form__hint">
          Course codes separated by commas, e.g. Math 63, COMSC 75, Chem 1A
        </span>
        <input
          className="avail-form__input"
          value={subjects}
          onChange={(e) => {
            setSubjects(e.target.value);
            clearError("subjects");
          }}
        />
        {codes.length > 0 && (
          <div className="avail-form__chips" aria-label="Courses we recognized">
            {codes.map((code) => (
              <span key={code} className="avail-form__chip">
                {formatCourseCode(code)}
              </span>
            ))}
          </div>
        )}
        {unrecognized.length > 0 && (
          <span className="avail-form__warning">
            Please double-check{" "}
            {unrecognized.map((u) => `"${u}"`).join(", ")}: it doesn&apos;t
            look like a course code we know. You can still submit, and William
            will check it.
          </span>
        )}
        {fieldError("subjects")}
      </label>

      <div className="avail-form__field">
        <span className="avail-form__label">Weekly availability</span>
        <span className="avail-form__hint">
          Add a row for each day. Tutoring hours:{" "}
          {WEEKDAYS.map((d) => {
            const span = dayHours(hours, d);
            return `${d.slice(0, 3)} ${span ? formatOpenHours(span).replace(" – ", "–") : "closed"}`;
          }).join(", ")}
          . Times go in 15-minute steps. If you are free until a time like
          12:10, pick 12:00 and write the exact time in Notes.
        </span>
        <div className="avail-form__rows">
          {rows.map((row, i) => {
            const marks = timeMarks(hours, row.day);
            return (
              <div key={row.key} className="avail-form__row">
                <div className="avail-form__row-fields">
                  <select
                    className="avail-form__select"
                    aria-label="Day"
                    value={row.day}
                    onChange={(e) =>
                      updateRow(row.key, { day: e.target.value as Weekday })
                    }
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <label className="avail-form__check">
                    <input
                      type="checkbox"
                      checked={row.allDay}
                      onChange={(e) =>
                        updateRow(row.key, { allDay: e.target.checked })
                      }
                    />
                    All day
                  </label>

                  {row.allDay ? (
                    <span className="avail-form__hint">
                      {(() => {
                        const span = dayHours(hours, row.day);
                        return span ? formatOpenHours(span) : "Closed";
                      })()}
                    </span>
                  ) : (
                    <>
                      <select
                        className="avail-form__select"
                        aria-label="From"
                        value={row.start}
                        onChange={(e) =>
                          updateRow(row.key, { start: e.target.value })
                        }
                      >
                        <option value="">From…</option>
                        {marks.slice(0, -1).map((t) => (
                          <option key={t} value={t}>
                            {formatHour(t)}
                          </option>
                        ))}
                      </select>
                      <select
                        className="avail-form__select"
                        aria-label="Until"
                        value={row.end}
                        onChange={(e) =>
                          updateRow(row.key, { end: e.target.value })
                        }
                      >
                        <option value="">Until…</option>
                        {marks
                          .filter((t) => !row.start || t > row.start)
                          .slice(row.start ? 0 : 1)
                          .map((t) => (
                            <option key={t} value={t}>
                              {formatHour(t)}
                            </option>
                          ))}
                      </select>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className="avail-form__icon-btn"
                  onClick={() => {
                    clearError("availability");
                    setRows((prev) => prev.filter((r) => r.key !== row.key));
                  }}
                  disabled={rows.length === 1}
                  title="Remove this day"
                  aria-label="Remove this day"
                >
                  <X size={16} />
                </button>

                {errors[`availability.${i}`] && (
                  <span className="avail-form__error avail-form__row-error">
                    {errors[`availability.${i}`]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" className="avail-form__add-row" onClick={addRow}>
          <Plus size={16} /> Add another day
        </button>
        {fieldError("availability")}
      </div>

      <label className="avail-form__field">
        <span className="avail-form__label">Notes (optional)</span>
        <textarea
          className="avail-form__textarea"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            clearError("notes");
          }}
          placeholder="Anything William should know, e.g. only 10 hours a week"
        />
        {fieldError("notes")}
      </label>

      {publicForm && (
        <div className="avail-form__honeypot" aria-hidden="true">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </label>
        </div>
      )}

      {submitError && (
        <div className="avail-form__banner" role="alert">
          {submitError}
        </div>
      )}

      <button type="submit" className="avail-form__submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </button>

      {toConfirm && (
        <dialog
          ref={confirmDialog}
          className="avail-confirm"
          aria-labelledby="avail-confirm-title"
          onClose={() => setToConfirm(null)}
        >
          <h3 id="avail-confirm-title" className="avail-confirm__title">
            Is your student ID right?
          </h3>
          <p className="avail-confirm__text">
            William matches this form to you by your student ID, so a typo can
            file it under the wrong person.
          </p>
          <dl className="avail-confirm__details">
            <dt>Student ID</dt>
            <dd className="avail-confirm__id">{toConfirm.studentId}</dd>
            <dt>Email</dt>
            <dd>{toConfirm.email}</dd>
          </dl>
          <div className="avail-confirm__actions">
            <button
              type="button"
              className="avail-confirm__back"
              onClick={() => confirmDialog.current?.close()}
            >
              No, go back
            </button>
            <button
              type="button"
              className="avail-form__submit"
              onClick={() => {
                confirmDialog.current?.close();
                send(toConfirm);
              }}
            >
              Yes, send it
            </button>
          </div>
        </dialog>
      )}
    </form>
  );
}
