import { getUser, handleAuthCallback, login, acceptInvite, updateUser } from '@netlify/identity'
import { type FormEvent, type ReactNode, useEffect, useState, useRef, createContext, useContext } from 'react'

const UserContext = createContext('')
export const useUserId = () => useContext(UserContext)

type Mode = 'login' | 'invite' | 'recovery'
type CurrentUser = Awaited<ReturnType<typeof getUser>>

export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [message, setMessage] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const callback = useRef<ReturnType<typeof handleAuthCallback> | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        callback.current ??= handleAuthCallback()
        const result = await callback.current
        if (!active) return
        if (result?.type === 'invite' && result.token) {
          setInviteToken(result.token)
          setMode('invite')
          return
        }
        if (result?.type === 'recovery') {
          setMode('recovery')
          return
        }
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
    try {
      if (mode !== 'login') {
        if (password !== String(form.get('confirmPassword') || '')) {
          setMessage('The passwords do not match.')
          return
        }
        if (mode === 'invite' && !inviteToken) {
          setMessage('Open the invitation link in your email to create your account.')
          return
        }
        const authenticated = mode === 'invite'
          ? await acceptInvite(inviteToken!, password)
          : await updateUser({ password })
        setInviteToken(null)
        setMode('login')
        setUser(authenticated)
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

  if (!user || mode !== 'login') {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">TRADELOGX</div>
          <p className="auth-kicker">Trade document verification</p>
          <h1>{mode === 'login' ? 'Welcome back' : mode === 'invite' ? 'Accept your invitation' : 'Set a new password'}</h1>
          <p>
            {mode === 'login'
              ? 'Sign in to access your verification workspace.'
              : 'Choose a password to securely access your verification workspace.'}
          </p>
          <form onSubmit={submit}>
            {mode === 'login' ? <label>Email<input name="email" type="email" autoComplete="email" required /></label> : null}
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
            {mode !== 'login' ? <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label> : null}
            {message ? <p className="auth-message" role="status">{message}</p> : null}
            <button className="primary auth-submit" disabled={busy} type="submit">
              {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : mode === 'invite' ? 'Activate account' : 'Save password'}
            </button>
          </form>
          <p>Access is by invitation for approved TradeLogX customers. Use the personal invitation sent to your email, or <a href="https://tradelogx.com">contact TradeLogX</a> to request access.</p>
        </section>
      </main>
    )
  }

  return (
    <>
      <UserContext.Provider key={user.id} value={user.id}>{children}</UserContext.Provider>
    </>
  )
}
