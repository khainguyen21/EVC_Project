import { ToastProvider } from '@/components/admin/ToastProvider'
import Sidebar from '@/components/admin/Sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '48px 64px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
