'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// --- Types ---
type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

// --- Context ---
const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// --- Provider ---
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    // Auto-dismiss after 3.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container — fixed top-right corner */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// --- Single Toast Item ---
const STYLES: Record<ToastType, { bg: string; border: string; icon: string; color: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', icon: '✅', color: '#166534' },
  error:   { bg: '#fef2f2', border: '#fca5a5', icon: '❌', color: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#fcd34d', icon: '⚠️', color: '#92400e' },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const s = STYLES[toast.type]
  return (
    <div
      onClick={onDismiss}
      style={{
        pointerEvents: 'all',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '14px 18px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        minWidth: '280px',
        maxWidth: '380px',
        cursor: 'pointer',
        animation: 'slideIn 0.3s ease',
        color: s.color,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{s.icon}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: '500', flex: 1 }}>{toast.message}</span>
      <span style={{ fontSize: '1rem', opacity: 0.5, flexShrink: 0 }}>×</span>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
