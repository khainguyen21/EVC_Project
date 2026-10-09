'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/admin/Sidebar'

// The login page lives under /admin but is seen signed out, so it gets the
// whole screen instead of the sidebar and the padded panel.
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '48px 64px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
