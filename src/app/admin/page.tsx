import { logout } from '@/app/actions/auth'

export default function AdminDashboardPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
          Dashboard Overview
        </h1>
        {/* LESSON: This form calls the logout() Server Action when submitted.
            We use a form instead of a button with onClick because Server Actions
            can only be called from forms (or via useTransition) in Server Components. */}
        <form action={logout}>
          <button
            type="submit"
            style={{
              padding: '8px 18px',
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            🚪 Sign Out
          </button>
        </form>
      </div>
      <p style={{ color: "#4b5563", marginBottom: "30px" }}>
        Welcome to the EVC Tutor Schedule admin panel.
      </p>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        <div
          style={{
            padding: "30px",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          }}
        >
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "10px",
            }}
          >
            Getting Started
          </h3>
          <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
            Use the sidebar to navigate to the <strong>Manage Tutors</strong>{" "}
            section. From there, you will soon be able to add new tutors to the
            database, or edit and remove existing ones.
          </p>
        </div>
      </div>
    </div>
  );
}
