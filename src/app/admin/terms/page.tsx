"use client";

import { useCallback, useEffect, useState } from "react";
import { type Term } from "@/types";
import { useToast } from "@/components/admin/ToastProvider";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { formatTermDate } from "@/utils/term";
import {
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

// Shared field styling so the forms match the rest of the admin panel.
const labelStyle: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: "600",
  color: "#475569",
};

const inputStyle: React.CSSProperties = {
  padding: "12px 16px",
  border: "2px solid #e2e8f0",
  borderRadius: "12px",
  fontSize: "1rem",
  outline: "none",
  transition: "border-color 0.2s",
  background: "white",
};

const focusInput = (e: React.FocusEvent<HTMLInputElement>) =>
  (e.target.style.borderColor = "#10b981");
const blurInput = (e: React.FocusEvent<HTMLInputElement>) =>
  (e.target.style.borderColor = "#e2e8f0");

export default function ManageTermsPage() {
  const { showToast } = useToast();
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Add-term form state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newActive, setNewActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // One in-progress holiday draft per term, keyed by term id
  const [holidayDrafts, setHolidayDrafts] = useState<
    Record<number, { name: string; date: string }>
  >({});

  const fetchTerms = useCallback(() => {
    fetch("/api/terms")
      .then((res) => res.json())
      .then((data) => {
        setTerms(data.terms || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching terms:", error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          startDate: newStart,
          endDate: newEnd,
          // The very first term becomes active automatically.
          isActive: newActive || terms.length === 0,
        }),
      });

      if (res.ok) {
        setIsAdding(false);
        setNewName("");
        setNewStart("");
        setNewEnd("");
        setNewActive(false);
        fetchTerms();
        showToast("Term added successfully!", "success");
      } else {
        const errorData = await res.json();
        showToast(errorData?.error || "Failed to add term.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetActive = async (term: Term) => {
    try {
      const res = await fetch(`/api/terms/${term.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        fetchTerms();
        showToast(`${term.name} is now the active term.`, "success");
      } else {
        const errorData = await res.json();
        showToast(errorData?.error || "Failed to activate term.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    }
  };

  const handleDeleteTerm = (term: Term) => {
    setConfirmModal({
      message: `This will permanently remove ${term.name} and its ${term.holidays.length} closed day${term.holidays.length === 1 ? "" : "s"}.${term.isActive ? " It is the active term, so the homepage banner will lose its dates until another term is activated." : ""}`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/terms/${term.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            fetchTerms();
            showToast("Term deleted.", "success");
          } else {
            const errorData = await res.json();
            showToast(errorData?.error || "Failed to delete.", "error");
          }
        } catch {
          showToast("Network error. Please try again.", "error");
        }
      },
    });
  };

  const updateDraft = (
    termId: number,
    patch: Partial<{ name: string; date: string }>,
  ) =>
    setHolidayDrafts((prev) => {
      const current = prev[termId] ?? { name: "", date: "" };
      return { ...prev, [termId]: { ...current, ...patch } };
    });

  const handleAddHoliday = async (term: Term, e: React.FormEvent) => {
    e.preventDefault();
    const draft = holidayDrafts[term.id];
    if (!draft?.name || !draft?.date) return;

    try {
      const res = await fetch(`/api/terms/${term.id}/holidays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setHolidayDrafts((prev) => ({
          ...prev,
          [term.id]: { name: "", date: "" },
        }));
        fetchTerms();
        showToast("Closed day added.", "success");
      } else {
        const errorData = await res.json();
        showToast(errorData?.error || "Failed to add closed day.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    }
  };

  const handleDeleteHoliday = (term: Term, holidayId: number, name: string) => {
    setConfirmModal({
      message: `Remove "${name}" from ${term.name}? Tutoring will show as open that day.`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(
            `/api/terms/${term.id}/holidays/${holidayId}`,
            { method: "DELETE" },
          );
          if (res.ok) {
            fetchTerms();
            showToast("Closed day removed.", "success");
          } else {
            const errorData = await res.json();
            showToast(errorData?.error || "Failed to remove.", "error");
          }
        } catch {
          showToast("Network error. Please try again.", "error");
        }
      },
    });
  };

  return (
    <div style={{ animation: "fadeIn 0.5s ease" }}>
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "40px",
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
            Terms &amp; Holidays
          </h1>
          <p style={{ color: "#64748b", fontSize: "1.1rem" }}>
            The active term sets the homepage dates and pauses &ldquo;Available
            Now&rdquo; on closed days and between semesters.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
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
            boxShadow: isAdding
              ? "none"
              : "0 8px 20px -8px rgba(16, 185, 129, 0.5)",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
        >
          {isAdding ? (
            "Cancel"
          ) : (
            <>
              <Plus size={20} /> Add Term
            </>
          )}
        </button>
      </div>

      {isAdding && (
        <div
          style={{
            padding: "32px",
            marginBottom: "32px",
            backgroundColor: "white",
            borderRadius: "24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)",
            animation: "slideDown 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#ecfdf5",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarDays size={20} />
            </div>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "700",
                color: "#0f172a",
                margin: 0,
              }}
            >
              Add New Term
            </h3>
          </div>

          <form
            onSubmit={handleAddTerm}
            style={{
              display: "flex",
              gap: "20px",
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                flex: "1 1 220px",
              }}
            >
              <label style={labelStyle}>Term Name</label>
              <input
                required
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Spring 2027"
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={labelStyle}>First Day</label>
              <input
                required
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={labelStyle}>Last Day</label>
              <input
                required
                type="date"
                value={newEnd}
                min={newStart || undefined}
                onChange={(e) => setNewEnd(e.target.value)}
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

            <label
              style={{
                ...labelStyle,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 0",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={newActive || terms.length === 0}
                disabled={terms.length === 0}
                onChange={(e) => setNewActive(e.target.checked)}
              />
              Make this the active term
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "0.95rem",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Saving…" : "Save Term"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading terms…</p>
      ) : terms.length === 0 ? (
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
          <CalendarOff size={36} style={{ marginBottom: "12px", opacity: 0.6 }} />
          <p style={{ fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
            No terms yet
          </p>
          <p>
            Add a term to put its dates on the homepage and to keep
            &ldquo;Available Now&rdquo; quiet on holidays.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {terms.map((term) => {
            const draft = holidayDrafts[term.id] ?? { name: "", date: "" };
            return (
              <div
                key={term.id}
                style={{
                  padding: "28px 32px",
                  backgroundColor: "white",
                  borderRadius: "24px",
                  border: term.isActive
                    ? "2px solid #10b981"
                    : "1px solid #e2e8f0",
                  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)",
                }}
              >
                {/* Term header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "16px",
                    flexWrap: "wrap",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "6px",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "1.35rem",
                          fontWeight: "700",
                          color: "#0f172a",
                          margin: 0,
                        }}
                      >
                        {term.name}
                      </h3>
                      {term.isActive && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 12px",
                            borderRadius: "999px",
                            background: "#ecfdf5",
                            color: "#059669",
                            fontSize: "0.8rem",
                            fontWeight: "700",
                          }}
                        >
                          <CheckCircle2 size={14} /> Active
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#64748b",
                        margin: 0,
                      }}
                    >
                      <CalendarDays size={16} />
                      {formatTermDate(term.startDate)} → {formatTermDate(term.endDate)}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    {!term.isActive && (
                      <button
                        onClick={() => handleSetActive(term)}
                        style={{
                          padding: "10px 18px",
                          background: "white",
                          color: "#059669",
                          border: "1px solid #a7f3d0",
                          borderRadius: "12px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "0.9rem",
                        }}
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTerm(term)}
                      title="Delete term"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 16px",
                        background: "white",
                        color: "#ef4444",
                        border: "1px solid #fca5a5",
                        borderRadius: "12px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "0.9rem",
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>

                {/* Closed days */}
                <div
                  style={{
                    borderTop: "1px solid #f1f5f9",
                    paddingTop: "20px",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#64748b",
                      margin: "0 0 12px 0",
                    }}
                  >
                    Closed Days ({term.holidays.length})
                  </h4>

                  {term.holidays.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "0 0 16px 0" }}>
                      No closed days yet — add campus holidays like Labor Day or
                      Thanksgiving so tutors aren&apos;t shown as available.
                    </p>
                  ) : (
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: "0 0 16px 0",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      {term.holidays.map((holiday) => (
                        <li
                          key={holiday.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 6px 6px 14px",
                            borderRadius: "999px",
                            background: "#fffbeb",
                            border: "1px solid #fcd34d",
                            color: "#92400e",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                          }}
                        >
                          {holiday.name}
                          <span style={{ fontWeight: 500, opacity: 0.8 }}>
                            {formatTermDate(holiday.date)}
                          </span>
                          <button
                            onClick={() =>
                              handleDeleteHoliday(term, holiday.id, holiday.name)
                            }
                            title={`Remove ${holiday.name}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              border: "none",
                              background: "rgba(146, 64, 14, 0.1)",
                              color: "#92400e",
                              cursor: "pointer",
                            }}
                          >
                            <X size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form
                    onSubmit={(e) => handleAddHoliday(term, e)}
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <input
                      required
                      type="text"
                      value={draft.name}
                      onChange={(e) =>
                        updateDraft(term.id, { name: e.target.value })
                      }
                      placeholder="e.g. Veterans Day"
                      style={{ ...inputStyle, padding: "10px 14px", flex: "1 1 200px" }}
                      onFocus={focusInput}
                      onBlur={blurInput}
                    />
                    <input
                      required
                      type="date"
                      value={draft.date}
                      min={term.startDate}
                      max={term.endDate}
                      onChange={(e) =>
                        updateDraft(term.id, { date: e.target.value })
                      }
                      style={{ ...inputStyle, padding: "10px 14px" }}
                      onFocus={focusInput}
                      onBlur={blurInput}
                    />
                    <button
                      type="submit"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 18px",
                        background: "#0f172a",
                        color: "white",
                        border: "none",
                        borderRadius: "12px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "0.9rem",
                      }}
                    >
                      <Plus size={16} /> Add Closed Day
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
