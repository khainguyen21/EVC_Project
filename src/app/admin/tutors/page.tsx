"use client";

import { useEffect, useState } from "react";
import { type Tutor } from "@/types";
import Link from "next/link";
import { useToast } from "@/components/admin/ToastProvider";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { Users, Plus, Edit2, Trash2, GraduationCap, Briefcase, UserSquare2, Search } from "lucide-react";

export default function ManageTutorsPage() {
  const { showToast } = useToast();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
        setTutors(data.tutors || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching tutors:", error);
        setLoading(false);
      });
  };

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
        showToast("Staff member added successfully!", "success");
      } else {
        const errorData = await res.json();
        showToast(errorData?.error || "Failed to add staff.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTutor = (id?: number) => {
    if (!id) return;
    setConfirmModal({
      message: "This will permanently remove the staff member and all their subjects and shifts.",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/tutors/${id}`, { method: "DELETE" });
          if (res.ok) {
            fetchTutors();
            showToast("Staff member deleted.", "success");
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

  const filteredTutors = tutors.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.03em", marginBottom: "8px" }}>
            Manage Staff
          </h1>
          <p style={{ color: "#64748b", fontSize: "1.1rem" }}>
            Add, update, or remove staff members and their schedules.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            background: isAdding ? "white" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: isAdding ? "#ef4444" : "white",
            border: isAdding ? "1px solid #fca5a5" : "none",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "0.95rem",
            boxShadow: isAdding ? "none" : "0 8px 20px -8px rgba(16, 185, 129, 0.5)",
            transition: "all 0.2s",
          }}
        >
          {isAdding ? "Cancel" : <><Plus size={20} /> Add Staff</>}
        </button>
      </div>

      {isAdding && (
        <div style={{ padding: "32px", marginBottom: "32px", backgroundColor: "white", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)", animation: 'slideDown 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserSquare2 size={20} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              Add New Staff Member
            </h3>
          </div>
          
          <form onSubmit={handleAddTutor} style={{ display: "flex", gap: "20px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 300px" }}>
              <label style={{ fontSize: "0.95rem", fontWeight: "600", color: "#475569" }}>Full Name</label>
              <input required type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Brandon Ong" style={{ padding: "12px 16px", border: "2px solid #e2e8f0", borderRadius: "12px", fontSize: "1rem", outline: "none", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "250px" }}>
              <label style={{ fontSize: "0.95rem", fontWeight: "600", color: "#475569" }}>Role / Position</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as any)} style={{ padding: "12px 16px", border: "2px solid #e2e8f0", borderRadius: "12px", fontSize: "1rem", backgroundColor: "white", outline: "none", cursor: "pointer", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                <option value="tutor">Tutor</option>
                <option value="professor">Professor</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <button type="submit" disabled={isSubmitting} style={{ padding: "12px 28px", backgroundColor: "#0f172a", color: "white", fontWeight: "600", borderRadius: "12px", border: "none", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1, transition: "background-color 0.2s", height: '46px' }}>
              {isSubmitting ? "Saving..." : "Save Staff"}
            </button>
          </form>
        </div>
      )}

      <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "24px", overflow: "hidden", boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.05)" }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#64748b" /> Staff Directory
          </h2>
          <div style={{ position: 'relative' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '10px 16px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', outline: 'none', width: '250px' }} 
              onFocus={e => e.target.style.borderColor = '#10b981'} 
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b", fontSize: "1.1rem" }}>
            <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
            <br />
            Loading directory...
          </div>
        ) : filteredTutors.length === 0 ? (
          <div style={{ padding: "80px", textAlign: "center", color: "#64748b", display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <Users size={32} />
            </div>
            <p style={{ fontSize: "1.1rem", margin: 0 }}>No staff members found.</p>
            {searchTerm && <button onClick={() => setSearchTerm('')} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Clear search</button>}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "16px 32px", color: "#475569", fontWeight: "600", fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff Member</th>
                  <th style={{ padding: "16px 32px", color: "#475569", fontWeight: "600", fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                  <th style={{ padding: "16px 32px", color: "#475569", fontWeight: "600", fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subjects</th>
                  <th style={{ padding: "16px 32px", color: "#475569", fontWeight: "600", fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTutors.map((tutor, index) => (
                  <tr key={index} style={{ borderBottom: index === filteredTutors.length - 1 ? "none" : "1px solid #e2e8f0", transition: "background-color 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: "20px 32px" }}>
                      <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "1.05rem" }}>{tutor.name}</div>
                    </td>

                    <td style={{ padding: "20px 32px" }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: "6px 12px", 
                        backgroundColor: tutor.type === "professor" ? "#eef2ff" : tutor.type === "staff" ? "#f0fdf4" : "#eff6ff", 
                        color: tutor.type === "professor" ? "#4f46e5" : tutor.type === "staff" ? "#16a34a" : "#2563eb", 
                        borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600" 
                      }}>
                        {tutor.type === "professor" ? <GraduationCap size={14} /> : tutor.type === "staff" ? <Briefcase size={14} /> : <UserSquare2 size={14} />}
                        {tutor.type === "professor" ? "Professor" : tutor.type === "staff" ? "Staff" : "Tutor"}
                      </span>
                    </td>

                    <td style={{ padding: "20px 32px", color: "#475569", maxWidth: "350px" }}>
                      <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis", lineHeight: '1.5' }}>
                        {tutor.subjects && tutor.subjects.length > 0 ? (
                          tutor.subjects.map((s: { name: string }) => s.name).join(", ")
                        ) : (
                          <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: '0.9rem' }}>No subjects assigned</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: "20px 32px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link href={`/admin/tutors/${tutor.id}`}>
                        <button style={{ padding: "8px 16px", backgroundColor: "white", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: "8px", marginRight: "12px", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600", display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                          <Edit2 size={14} /> Edit
                        </button>
                      </Link>
                      <button onClick={() => handleDeleteTutor(tutor.id)} style={{ padding: "8px 16px", backgroundColor: "#fef2f2", color: "#ef4444", border: "1px solid #fee2e2", borderRadius: "8px", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600", display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fef2f2'}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}