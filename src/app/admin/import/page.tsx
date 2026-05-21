"use client";

import { useState } from "react";
import { useToast } from "@/components/admin/ToastProvider";
import { Sparkles, Trash2, Upload } from "lucide-react";

const LOCATIONS = ["Online", "LE-237", "MS-112", "SQ-231"] as const;
type Location = (typeof LOCATIONS)[number];

interface ParsedSubject {
  name: string;
  field: string;
}

interface ParsedSchedule {
  day: string;
  start: string;
  end: string;
  location: Location;
}

interface ParsedTutor {
  name: string;
  type: "tutor";
  subjects: ParsedSubject[];
  schedules: ParsedSchedule[];
}

const spinnerStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  border: "2px solid rgba(255,255,255,0.4)",
  borderTopColor: "#fff",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  display: "inline-block",
};

export default function ImportPage() {
  const { showToast } = useToast();
  const [emailText, setEmailText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [tutors, setTutors] = useState<ParsedTutor[]>([]);

  async function handleParse() {
    if (!emailText.trim()) {
      showToast("Please paste some email replies first.", "error");
      return;
    }
    setIsParsing(true);
    try {
      const res = await fetch("/api/ai/parse-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: emailText }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || "Failed to parse emails.", "error");
        return;
      }
      if (!data.tutors || data.tutors.length === 0) {
        showToast(
          "No tutors found in the text. Check the format and try again.",
          "error",
        );
        return;
      }
      setTutors(data.tutors);
      showToast(
        `Parsed ${data.tutors.length} tutor${data.tutors.length > 1 ? "s" : ""}. Review and import.`,
        "success",
      );
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsParsing(false);
    }
  }

  function removeTutor(index: number) {
    setTutors((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSubject(
    tutorIndex: number,
    subjectIndex: number,
    field: keyof ParsedSubject,
    value: string,
  ) {
    setTutors((prev) =>
      prev.map((t, ti) =>
        ti === tutorIndex
          ? {
              ...t,
              subjects: t.subjects.map((s, si) =>
                si === subjectIndex ? { ...s, [field]: value } : s,
              ),
            }
          : t,
      ),
    );
  }

  function removeSubject(tutorIndex: number, subjectIndex: number) {
    setTutors((prev) =>
      prev.map((t, ti) =>
        ti === tutorIndex
          ? {
              ...t,
              subjects: t.subjects.filter((_, si) => si !== subjectIndex),
            }
          : t,
      ),
    );
  }

  function updateSchedule(
    tutorIndex: number,
    scheduleIndex: number,
    field: keyof ParsedSchedule,
    value: string,
  ) {
    setTutors((prev) =>
      prev.map((t, ti) =>
        ti === tutorIndex
          ? {
              ...t,
              schedules: t.schedules.map((s, si) =>
                si === scheduleIndex ? { ...s, [field]: value } : s,
              ),
            }
          : t,
      ),
    );
  }

  function removeSchedule(tutorIndex: number, scheduleIndex: number) {
    setTutors((prev) =>
      prev.map((t, ti) =>
        ti === tutorIndex
          ? {
              ...t,
              schedules: t.schedules.filter((_, si) => si !== scheduleIndex),
            }
          : t,
      ),
    );
  }

  async function handleImport() {
    if (tutors.length === 0) return;
    setIsImporting(true);
    let imported = 0;

    try {
      for (let i = 0; i < tutors.length; i++) {
        const tutor = tutors[i];
        setImportProgress(
          `Importing ${i + 1} of ${tutors.length}: ${tutor.name}…`,
        );

        const createRes = await fetch("/api/tutors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: tutor.name, type: tutor.type }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          showToast(
            `Failed to create ${tutor.name}: ${err?.error || "Unknown error"}`,
            "error",
          );
          continue;
        }

        const { tutor: created } = await createRes.json();

        for (const subject of tutor.subjects) {
          await fetch(`/api/tutors/${created.id}/subjects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: subject.name, field: subject.field }),
          });
        }

        for (const schedule of tutor.schedules) {
          await fetch(`/api/tutors/${created.id}/schedules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              day: schedule.day,
              start: schedule.start,
              end: schedule.end,
              location: schedule.location,
            }),
          });
        }

        imported++;
      }

      showToast(
        `${imported} tutor${imported > 1 ? "s" : ""} imported successfully!`,
        "success",
      );
      setTutors([]);
      setEmailText("");
      setImportProgress("");
    } catch {
      showToast("Network error during import.", "error");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div style={{ padding: "40px", maxWidth: "860px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <h1
        style={{
          fontSize: "1.75rem",
          fontWeight: "800",
          color: "#0f172a",
          marginBottom: "8px",
        }}
      >
        Import Tutors from Email
      </h1>
      <p
        style={{ color: "#64748b", marginBottom: "32px", fontSize: "0.95rem" }}
      >
        Paste one or more tutor email replies below. AI will extract names,
        subjects, and availability automatically.
      </p>

      {/* Paste stage */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        }}
      >
        <label
          style={{
            fontWeight: "600",
            color: "#0f172a",
            display: "block",
            marginBottom: "10px",
          }}
        >
          Email Replies
        </label>
        <textarea
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          placeholder={`Paste tutor replies here. Example:\n\nTutor name and ID number = Sarah Chen, ID 1234567\nSubjects tutored = Biol 020, Chem 030\nSummer weekly availability = Mon/Wed 10am-2pm, Fridays 9am-1pm\nUnits = Taking 6 Summer units`}
          rows={10}
          style={{
            width: "100%",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "12px",
            fontSize: "0.9rem",
            fontFamily: "monospace",
            resize: "vertical",
            color: "#0f172a",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={handleParse}
          disabled={isParsing || isImporting}
          style={{
            marginTop: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: isParsing ? "#6ee7b7" : "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 20px",
            fontWeight: "600",
            cursor: isParsing ? "not-allowed" : "pointer",
            fontSize: "0.95rem",
          }}
        >
          {isParsing ? (
            <>
              <span style={spinnerStyle} /> Parsing…
            </>
          ) : (
            <>
              <Sparkles size={16} /> Parse Replies
            </>
          )}
        </button>
      </div>

      {/* Preview stage */}
      {tutors.length > 0 && (
        <>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: "700",
              color: "#0f172a",
              marginBottom: "16px",
            }}
          >
            Preview — {tutors.length} tutor{tutors.length > 1 ? "s" : ""} found
          </h2>

          {tutors.map((tutor, ti) => (
            <div
              key={ti}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "20px 24px",
                marginBottom: "16px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "1.05rem",
                      color: "#0f172a",
                    }}
                  >
                    {tutor.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      marginTop: "2px",
                    }}
                  >
                    Tutor
                  </div>
                </div>
                <button
                  onClick={() => removeTutor(ti)}
                  style={{
                    background: "none",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.8rem",
                  }}
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>

              {/* Subjects */}
              {tutor.subjects.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "#64748b",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Subjects
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {tutor.subjects.map((s, si) => (
                      <div
                        key={si}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "6px 10px",
                        }}
                      >
                        <input
                          value={s.name}
                          onChange={(e) =>
                            updateSubject(ti, si, "name", e.target.value)
                          }
                          placeholder="Course (e.g. MATH-021)"
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            fontSize: "0.82rem",
                            outline: "none",
                            fontWeight: "600",
                            color: "#0f172a",
                          }}
                        />
                        <input
                          value={s.field}
                          onChange={(e) =>
                            updateSubject(ti, si, "field", e.target.value)
                          }
                          list="import-field-options"
                          placeholder="Field (e.g. Mathematics)"
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            fontSize: "0.82rem",
                            outline: "none",
                            color: "#475569",
                          }}
                        />
                        <datalist id="import-field-options">
                          <option value="Accounting" />
                          <option value="Art" />
                          <option value="Astronomy" />
                          <option value="Biology" />
                          <option value="Business" />
                          <option value="Chemistry" />
                          <option value="Computer Science" />
                          <option value="English" />
                          <option value="Ethnic Studies" />
                          <option value="History" />
                          <option value="Mathematics" />
                          <option value="Music" />
                          <option value="Physics" />
                          <option value="Psychology" />
                          <option value="Sociology" />
                          <option value="Spanish" />
                          <option value="Vietnamese" />
                        </datalist>
                        <button
                          onClick={() => removeSubject(ti, si)}
                          style={{
                            padding: "2px 7px",
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            borderRadius: "6px",
                            fontSize: "1rem",
                            lineHeight: 1,
                          }}
                          title="Remove subject"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedules */}
              {tutor.schedules.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "#64748b",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Availability
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {tutor.schedules.map((s, si) => (
                      <div
                        key={si}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <select
                          value={s.day}
                          onChange={(e) =>
                            updateSchedule(ti, si, "day", e.target.value)
                          }
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            fontSize: "0.82rem",
                            fontWeight: "600",
                            color: "#0f172a",
                            cursor: "pointer",
                            outline: "none",
                          }}
                        >
                          {[
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                          ].map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <input
                          value={s.start}
                          onChange={(e) =>
                            updateSchedule(ti, si, "start", e.target.value)
                          }
                          placeholder="09:00"
                          style={{
                            width: "72px",
                            padding: "4px 8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            fontSize: "0.82rem",
                            outline: "none",
                            color: "#475569",
                          }}
                        />
                        <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                          –
                        </span>
                        <input
                          value={s.end}
                          onChange={(e) =>
                            updateSchedule(ti, si, "end", e.target.value)
                          }
                          placeholder="17:00"
                          style={{
                            width: "72px",
                            padding: "4px 8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            fontSize: "0.82rem",
                            outline: "none",
                            color: "#475569",
                          }}
                        />
                        <select
                          value={s.location}
                          onChange={(e) =>
                            updateSchedule(
                              ti,
                              si,
                              "location",
                              e.target.value as Location,
                            )
                          }
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            fontSize: "0.82rem",
                            color: "#475569",
                            cursor: "pointer",
                            outline: "none",
                          }}
                        >
                          {LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeSchedule(ti, si)}
                          style={{
                            padding: "2px 7px",
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            borderRadius: "6px",
                            fontSize: "1rem",
                            lineHeight: 1,
                          }}
                          title="Remove shift"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tutor.schedules.length === 0 && tutor.subjects.length === 0 && (
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  No subjects or schedules parsed.
                </div>
              )}
            </div>
          ))}

          {/* Import button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "8px",
            }}
          >
            <button
              onClick={handleImport}
              disabled={isImporting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: isImporting ? "#6ee7b7" : "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontWeight: "700",
                cursor: isImporting ? "not-allowed" : "pointer",
                fontSize: "1rem",
              }}
            >
              {isImporting ? (
                <>
                  <span style={spinnerStyle} /> {importProgress || "Importing…"}
                </>
              ) : (
                <>
                  <Upload size={16} /> Import {tutors.length} Tutor
                  {tutors.length > 1 ? "s" : ""}
                </>
              )}
            </button>

            {!isImporting && (
              <button
                onClick={() => setTutors([])}
                style={{
                  background: "none",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 20px",
                  cursor: "pointer",
                  color: "#64748b",
                  fontWeight: "500",
                }}
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
