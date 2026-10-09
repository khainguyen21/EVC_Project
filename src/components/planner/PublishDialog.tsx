"use client";

import { useEffect, useRef, useState } from "react";
import { adminFetch, errorMessage } from "@/lib/adminFetch";
import type { PlanTutor, PublishPlan, PublishStatus } from "@/utils/publish";

interface Props {
  termId: number;
  termName: string;
  /** The active term's name when it isn't this one: students see the change at once. */
  activeTermName: string | null;
  plan: PublishPlan;
  status: PublishStatus;
  onCancel: () => void;
  onPublished: (result: { tutors: number }) => void;
}

/**
 * The review screen before Publish: what goes live, what it replaces, and
 * who is left out. Nothing changes until William clicks Publish here.
 */
export default function PublishDialog({
  termId,
  termName,
  activeTermName,
  plan,
  status,
  onCancel,
  onPublished,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cancel has focus, so a stray Enter doesn't publish.
  useEffect(() => cancelRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !publishing) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, publishing]);

  const shiftCount = plan.tutors.reduce((n, t) => n + t.schedules.length, 0);
  const tutorWord = (n: number) => (n === 1 ? "tutor" : "tutors");

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const result = await adminFetch<{ tutors: number }>("/api/planner/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termId }),
      });
      onPublished(result);
    } catch (e) {
      setError(errorMessage(e, "Publishing didn't work. Nothing was changed."));
      setPublishing(false);
    }
  };

  return (
    <>
      <div
        onClick={() => !publishing && onCancel()}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 10000 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10001,
          background: "white",
          borderRadius: 14,
          padding: 28,
          width: "min(560px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 64px)",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
        }}
      >
        <h3 id="publish-title" style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
          Publish {termName} to the public schedule?
        </h3>
        <p style={{ color: "#334155", margin: "10px 0 16px", lineHeight: 1.5 }}>
          <strong>
            {plan.tutors.length} {tutorWord(plan.tutors.length)} and {shiftCount}{" "}
            {shiftCount === 1 ? "shift" : "shifts"}
          </strong>{" "}
          go live as soon as you click Publish. Professors and staff stay as they are.
        </p>

        {activeTermName && (
          <Note tone="warning">
            {activeTermName} is still the active term. Students will see {termName}&apos;s
            shifts right away.
          </Note>
        )}

        <Section
          title={`Removes the ${status.onSchedule.length} student ${tutorWord(status.onSchedule.length)} on the public schedule now`}
          names={status.onSchedule}
          empty="No student tutors are on the public schedule now."
        />
        {status.editedOnManageStaff.length > 0 && (
          <Section
            tone="warning"
            title="Changed on Manage Staff since you last published. Publishing replaces those changes:"
            names={status.editedOnManageStaff}
          />
        )}
        {plan.availabilityChanged.length > 0 && (
          <Section
            tone="warning"
            title="Sent new availability after you placed them. Published with the shifts you gave them:"
            names={names(plan.availabilityChanged)}
          />
        )}
        {plan.needsReview.length > 0 && (
          <Section
            tone="warning"
            title="Left out until their subjects are fixed in Tutor Availability:"
            names={names(plan.needsReview)}
          />
        )}
        {plan.noShifts.length > 0 && (
          <Section title="Left out, with no shifts:" names={names(plan.noShifts)} />
        )}

        {error && <Note tone="error">{error}</Note>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={publishing}
            style={{
              padding: "9px 20px",
              background: "#f3f4f6",
              color: "#374151",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontWeight: 600,
              cursor: publishing ? "default" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={publish}
            disabled={publishing || plan.tutors.length === 0}
            style={{
              padding: "9px 20px",
              background: plan.tutors.length === 0 ? "#94a3b8" : "#059669",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: publishing || plan.tutors.length === 0 ? "default" : "pointer",
            }}
          >
            {publishing ? "Publishing…" : `Publish ${plan.tutors.length} ${tutorWord(plan.tutors.length)}`}
          </button>
        </div>
      </div>
    </>
  );
}

function names(tutors: PlanTutor[]): string[] {
  return tutors.map((t) => t.name);
}

const TONES = {
  plain: { background: "#f8fafc", border: "#e2e8f0", color: "#334155" },
  warning: { background: "#fffbeb", border: "#fde68a", color: "#92400e" },
  error: { background: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
};

function Note({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <div
      style={{
        background: t.background,
        border: `1px solid ${t.border}`,
        color: t.color,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 12,
        fontSize: "0.9rem",
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

function Section({
  title,
  names,
  empty,
  tone = "plain",
}: {
  title: string;
  names: string[];
  empty?: string;
  tone?: "plain" | "warning";
}) {
  if (names.length === 0) return empty ? <Note tone={tone}>{empty}</Note> : null;
  return (
    <Note tone={tone}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ maxHeight: 96, overflowY: "auto" }}>{names.join(", ")}</div>
    </Note>
  );
}
