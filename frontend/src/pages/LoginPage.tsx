import { FormEvent, useState } from 'react'
import { useAuthStore } from '../store/authStore'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark" />
          <div>
            <h1 className="login-title">吉达港口数字孪生</h1>
            <p className="login-subtitle">请登录以进入演示系统</p>
          </div>
        </div>
        <form className="login-form" onSubmit={onSubmit}>
          <label className="login-field">
            <span>用户名</span>
            <input
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="login-field">
            <span>密码</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" className="login-submit" disabled={busy}>
            {busy ? '登录中…' : '登录'}
          </button>
        </form>
        <p className="login-hint">
          演示账户：港口运营总监 <code>port_director</code> / <code>PortDir@2026</code>；货运调度员{' '}
          <code>freight_dispatcher</code> / <code>FreightDisp@2026</code>；客运调度员{' '}
          <code>passenger_dispatcher</code> / <code>PassengerDisp@2026</code>；设备运维工程师{' '}
          <code>ops_engineer</code> / <code>OpsEng@2026</code>
        </p>
      </div>
    </div>
  )
}
