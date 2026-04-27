import { logout } from '@/app/actions/auth'
import { LogOut, ArrowRight, ShieldCheck } from 'lucide-react'

export default function AdminDashboardPage() {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.03em", marginBottom: "8px" }}>
            Dashboard Overview
          </h1>
          <p style={{ color: "#64748b", fontSize: "1.1rem" }}>
            Welcome back to the EVC Tutor Schedule admin panel.
          </p>
        </div>
        
        <form action={logout}>
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'white',
              color: '#ef4444',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.05)',
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        {/* Welcome Card */}
        <div style={{ padding: "32px", backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "24px", boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.05)", position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(255,255,255,0) 70%)', transform: 'translate(30%, -30%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              System Status
            </h3>
          </div>
          <p style={{ color: "#475569", lineHeight: "1.6", marginBottom: "24px" }}>
            The scheduling system is running normally. You have full access to manage staff, assign subjects, and update the weekly schedule.
          </p>
        </div>

        {/* Quick Actions Card */}
        <div style={{ padding: "32px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", border: "1px solid transparent", borderRadius: "24px", boxShadow: "0 10px 30px -10px rgba(16, 185, 129, 0.4)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "12px", color: "white" }}>
              Quick Action
            </h3>
            <p style={{ color: "rgba(255,255,255,0.9)", lineHeight: "1.6", marginBottom: "24px" }}>
              Ready to add a new tutor or update an existing schedule? Head over to the Staff Management section.
            </p>
          </div>
          <a href="/admin/tutors" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'white', color: '#059669', borderRadius: '12px', fontWeight: '600', textDecoration: 'none', width: 'fit-content', transition: 'all 0.2s' }}>
            Manage Staff
            <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </div>
  );
}
