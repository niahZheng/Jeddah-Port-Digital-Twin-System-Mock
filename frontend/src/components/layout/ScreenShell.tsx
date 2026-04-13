import type { ReactNode } from 'react'

export type ScreenShellProps = {
  children: ReactNode
  navItems: string[]
  activeNav: string
  onNavChange: (label: string) => void
  onLogout: () => void
  /** 登录用户名 */
  username: string
  /** 角色显示名，如「港口运营总监」 */
  roleName: string
}

export function ScreenShell(props: ScreenShellProps) {
  const {
    children,
    navItems,
    activeNav,
    onNavChange,
    onLogout,
    username,
    roleName,
  } = props

  return (
    <div className="screen-shell">
      <header className="screen-header">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <h1>吉达港口数字孪生</h1>
            <p className="subtitle">演示环境 · 快速演示模式</p>
          </div>
        </div>
        <nav className="header-nav" aria-label="主导航">
          {navItems.map((label) => (
            <button
              key={label}
              type="button"
              className={activeNav === label ? 'header-nav-item active' : 'header-nav-item'}
              aria-current={activeNav === label ? 'page' : undefined}
              onClick={() => onNavChange(label)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="header-meta">
          <span className="header-meta-port">Jeddah Islamic Port</span>
          <span className="header-meta-user" title={`${username} · ${roleName}`}>
            {username}
            <span className="header-meta-sep">·</span>
            <span className="header-meta-role">{roleName}</span>
          </span>
          <button type="button" className="header-logout" onClick={onLogout}>
            退出
          </button>
        </div>
      </header>
      {children}
    </div>
  )
}
