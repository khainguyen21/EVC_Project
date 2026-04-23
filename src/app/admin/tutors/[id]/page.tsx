"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function EditTutorPage() {
  const params = useParams();
  const id = params.id as string;

  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Basic Info Form states
  const [name, setName] = useState("");
  const [type, setType] = useState("tutor");
  const [isSavingBasics, setIsSavingBasics] = useState(false);

  // Subject Form states
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectField, setNewSubjectField] = useState("");

  // Schedule Form states
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [shiftDay, setShiftDay] = useState("Monday");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [shiftLocation, setShiftLocation] = useState("LE-237");

  const fetchTutorProfile = () => {
    fetch(`/api/tutors/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.tutor) {
          setTutor(data.tutor);
          setName(data.tutor.name);
          setType(data.tutor.type);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTutorProfile();
  }, [id]);

  const handleSaveBasics = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBasics(true);

    try {
      const res = await fetch(`/api/tutors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });
      if (res.ok) {
        alert("Basic info saved successfully!");
      }
    } catch {
      alert("Failed to save.");
    } finally {
      setIsSavingBasics(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tutors/${id}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubjectName, field: newSubjectField })
      });
      if (res.ok) {
        setIsAddingSubject(false);
        setNewSubjectName("");
        setNewSubjectField("");
        fetchTutorProfile();
      }
    } catch (err) {
      alert("Failed to add subject");
    }
  };

  const handleDeleteSubject = async (subjectId: number) => {
    if (!window.confirm("Remove this subject from their profile?")) return;
    try {
      const res = await fetch(`/api/tutors/${id}/subjects/${subjectId}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchTutorProfile();
    } catch (err) {
      alert("Failed to remove subject");
    }
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tutors/${id}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: shiftDay, start: shiftStart, end: shiftEnd, location: shiftLocation })
      });
      if (res.ok) {
        setIsAddingShift(false);
        setShiftStart("");
        setShiftEnd("");
        fetchTutorProfile();
      }
    } catch (err) {
      alert("Failed to add shift");
    }
  };

  const handleDeleteShift = async (scheduleId: number) => {
    if (!window.confirm("Remove this shift from their schedule?")) return;
    try {
      const res = await fetch(`/api/tutors/${id}/schedules/${scheduleId}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchTutorProfile();
    } catch (err) {
      alert("Failed to remove shift");
    }
  };

  if (loading)
    return <div style={{ padding: "40px" }}>Loading tutor data...</div>;
  if (!tutor) return <div style={{ padding: "40px" }}>Tutor not found.</div>;

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/admin/tutors"
          style={{
            color: "#3b82f6",
            textDecoration: "none",
            fontWeight: "500",
          }}
        >
          &larr; Back to all tutors
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
          Edit Profile: {tutor.name}
        </h1>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}
      >
        {/* Left Column: Basic Info */}
        <div
          style={{
            backgroundColor: "white",
            padding: "25px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            alignSelf: "start",
          }}
        >
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: "600",
              marginBottom: "20px",
            }}
          >
            Basic Information
          </h3>

          <form
            onSubmit={handleSaveBasics}
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                }}
              />
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
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
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  backgroundColor: "white",
                  fontSize: "1rem",
                }}
              >
                <option value="tutor">Tutor</option>
                <option value="professor">Professor</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSavingBasics}
              style={{
                marginTop: "10px",
                padding: "10px",
                backgroundColor: "#10b981",
                color: "white",
                borderRadius: "6px",
                border: "none",
                fontWeight: "600",
                cursor: isSavingBasics ? "not-allowed" : "pointer",
              }}
            >
              {isSavingBasics ? "Saving..." : "Save Basics"}
            </button>
          </form>
        </div>

        {/* Right Column: Complex Nested Data */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Subjects Box */}
        <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "5px" }}>Assigned Subjects</h3>
          <p style={{ color: "#6b7280", marginBottom: "20px", fontSize: "0.9rem" }}>Manage the subjects this staff member is authorized to teach.</p>
          
          <ul style={{ marginBottom: "15px", paddingLeft: "0", color: "#374151", listStyle: "none" }}>
            {tutor.subjects.length > 0 ? tutor.subjects.map((s: any) => (
              <li key={s.id} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb", padding: "10px 15px", borderRadius: "6px", border: "1px solid #f3f4f6" }}>
                <div>
                  <span style={{ fontWeight: "600" }}>{s.name}</span>
                  <span style={{ color: "#6b7280", marginLeft: "10px", fontSize: "0.9rem" }}>{s.field}</span>
                </div>
                <button onClick={() => handleDeleteSubject(s.id)} style={{ padding: "4px 8px", backgroundColor: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "4px", fontSize: "0.8rem", cursor: "pointer", fontWeight: "500" }}>Remove</button>
              </li>
            )) : (
              <div style={{ color: "#9ca3af", fontStyle: "italic", marginLeft: "5px" }}>No subjects assigned yet.</div>
            )}
          </ul>

          {!isAddingSubject ? (
            <button 
              onClick={() => setIsAddingSubject(true)} 
              style={{ padding: "8px 15px", backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontWeight: "500", color: "#374151" }}
            >
              + Add Custom Subject
            </button>
          ) : (
            <form onSubmit={handleAddSubject} style={{ padding: "15px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <input required placeholder="Course (e.g. MATH 021-023)" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }} />
                <input required list="field-options" placeholder="Field (e.g. Mathematics)" value={newSubjectField} onChange={e => setNewSubjectField(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }} />
                <datalist id="field-options">
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
                  <option value="Open Computer Lab" />
                  <option value="Physics" />
                  <option value="Psychology" />
                  <option value="Sociology" />
                  <option value="Spanish" />
                  <option value="Vietnamese" />
                </datalist>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" style={{ padding: "8px 15px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "500" }}>Save</button>
                <button type="button" onClick={() => setIsAddingSubject(false)} style={{ padding: "8px 15px", backgroundColor: "transparent", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
              </div>
            </form>
          )}
        </div>

          {/* Schedule Box */}
          <div
            style={{
              backgroundColor: "white",
              padding: "25px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            }}
          >
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: "600",
                marginBottom: "5px",
              }}
            >
              Weekly Schedule
            </h3>
            <p
              style={{
                color: "#6b7280",
                marginBottom: "20px",
                fontSize: "0.9rem",
              }}
            >
              Manage standard availability.
            </p>

            <table
              style={{
                width: "100%",
                marginBottom: "15px",
                borderCollapse: "collapse",
              }}
            >
              <tbody>
                {tutor.schedules.length > 0 ? (
                  tutor.schedules.map((s: any) => (
                    <tr
                      key={s.id}
                      style={{ borderBottom: "1px solid #e5e7eb" }}
                    >
                      <td style={{ padding: "10px 5px", fontWeight: "500" }}>
                        {s.day}
                      </td>
                      <td style={{ padding: "10px 5px", color: "#6b7280" }}>
                        {s.start} — {s.end}
                      </td>
                      <td style={{ padding: "10px 5px", textAlign: "right" }}>
                        📍 {s.location}
                      </td>
                      <td style={{ padding: "10px 5px", textAlign: "right" }}>
                        <button onClick={() => handleDeleteShift(s.id)} style={{ padding: "4px 8px", backgroundColor: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "4px", fontSize: "0.8rem", cursor: "pointer", fontWeight: "500" }}>Delete</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        color: "#9ca3af",
                        fontStyle: "italic",
                        padding: "10px 0",
                      }}
                    >
                      No shifts scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {!isAddingShift ? (
              <button 
                onClick={() => setIsAddingShift(true)} 
                style={{ padding: "8px 15px", backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontWeight: "500", color: "#374151" }}
              >
                + Add Shift
              </button>
            ) : (
              <form onSubmit={handleAddShift} style={{ padding: "15px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <select required value={shiftDay} onChange={e => setShiftDay(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", backgroundColor: "white" }}>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                  <select required value={shiftLocation} onChange={e => setShiftLocation(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", backgroundColor: "white" }}>
                    <option value="LE-237">LE-237 (Library)</option>
                    <option value="MS-112">MS-112 (MSRC)</option>
                    <option value="SQ-231">SQ-231 (Biology)</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input required placeholder="Start (e.g. 9:00)" value={shiftStart} onChange={e => setShiftStart(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }} />
                  <input required placeholder="End (e.g. 17:00)" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }} />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="submit" style={{ padding: "8px 15px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "500" }}>Save Shift</button>
                  <button type="button" onClick={() => setIsAddingShift(false)} style={{ padding: "8px 15px", backgroundColor: "transparent", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
