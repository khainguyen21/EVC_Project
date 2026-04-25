"use client";

import { useEffect, useState } from "react";
import { type Tutor } from "@/types";
import Link from "next/link";
import { useToast } from "@/components/admin/ToastProvider";
import ConfirmModal from "@/components/admin/ConfirmModal";

export default function ManageTutorsPage() {
  const { showToast } = useToast();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // POST request UI state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"tutor" | "professor" | "staff">(
    "tutor",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTutors = () => {
    fetch("/api/tutors?sort=recent")
      .then((response) => response.json())
      .then((data) => {
        // Defensive coding: use empty array if undefined
        setTutors(data.tutors || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching tutors:", error);
        setLoading(false);
      });
  };

  // Fetch tutors on component mount
  useEffect(() => {
    fetchTutors();
  }, []);

  const handleAddTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/tutors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, type: newType }),
      });

      if (res.ok) {
        setIsAdding(false);
        setNewName("");
        setNewType("tutor");
        fetchTutors();
        showToast("Tutor added successfully!", "success");
      } else {
        const errorData = await res.json();
        showToast(errorData?.error || "Failed to add tutor.", "error");
      }
    } catch (err) {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTutor = (id?: number) => {
    if (!id) return;
    setConfirmModal({
      message: "This will permanently remove the tutor and all their subjects and shifts.",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/tutors/${id}`, { method: "DELETE" });
          if (res.ok) {
            fetchTutors();
            showToast("Tutor deleted.", "success");
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

  return (
    <div>
      {/* Custom confirm dialog — renders when a delete is triggered */}
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
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            Manage Tutors
          </h1>
          <p style={{ color: "#4b5563" }}>
            Add, update, or remove tutors and their schedules.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          style={{
            padding: "10px 20px",
            backgroundColor: isAdding ? "#ef4444" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)",
          }}
        >
          {isAdding ? "Cancel" : "+ Add New Tutor"}
        </button>
      </div>

      {/* NEW FORMDOWN AREA */}
      {isAdding && (
        <div
          style={{
            padding: "20px",
            marginBottom: "30px",
            backgroundColor: "white",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          }}
        >
          <h3
            style={{
              marginBottom: "15px",
              fontSize: "1.2rem",
              fontWeight: "600",
            }}
          >
            Adding a new staff member...
          </h3>
          <form
            onSubmit={handleAddTutor}
            style={{ display: "flex", gap: "15px", alignItems: "flex-end" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                flex: 1,
              }}
            >
              <label
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Full Name
              </label>
              <input
                required
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Brandon Ong"
                style={{
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                width: "200px",
              }}
            >
              <label
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Position
              </label>
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as "tutor" | "professor" | "staff")
                }
                style={{
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "white",
                }}
              >
                <option value="tutor">Tutor</option>
                <option value="professor">Professor</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "11px 20px",
                backgroundColor: "#3b82f6",
                color: "white",
                fontWeight: "600",
                borderRadius: "6px",
                border: "none",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Saving..." : "Save to Database"}
            </button>
          </form>
        </div>
      )}

      {/* Container for the table */}
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "60px",
              textAlign: "center",
              color: "#6b7280",
              fontSize: "1.1rem",
            }}
          >
            Loading tutors...
          </div>
        ) : tutors.length === 0 ? (
          <div
            style={{
              padding: "60px",
              textAlign: "center",
              color: "#6b7280",
              fontSize: "1.1rem",
            }}
          >
            No tutors found in the database.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead
                style={{
                  backgroundColor: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <tr>
                  <th
                    style={{
                      padding: "16px 20px",
                      color: "#374151",
                      fontWeight: "600",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      padding: "16px 20px",
                      color: "#374151",
                      fontWeight: "600",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      padding: "16px 20px",
                      color: "#374151",
                      fontWeight: "600",
                    }}
                  >
                    Subjects
                  </th>
                  <th
                    style={{
                      padding: "16px 20px",
                      color: "#374151",
                      fontWeight: "600",
                      textAlign: "right",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tutors.map((tutor, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom:
                        index === tutors.length - 1
                          ? "none"
                          : "1px solid #e5e7eb",
                    }}
                  >
                    <td
                      style={{
                        padding: "16px 20px",
                        fontWeight: "500",
                        color: "#111827",
                      }}
                    >
                      {tutor.name}
                    </td>

                    <td style={{ padding: "16px 20px", color: "#6b7280" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          backgroundColor:
                            tutor.type === "professor"
                              ? "#ede9fe"
                              : tutor.type === "staff"
                                ? "#dcfce3"
                                : "#e0f2fe",
                          color:
                            tutor.type === "professor"
                              ? "#5b21b6"
                              : tutor.type === "staff"
                                ? "#166534"
                                : "#0369a1",
                          borderRadius: "9999px",
                          fontSize: "0.85rem",
                          fontWeight: "500",
                        }}
                      >
                        {tutor.type === "professor"
                          ? "Professor"
                          : tutor.type === "staff"
                            ? "Staff"
                            : "Tutor"}
                      </span>
                    </td>

                    <td
                      style={{
                        padding: "16px 20px",
                        color: "#4b5563",
                        maxWidth: "350px",
                      }}
                    >
                      <div
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {tutor.subjects && tutor.subjects.length > 0 ? (
                          tutor.subjects
                            .map((s: { name: string }) => s.name)
                            .join(", ")
                        ) : (
                          <span
                            style={{ color: "#9ca3af", fontStyle: "italic" }}
                          >
                            No subjects yet
                          </span>
                        )}
                      </div>
                    </td>

                    <td
                      style={{
                        padding: "16px 20px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Link href={`/admin/tutors/${tutor.id}`}>
                        <button
                          style={{
                            padding: "6px 14px",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            marginRight: "8px",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                          }}
                        >
                          Edit
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDeleteTutor(tutor.id)}
                        style={{
                          padding: "6px 14px",
                          backgroundColor: "#fee2e2",
                          color: "#b91c1c",
                          border: "1px solid #fca5a5",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}