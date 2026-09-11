import { logout } from '@/app/actions/auth'
import Link from 'next/link'
import { LogOut, ArrowRight, ShieldCheck, AlertTriangle, CalendarDays } from 'lucide-react'
import { getActiveTermSafe } from '@/lib/activeTerm'
import { getCampusNow } from '@/utils/availability'
import { formatTermDate, getTermLifecycle } from '@/utils/term'

// The admin must always see the real current state — never a build-time
// snapshot of which term is active.
export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  // Surfaced here because this is the first page after login: if the active
  // term has lapsed, students are seeing "Semester Over" right now.
  const term = await getActiveTermSafe()
  const lifecycle = term ? getTermLifecycle(term, getCampusNow().date) : null
  const termAlert =
    !term
      ? 'No term is active, so the homepage banner has no dates and closed days are not applied.'
      : lifecycle === 'ended'
        ? `${term.name} ended on ${formatTermDate(term.endDate)}. Students see “Semester Over” and live availability is switched off.`
        : lifecycle === 'upcoming'
          ? `${term.name} starts ${formatTermDate(term.startDate)}. Until then students see “Not Yet In Session”.`
          : null

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

      {termAlert && (
        <Link
          href="/admin/terms"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '14px',
            color: '#991b1b',
            textDecoration: 'none',
            lineHeight: 1.6,
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            {termAlert} <strong style={{ textDecoration: 'underline' }}>Manage terms →</strong>
          </span>
        </Link>
      )}

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
          <p style={{ color: "#475569", lineHeight: "1.6", marginBottom: "16px" }}>
            The scheduling system is running normally. You have full access to manage staff, assign subjects, and update the weekly schedule.
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: "#475569", marginBottom: "24px" }}>
            <CalendarDays size={16} />
            {term && lifecycle === 'current'
              ? `Current term: ${term.name} (through ${formatTermDate(term.endDate)})`
              : 'No term is currently running.'}
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
          <Link href="/admin/tutors" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'white', color: '#059669', borderRadius: '12px', fontWeight: '600', textDecoration: 'none', width: 'fit-content', transition: 'all 0.2s' }}>
            Manage Staff
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
