'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid password')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '40px',
      }}>
        {/* Logo/Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            fontSize: '24px',
          }}>
            ◈
          </div>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--text)',
            marginBottom: '4px',
          }}>
            Admin
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Enter your password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'var(--surface2)',
                border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => {
                if (!error) e.target.style.borderColor = 'var(--accent)'
              }}
              onBlur={e => {
                if (!error) e.target.style.borderColor = 'var(--border)'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid rgba(231, 76, 60, 0.3)',
              borderRadius: 'var(--radius)',
              color: 'var(--danger)',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '12px',
              background: loading || !password
                ? 'var(--border)'
                : 'linear-gradient(135deg, var(--accent), var(--accent2))',
              border: 'none',
              borderRadius: 'var(--radius)',
              color: loading || !password ? 'var(--muted)' : '#1a1a1a',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
