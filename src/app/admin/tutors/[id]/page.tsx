"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/admin/ToastProvider";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { ArrowLeft, User, BookOpen, Calendar as CalendarIcon, MapPin, Clock, Save, Plus, Trash2, BookText } from "lucide-react";

type TutorSubject = { id: number; name: string; field: string };
type TutorSchedule = { id: number; day: string; start: string; end: string; location: string };
type TutorDetail = { id: number; name: string; type: string; subjects: TutorSubject[]; schedules: TutorSchedule[] };

export default function EditTutorPage() {
  const { showToast } = useToast();
  const params = useParams();
  const id = params.id as string;

  const [tutor, setTutor] = useState<TutorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

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

  useEffect(() => { fetchTutorProfile(); }, [id]);

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
        showToast("Basic info saved successfully!", "success");
      }
    } catch {
      showToast("Failed to save. Please try again.", "error");
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
        showToast("Subject added!", "success");
      }
    } catch {
      showToast("Failed to add subject.", "error");
    }
  };

  const handleDeleteSubject = (subjectId: number) => {
    setConfirmModal({
      message: "Remove this subject from the tutor's profile?",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/tutors/${id}/subjects/${subjectId}`, { method: 'DELETE' });
          if (res.ok) {
            fetchTutorProfile();
            showToast("Subject removed.", "success");
          }
        } catch {
          showToast("Failed to remove subject.", "error");
        }
      },
    });
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
        showToast("Shift added!", "success");
      }
    } catch {
      showToast("Failed to add shift.", "error");
    }
  };

  const handleDeleteShift = (scheduleId: number) => {
    setConfirmModal({
      message: "Remove this shift from the tutor's schedule?",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/tutors/${id}/schedules/${scheduleId}`, { method: 'DELETE' });
          if (res.ok) {
            fetchTutorProfile();
            showToast("Shift removed.", "success");
          }
        } catch {
          showToast("Failed to remove shift.", "error");
        }
      },
    });
  };

  if (loading)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <p style={{ fontSize: '1.1rem' }}>Loading staff profile...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );

  if (!tutor) return <div style={{ padding: "40px", textAlign: 'center', color: '#64748b', fontSize: '1.2rem' }}>Staff member not found.</div>;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/admin/tutors"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#64748b",
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "0.95rem",
            padding: "8px 16px",
            backgroundColor: "white",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            border: "1px solid #e2e8f0",
            transition: "all 0.2s"
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#0f172a'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
        >
          <ArrowLeft size={16} /> Back to Directory
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2.25rem", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.02em", margin: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
            <User size={24} />
          </div>
          {tutor.name}
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Left Column: Basic Info */}
        <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)", alignSelf: "start", position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#10b981' }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "24px", color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="#64748b" /> Basic Information
          </h3>

          <form onSubmit={handleSaveBasics} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.95rem", fontWeight: "600", color: "#475569" }}>Full Name</label>
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "12px 16px", border: "2px solid #e2e8f0", borderRadius: "12px", fontSize: "1rem", outline: "none", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.95rem", fontWeight: "600", color: "#475569" }}>Role / Position</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: "12px 16px", border: "2px solid #e2e8f0", borderRadius: "12px", backgroundColor: "white", fontSize: "1rem", outline: "none", cursor: "pointer", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                <option value="tutor">Tutor</option>
                <option value="professor">Professor</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <button type="submit" disabled={isSavingBasics} style={{ marginTop: "12px", padding: "14px", backgroundColor: "#0f172a", color: "white", borderRadius: "12px", border: "none", fontWeight: "600", fontSize: '1rem', cursor: isSavingBasics ? "not-allowed" : "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background-color 0.2s' }} onMouseEnter={e => { if(!isSavingBasics) e.currentTarget.style.backgroundColor = '#1e293b' }} onMouseLeave={e => { if(!isSavingBasics) e.currentTarget.style.backgroundColor = '#0f172a' }}>
              <Save size={18} /> {isSavingBasics ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Right Column: Complex Nested Data */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Subjects Box */}
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "8px", color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={20} color="#64748b" /> Assigned Subjects
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>Manage the subjects this staff member is authorized to teach.</p>
              </div>
              
              {!isAddingSubject && (
                <button onClick={() => setIsAddingSubject(true)} style={{ padding: "10px 16px", backgroundColor: "#f1f5f9", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", color: "#0f172a", display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}>
                  <Plus size={16} /> Add Subject
                </button>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {tutor.subjects.length > 0 ? tutor.subjects.map((s: TutorSubject) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div>
                    <div style={{ fontWeight: "700", color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><BookText size={14} color="#10b981" /> {s.name}</div>
                    <div style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: '500' }}>{s.field}</div>
                  </div>
                  <button onClick={() => handleDeleteSubject(s.id)} style={{ padding: "8px", backgroundColor: "transparent", color: "#ef4444", border: "none", borderRadius: "8px", cursor: "pointer", transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Trash2 size={18} />
                  </button>
                </div>
              )) : (
                <div style={{ color: "#94a3b8", fontStyle: "italic", gridColumn: '1 / -1', padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>No subjects assigned yet.</div>
              )}
            </div>

            {isAddingSubject && (
              <form onSubmit={handleAddSubject} style={{ padding: "20px", backgroundColor: "#f8fafc", border: "1px solid #10b981", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "16px", animation: 'fadeIn 0.3s' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>Add New Subject</h4>
                <div style={{ display: "flex", gap: "12px" }}>
                  <input required placeholder="Course (e.g. MATH 021)" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: 'none' }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                  <input required list="field-options" placeholder="Field (e.g. Mathematics)" value={newSubjectField} onChange={e => setNewSubjectField(e.target.value)} style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: 'none' }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
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
                    <option value="Physics" />
                    <option value="Psychology" />
                    <option value="Sociology" />
                    <option value="Spanish" />
                    <option value="Vietnamese" />
                  </datalist>
                </div>
                <div style={{ display: "flex", gap: "12px", justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setIsAddingSubject(false)} style={{ padding: "10px 20px", backgroundColor: "transparent", color: "#64748b", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: '600' }}>Cancel</button>
                  <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>Save Subject</button>
                </div>
              </form>
            )}
          </div>

          {/* Schedule Box */}
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "8px", color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={20} color="#64748b" /> Weekly Schedule
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>Manage standard weekly availability and locations.</p>
              </div>
              
              {!isAddingShift && (
                <button onClick={() => setIsAddingShift(true)} style={{ padding: "10px 16px", backgroundColor: "#f1f5f9", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", color: "#0f172a", display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}>
                  <Plus size={16} /> Add Shift
                </button>
              )}
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '16px 20px', textAlign: 'left', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Day</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tutor.schedules.length > 0 ? (
                    tutor.schedules.map((s: TutorSchedule, index) => (
                      <tr key={s.id} style={{ borderBottom: index === tutor.schedules.length - 1 ? 'none' : "1px solid #e2e8f0", backgroundColor: 'white' }}>
                        <td style={{ padding: "16px 20px", fontWeight: "600", color: '#0f172a' }}>
                          {s.day}
                        </td>
                        <td style={{ padding: "16px 20px", color: "#475569", fontWeight: '500' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} color="#94a3b8" /> {s.start} — {s.end}
                          </div>
                        </td>
                        <td style={{ padding: "16px 20px", color: '#0f172a' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                            <MapPin size={12} color="#64748b" /> {s.location}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <button onClick={() => handleDeleteShift(s.id)} style={{ padding: "8px", backgroundColor: "transparent", color: "#ef4444", border: "none", borderRadius: "8px", cursor: "pointer", transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ color: "#94a3b8", fontStyle: "italic", padding: "30px", textAlign: 'center' }}>
                        No shifts scheduled for this staff member.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {isAddingShift && (
              <form onSubmit={handleAddShift} style={{ padding: "20px", backgroundColor: "#f8fafc", border: "1px solid #10b981", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "16px", animation: 'fadeIn 0.3s' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>Add New Shift</h4>
                <div style={{ display: "flex", gap: "12px", flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Day of Week</label>
                    <select required value={shiftDay} onChange={e => setShiftDay(e.target.value)} style={{ width: '100%', padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "white", outline: 'none' }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#cbd5e1'}>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                    </select>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Location</label>
                    <select required value={shiftLocation} onChange={e => setShiftLocation(e.target.value)} style={{ width: '100%', padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "white", outline: 'none' }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#cbd5e1'}>
                      <option value="LE-237">LE-237 (Library)</option>
                      <option value="MS-112">MS-112 (MSRC)</option>
                      <option value="SQ-231">SQ-231 (Biology)</option>
                      <option value="Online">Online / NetTutor</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Start Time (e.g. 9:00)</label>
                    <input required placeholder="e.g. 9:00" value={shiftStart} onChange={e => setShiftStart(e.target.value)} style={{ width: '100%', padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: 'none' }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>End Time (e.g. 17:00)</label>
                    <input required placeholder="e.g. 17:00" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} style={{ width: '100%', padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: 'none' }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="button" onClick={() => setIsAddingShift(false)} style={{ padding: "10px 20px", backgroundColor: "transparent", color: "#64748b", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: '600' }}>Cancel</button>
                  <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>Save Shift</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}
