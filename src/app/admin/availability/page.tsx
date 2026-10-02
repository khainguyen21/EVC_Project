"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Inbox,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import type { AdminTerm, Submission } from "@/types";
import { useToast } from "@/components/admin/ToastProvider";
import ConfirmModal from "@/components/admin/ConfirmModal";
import AvailabilityForm from "@/components/availability/AvailabilityForm";
import WeeklyGrid from "@/components/availability/WeeklyGrid";
import { adminFetch, errorMessage } from "@/lib/adminFetch";
import { announceSubmissionsChanged } from "@/lib/submissionEvents";
import { formatCourseCode } from "@/utils/courseCodes";
import { pickDefaultTerm } from "@/utils/term";
import type { SubmissionInput, SubmissionStatus } from "@/utils/submission";

const STATUS_STYLES: Record<SubmissionStatus, { bg: string; color: string; label: string }> = {
  pending: { bg: "#fffbeb", color: "#b45309", label: "Pending" },
  approved: { bg: "#ecfdf5", color: "#059669", label: "Approved" },
  declined: { bg: "#f1f5f9", color: "#475569", label: "Declined" },
};

const FLAG_LABELS: Record<Submission["flags"][number], string> = {
  "under-units": "Under 6 units",
  "subjects-need-review": "Subjects need review",
};

const pill = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 10px",
  borderRadius: "999px",
  background: bg,
  color,
  fontSize: "0.78rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
});

const buttonStyle = (color: string, border: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  background: "white",
  color,
  border: `1px solid ${border}`,
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.85rem",
});

const cardStyle: React.CSSProperties = {
  padding: "28px 32px",
  backgroundColor: "white",
  borderRadius: "24px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)",
};

/** "1 planned shift", "3 planned shifts". */
function plannedShifts(count: number): string {
  return `${count} planned shift${count === 1 ? "" : "s"}`;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });

export default function AvailabilityInboxPage() {
  const { showToast } = useToast();

  const [terms, setTerms] = useState<AdminTerm[]>([]);
  const [termId, setTermId] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<"terms" | "submissions" | null>(null);
  const [termsAttempt, setTermsAttempt] = useState(0);
  const [submissionsVersion, setSubmissionsVersion] = useState(0);

  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    let stale = false;
    adminFetch<{ terms: AdminTerm[] }>("/api/terms")
      .then(({ terms }) => {
        if (stale) return;
        setTerms(terms);
        setTermId(pickDefaultTerm(terms)?.id ?? null);
        setLoadError(null);
        if (terms.length === 0) setLoading(false);
      })
      .catch((error) => {
        if (stale) return;
        showToast(errorMessage(error, "Could not load terms."), "error");
        setLoadError("terms");
        setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [showToast, termsAttempt]);

  // A response for a term that is no longer selected, or from before a later
  // reload, is dropped: otherwise one term's rows could show under another's
  // name, and Approve or Delete would act on them.
  useEffect(() => {
    if (termId === null) return;
    let stale = false;
    adminFetch<{ submissions: Submission[] }>(`/api/submissions?termId=${termId}`)
      .then(({ submissions }) => {
        if (stale) return;
        setSubmissions(submissions);
        setLoadError(null);
      })
      .catch((error) => {
        if (stale) return;
        showToast(errorMessage(error, "Could not load submissions."), "error");
        setLoadError("submissions");
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [termId, submissionsVersion, showToast]);

  const reloadSubmissions = () => setSubmissionsVersion((v) => v + 1);

  const retryLoad = () => {
    setLoading(true);
    if (loadError === "terms") {
      setTermsAttempt((n) => n + 1);
    } else {
      reloadSubmissions();
    }
  };

  const term = terms.find((t) => t.id === termId) ?? null;

  const counts = useMemo(() => {
    const c = { all: submissions.length, pending: 0, approved: 0, declined: 0 };
    for (const s of submissions) c[s.status]++;
    return c;
  }, [submissions]);

  const visible =
    statusFilter === "all"
      ? submissions
      : submissions.filter((s) => s.status === statusFilter);

  const afterChange = (message: string) => {
    reloadSubmissions();
    announceSubmissionsChanged();
    showToast(message, "success");
  };

  const setStatus = async (s: Submission, status: SubmissionStatus) => {
    try {
      await adminFetch(`/api/submissions/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      afterChange(`${s.name}: ${STATUS_STYLES[status].label.toLowerCase()}.`);
    } catch (error) {
      showToast(errorMessage(error, "Failed to update status."), "error");
    }
  };

  // Declining removes their planner shifts, so ask first if they have any.
  const handleDecline = (s: Submission) => {
    if (s.shiftCount === 0) return setStatus(s, "declined");
    setConfirmModal({
      message: `${s.name} has ${plannedShifts(s.shiftCount)}. Declining removes ${s.shiftCount === 1 ? "it" : "them"}.`,
      confirmLabel: "Yes, decline",
      onConfirm: () => {
        setConfirmModal(null);
        setStatus(s, "declined");
      },
    });
  };

  const handleDelete = (s: Submission) =>
    setConfirmModal({
      message: `Delete ${s.name}'s availability${s.shiftCount > 0 ? ` and ${plannedShifts(s.shiftCount)}` : ""} for ${term?.name ?? "this term"}? This can't be undone. To keep a record that they won't tutor, decline it instead.`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await adminFetch(`/api/submissions/${s.id}`, { method: "DELETE" });
          setExpandedId(null);
          afterChange("Submission deleted.");
        } catch (error) {
          showToast(errorMessage(error, "Failed to delete."), "error");
        }
      },
    });

  // The form throws with the server's message; it shows it above the button.
  const saveEdit = (s: Submission) => async (input: SubmissionInput) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { studentId, ...fields } = input;
    try {
      await adminFetch(`/api/submissions/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
    } catch (error) {
      throw new Error(errorMessage(error, "Failed to save changes."));
    }
    setEditingId(null);
    afterChange(`Saved changes to ${input.name}.`);
  };

  const saveNew = async (input: SubmissionInput) => {
    try {
      await adminFetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, termId }),
      });
    } catch (error) {
      throw new Error(errorMessage(error, "Failed to add submission."));
    }
    setIsAdding(false);
    afterChange(`Added ${input.name}.`);
  };

  return (
    <div style={{ animation: "fadeIn 0.5s ease" }}>
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          marginBottom: "32px",
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
            Tutor Availability
          </h1>
          <p style={{ color: "#64748b", fontSize: "1.1rem" }}>
            What tutors sent through the availability form, one row per tutor.
          </p>
        </div>

        {term && (
          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingId(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              background: isAdding
                ? "white"
                : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: isAdding ? "#ef4444" : "white",
              border: isAdding ? "1px solid #fca5a5" : "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.95rem",
              flexShrink: 0,
            }}
          >
            {isAdding ? (
              "Cancel"
            ) : (
              <>
                <Plus size={20} /> Add Submission
              </>
            )}
          </button>
        )}
      </div>

      {terms.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <select
            value={termId ?? ""}
            onChange={(e) => {
              setTermId(Number(e.target.value));
              setSubmissions([]);
              setLoading(true);
              setLoadError(null);
              setExpandedId(null);
              setEditingId(null);
              setIsAdding(false);
            }}
            style={{
              padding: "10px 14px",
              border: "2px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "1rem",
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

          {term &&
            (term.availabilityCode ? (
              <span style={pill("#ecfdf5", "#059669")}>
                <Link2 size={14} /> Form open
              </span>
            ) : (
              <span style={pill("#f1f5f9", "#475569")}>Form closed</span>
            ))}
          <Link
            href="/admin/terms"
            style={{ color: "#059669", fontWeight: 600, fontSize: "0.9rem" }}
          >
            {term?.availabilityCode ? "Get the link" : "Open the form"}{" "}
            on Terms &amp; Holidays →
          </Link>
        </div>
      )}

      {isAdding && term && (
        <div style={{ ...cardStyle, marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "4px" }}>
            Add a submission for {term.name}
          </h3>
          <p style={{ color: "#64748b", marginBottom: "20px" }}>
            For a tutor who replied by email or in person. The form doesn&apos;t
            need to be open.
          </p>
          <AvailabilityForm submitLabel="Add submission" onSubmit={saveNew} />
        </div>
      )}

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading…</p>
      ) : terms.length === 0 && !loadError ? (
        <EmptyCard
          title="No terms yet"
          body={
            <>
              Create a term on{" "}
              <Link href="/admin/terms" style={{ color: "#059669", fontWeight: 600 }}>
                Terms &amp; Holidays
              </Link>
              , then open its availability form.
            </>
          }
        />
      ) : loadError ? (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "14px",
            color: "#991b1b",
          }}
        >
          <AlertTriangle size={20} />
          <strong>
            {loadError === "terms"
              ? "Could not load terms."
              : "Could not load submissions."}
          </strong>
          <button onClick={retryLoad} style={buttonStyle("#b91c1c", "#fca5a5")}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : submissions.length === 0 ? (
        <EmptyCard
          title={`No submissions for ${term?.name ?? "this term"} yet`}
          body={
            term?.availabilityCode
              ? "The form is open. Submissions show up here as tutors send them."
              : "Open the form on Terms & Holidays and email tutors the link."
          }
        />
      ) : (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            {(["all", "pending", "approved", "declined"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "999px",
                  border: statusFilter === f ? "2px solid #10b981" : "1px solid #e2e8f0",
                  background: statusFilter === f ? "#ecfdf5" : "white",
                  color: statusFilter === f ? "#059669" : "#475569",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {f === "all" ? "All" : STATUS_STYLES[f].label} ({counts[f]})
              </button>
            ))}
          </div>

          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  {["", "Name", "Subjects", "Units", "Status", "Flags"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => {
                  const expanded = expandedId === s.id;
                  const status = STATUS_STYLES[s.status];
                  return (
                    <Fragment key={s.id}>
                      <tr
                        onClick={() => {
                          setExpandedId(expanded ? null : s.id);
                          setEditingId(null);
                        }}
                        style={{
                          cursor: "pointer",
                          borderBottom: expanded ? "none" : "1px solid #f1f5f9",
                          background: expanded ? "#f8fafc" : "white",
                        }}
                      >
                        <td style={{ padding: "14px 0 14px 16px", width: "28px", color: "#94a3b8" }}>
                          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: "14px 16px", color: "#475569", maxWidth: "320px" }}>
                          {s.subjectsRaw}
                        </td>
                        <td style={{ padding: "14px 16px" }}>{s.units}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={pill(status.bg, status.color)}>{status.label}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {s.resubmittedAt && s.status === "pending" && (
                              <span style={pill("#eff6ff", "#1d4ed8")}>Updated</span>
                            )}
                            {s.flags.map((f) => (
                              <span key={f} style={pill("#fef2f2", "#b91c1c")}>
                                {FLAG_LABELS[f]}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>

                      {expanded && (
                        <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                          <td colSpan={6} style={{ padding: "4px 24px 24px 44px" }}>
                            {editingId === s.id ? (
                              <div style={{ ...cardStyle, padding: "24px" }}>
                                <AvailabilityForm
                                  initial={s}
                                  lockStudentId
                                  submitLabel="Save changes"
                                  onSubmit={saveEdit(s)}
                                />
                                <button
                                  onClick={() => setEditingId(null)}
                                  style={{ ...buttonStyle("#475569", "#e2e8f0"), marginTop: "12px" }}
                                >
                                  Cancel editing
                                </button>
                              </div>
                            ) : (
                              <SubmissionDetails
                                s={s}
                                onApprove={() => setStatus(s, "approved")}
                                onDecline={() => handleDecline(s)}
                                onPending={() => setStatus(s, "pending")}
                                onEdit={() => setEditingId(s.id)}
                                onDelete={() => handleDelete(s)}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                      Nothing with this status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyCard({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "48px 32px",
        textAlign: "center",
        backgroundColor: "white",
        borderRadius: "24px",
        border: "1px dashed #cbd5e1",
        color: "#64748b",
      }}
    >
      <Inbox size={36} style={{ marginBottom: "12px", opacity: 0.6 }} />
      <p style={{ fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>{title}</p>
      <p>{body}</p>
    </div>
  );
}

function SubmissionDetails({
  s,
  onApprove,
  onDecline,
  onPending,
  onEdit,
  onDelete,
}: {
  s: Submission;
  onApprove: () => void;
  onDecline: () => void;
  onPending: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const detail = (label: string, value: React.ReactNode) => (
    <div>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ color: "#0f172a", marginTop: "2px" }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) minmax(360px, 1.4fr)", gap: "32px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {detail("Student ID", s.studentId)}
        {detail(
          "Email",
          <a href={`mailto:${s.email}`} style={{ color: "#059669" }}>
            {s.email}
          </a>,
        )}
        {detail("II 90 training", s.trainingDone ? "Done" : "Not yet")}
        {detail(
          "Subjects",
          <>
            <div>{s.subjectsRaw}</div>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
              {s.subjectCodes.map((c) => (
                <span key={c} style={pill("#ecfdf5", "#065f46")}>
                  {formatCourseCode(c)}
                </span>
              ))}
            </div>
          </>,
        )}
        {s.notes && detail("Notes", <span style={{ whiteSpace: "pre-wrap" }}>{s.notes}</span>)}
        {detail(
          "Received",
          <>
            {formatDateTime(s.createdAt)}
            {s.resubmittedAt && ` · updated by tutor ${formatDateTime(s.resubmittedAt)}`}
          </>,
        )}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
          {s.status !== "approved" && (
            <button onClick={onApprove} style={buttonStyle("#059669", "#a7f3d0")}>
              <Check size={16} /> Approve
            </button>
          )}
          {s.status !== "declined" && (
            <button onClick={onDecline} style={buttonStyle("#475569", "#cbd5e1")}>
              <X size={16} /> Decline
            </button>
          )}
          {s.status !== "pending" && (
            <button onClick={onPending} style={buttonStyle("#b45309", "#fcd34d")}>
              Back to pending
            </button>
          )}
          <button onClick={onEdit} style={buttonStyle("#0f172a", "#cbd5e1")}>
            <Pencil size={16} /> Edit
          </button>
          <button onClick={onDelete} style={buttonStyle("#ef4444", "#fca5a5")}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <WeeklyGrid availability={s.availability} />
    </div>
  );
}
