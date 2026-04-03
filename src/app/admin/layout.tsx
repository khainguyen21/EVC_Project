import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6', color: '#111827' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: '#1f2937', color: 'white', padding: '30px 20px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '40px', fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '0.05em', color: '#10b981' }}>
          EVC ADMIN
        </h2>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          <Link href="/admin" style={{ color: '#e5e7eb', textDecoration: 'none', fontWeight: '500', padding: '8px 12px', borderRadius: '6px', transition: 'background-color 0.2s' }}>
            📊 Dashboard
          </Link>
          <Link href="/admin/tutors" style={{ color: '#e5e7eb', textDecoration: 'none', fontWeight: '500', padding: '8px 12px', borderRadius: '6px', transition: 'background-color 0.2s' }}>
            👩‍🏫 Manage Tutors
          </Link>
          
          <div style={{ marginTop: 'auto', borderTop: '1px solid #374151', paddingTop: '20px' }}>
            <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.9rem', display: 'block', padding: '8px 12px' }}>
              ← Public Schedule
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px 60px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
