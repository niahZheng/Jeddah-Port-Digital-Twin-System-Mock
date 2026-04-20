import { useEffect, useState, type ReactNode } from 'react'

type Props = {
  pageKey: string
  id: string
  title: string
  defaultOpen?: boolean
  aside?: ReactNode
  children: ReactNode
}

/** 侧栏内单块业务面板：标题行折叠/展开，状态持久化 */
export function OverviewDrawerSection(props: Props) {
  const { pageKey, id, title, defaultOpen = true, aside, children } = props
  const storageKey = `jeddah-port.drawer.${pageKey}.${id}`
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(storageKey)
      if (v === '0') return false
      if (v === '1') return true
    } catch {
      /* ignore */
    }
    return defaultOpen
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [open, storageKey])

  const bodyId = `overview-drawer-body-${pageKey}-${id}`

  return (
    <section className={`overview-drawer${open ? ' overview-drawer--open' : ''}`}>
      <div className="overview-drawer__head">
        <button
          type="button"
          className="overview-drawer__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
        >
          <span className="overview-drawer__chev" aria-hidden>
            ▸
          </span>
          <span className="overview-drawer__title">{title}</span>
        </button>
        {aside ? <div className="overview-drawer__aside">{aside}</div> : null}
      </div>
      <div className="overview-drawer__body" id={bodyId} role="region" hidden={!open}>
        {children}
      </div>
    </section>
  )
}
