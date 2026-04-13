import { useCallback, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

const STORAGE_PREFIX = 'jeddah-overview-widget:'

type StoredLayout = { left: number; top: number; collapsed: boolean }

function readStored(id: string, defaults: { left: number; top: number }): StoredLayout {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id)
    if (!raw) return { ...defaults, collapsed: false }
    const j = JSON.parse(raw) as Partial<StoredLayout>
    return {
      left: typeof j.left === 'number' ? j.left : defaults.left,
      top: typeof j.top === 'number' ? j.top : defaults.top,
      collapsed: Boolean(j.collapsed),
    }
  } catch {
    return { ...defaults, collapsed: false }
  }
}

function writeStored(id: string, layout: StoredLayout) {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(layout))
  } catch {
    /* ignore */
  }
}

type Props = {
  id: string
  title: string
  containerRef: RefObject<HTMLElement | null>
  defaultLeft: number
  defaultTop: number
  width?: number
  children: ReactNode
  aside?: ReactNode
}

export function DraggableWidget(props: Props) {
  const { id, title, containerRef, defaultLeft, defaultTop, width = 320, aside, children } = props
  const initial = readStored(id, { left: defaultLeft, top: defaultTop })
  const [left, setLeft] = useState(initial.left)
  const [top, setTop] = useState(initial.top)
  const [collapsed, setCollapsed] = useState(initial.collapsed)
  const dragRef = useRef<{
    pointerId: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const clamp = useCallback(
    (l: number, t: number) => {
      const c = containerRef.current
      const el = rootRef.current
      if (!c || !el) return { left: l, top: t }
      const cr = c.getBoundingClientRect()
      const w = el.offsetWidth || width
      const h = el.offsetHeight || 120
      const maxL = Math.max(8, cr.width - w - 8)
      const maxT = Math.max(8, cr.height - h - 8)
      return {
        left: Math.min(Math.max(8, l), maxL),
        top: Math.min(Math.max(8, t), maxT),
      }
    },
    [containerRef, width],
  )

  useLayoutEffect(() => {
    const c = { left, top, collapsed }
    writeStored(id, c)
  }, [id, left, top, collapsed])

  const onPointerDownHeader = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    const c = containerRef.current
    if (!c || !rootRef.current) return
    const cr = c.getBoundingClientRect()
    dragRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - cr.left - left,
      offsetY: e.clientY - cr.top - top,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    const c = containerRef.current
    if (!c) return
    const cr = c.getBoundingClientRect()
    const nextL = e.clientX - cr.left - d.offsetX
    const nextT = e.clientY - cr.top - d.offsetY
    const cl = clamp(nextL, nextT)
    setLeft(cl.left)
    setTop(cl.top)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      ref={rootRef}
      className={`overview-widget${collapsed ? ' overview-widget--collapsed' : ''}`}
      style={{ left, top, width }}
      role="region"
      aria-label={title}
    >
      <div
        className="overview-widget__head"
        onPointerDown={onPointerDownHeader}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="overview-widget__drag-hint" aria-hidden title="拖动">
          ::
        </span>
        <span className="overview-widget__title">{title}</span>
        <div className="overview-widget__head-actions">
          {aside}
          <button
            type="button"
            className="overview-widget__collapse"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? '展开' : '折叠'}
          </button>
        </div>
      </div>
      {!collapsed ? <div className="overview-widget__body">{children}</div> : null}
    </div>
  )
}
