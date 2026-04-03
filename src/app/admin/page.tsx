export default function AdminDashboardPage() {
  return (
    <div>
      <h1
        style={{ fontSize: "2rem", marginBottom: "10px", fontWeight: "bold" }}
      >
        Dashboard Overview
      </h1>
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
