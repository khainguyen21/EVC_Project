'use client'

import { useEffect, useRef } from 'react'

interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ message, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Focus the Cancel button by default so accidental Enter key doesn't confirm
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <>
      {/* Dark overlay */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Modal box */}
      <div
        role="alertdialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10001,
          background: 'white',
          borderRadius: '14px',
          padding: '32px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
          fontFamily: 'Inter, system-ui, sans-serif',
          animation: 'popIn 0.2s ease',
        }}
      >
        {/* Icon */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
          marginBottom: '16px',
        }}>
          🗑️
        </div>

        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '8px',
        }}>
          Are you sure?
        </h3>

        <p style={{
          color: '#6b7280',
          fontSize: '0.9rem',
          lineHeight: '1.5',
          marginBottom: '24px',
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            style={{
              padding: '9px 20px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '9px 20px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Yes, delete it
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn  { from { opacity: 0; transform: translate(-50%, -48%) scale(0.96) }
                            to   { opacity: 1; transform: translate(-50%, -50%) scale(1) } }
      `}</style>
    </>
  )
}
