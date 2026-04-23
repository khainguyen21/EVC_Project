'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'

// LESSON: useActionState is a React 19 hook that connects a form to a Server Action.
// It tracks the state returned by the action (like our error message)
// and gives us a `pending` flag while the server is processing.

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2140 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
      }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            margin: '0 auto 16px',
          }}>
            🔐
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '0.9rem' }}>
            EVC Tutoring Center
          </p>
        </div>

        {/* LESSON: The form's action prop is set to our Server Action directly.
            When submitted, Next.js sends formData to the login() function on the server. */}
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="username" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px',
            }}>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px',
            }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error message returned from the Server Action */}
          {state?.error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#b91c1c',
              fontSize: '0.875rem',
            }}>
              ⚠️ {state.error}
            </div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            disabled={pending}
            style={{
              marginTop: '8px',
              padding: '12px',
              background: pending ? '#93c5fd' : 'linear-gradient(135deg, #1e3a5f, #2563eb)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: pending ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {pending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
