import { useEffect, useLayoutEffect, useState } from 'react'
import { MainWorkspace } from './components/layout/MainWorkspace'
import { ScreenShell } from './components/layout/ScreenShell'
import { LoginPage } from './pages/LoginPage'
import { useAuthStore } from './store/authStore'

export default function App() {
  const hydrated = useAuthStore((s) => s.hydrated)
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const navItems = useAuthStore((s) => s.navItems)
  const hydrate = useAuthStore((s) => s.hydrate)
  const logout = useAuthStore((s) => s.logout)

  const [activeNav, setActiveNav] = useState('')

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const twinHomeLabel = navItems[0] ?? ''

  useLayoutEffect(() => {
    if (!navItems.length) {
      setActiveNav('')
      return
    }
    setActiveNav((prev) => (navItems.includes(prev) ? prev : navItems[0]))
  }, [navItems])

  const displayNav =
    navItems.length === 0 ? '' : navItems.includes(activeNav) ? activeNav : navItems[0]

  if (!hydrated) {
    return (
      <div className="app-boot">
        <p>加载中…</p>
      </div>
    )
  }

  if (!token || !user) {
    return <LoginPage />
  }

  if (!navItems.length) {
    return (
      <div className="app-boot">
        <p>加载中…</p>
      </div>
    )
  }

  return (
    <ScreenShell
      navItems={navItems}
      activeNav={displayNav}
      onNavChange={setActiveNav}
      onLogout={logout}
      username={user.username}
      roleName={user.role.name}
    >
      <MainWorkspace
        activeNav={displayNav}
        twinHomeLabel={twinHomeLabel}
        roleKey={user.role.key}
      />
    </ScreenShell>
  )
}
