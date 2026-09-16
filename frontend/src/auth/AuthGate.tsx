import { getUser, handleAuthCallback, login, logout, signup } from '@netlify/identity'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'

type Mode = 'login' | 'signup'
type CurrentUser = Awaited<ReturnType<typeof getUser>>

export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        await handleAuthCallback()
        const current = await getUser()
        if (active) setUser(current)
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : 'Authentication failed')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const requireLogin = () => setUser(null)
    window.addEventListener('tradelogx:auth-required', requireLogin)
    return () => window.removeEventListener('tradelogx:auth-required', requireLogin)
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    const fullName = String(form.get('fullName') || '').trim()
    try {
      if (mode === 'signup') {
        await signup(email, password, { full_name: fullName })
        setMessage('Account created. Check your email to confirm it, then sign in.')
        setMode('login')
      } else {
        const authenticated = await login(email, password)
        setUser(authenticated)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <main className="auth-page"><p>Checking your secure session...</p></main>
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">TRADELOGX</div>
          <p className="auth-kicker">Trade document verification</p>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p>
            {mode === 'login'
              ? 'Sign in to access your verification workspace.'
              : 'Create an account to start verifying trade files.'}
          </p>
          <form onSubmit={submit}>
            {mode === 'signup' ? (
              <label>Full name<input name="fullName" autoComplete="name" required /></label>
            ) : null}
            <label>Email<input name="email" type="email" autoComplete="email" required /></label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                required
              />
            </label>
            {message ? <p className="auth-message" role="status">{message}</p> : null}
            <button className="primary auth-submit" disabled={busy} type="submit">
              {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button
            className="auth-switch"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setMessage('')
            }}
            type="button"
          >
            {mode === 'login' ? 'New to TradeLogX? Create an account' : 'Already have an account? Sign in'}
          </button>
        </section>
      </main>
    )
  }

  return (
    <>
      <div className="auth-session">
        <span>{user.email}</span>
        <button
          type="button"
          onClick={() => void logout().then(() => setUser(null))}
        >
          Sign out
        </button>
      </div>
      {children}
    </>
  )
}
