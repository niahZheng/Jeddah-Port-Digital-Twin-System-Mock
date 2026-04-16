import { useCallback, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { fetchWidgetState, saveWidgetState } from '../../../api/client'
import { useAuthStore } from '../../../store/authStore'

type StoredLayout = { left: number; top: number; collapsed: boolean }

type Props = {
  pageKey: string
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
  const { pageKey, id, title, containerRef, defaultLeft, defaultTop, width = 320, aside, children } =
    props
  const [left, setLeft] = useState(defaultLeft)
  const [top, setTop] = useState(defaultTop)
  const [collapsed, setCollapsed] = useState(false)
  const token = useAuthStore((s) => s.token)
  const hasLoadedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    if (!token) return
    hasLoadedRef.current = false
    setLeft(defaultLeft)
    setTop(defaultTop)
    setCollapsed(false)
    void fetchWidgetState(token, pageKey, id)
      .then((res) => {
        if (!res.state) return
        setLeft(res.state.left)
        setTop(res.state.top)
        setCollapsed(res.state.collapsed)
      })
      .catch(() => {})
      .finally(() => {
        hasLoadedRef.current = true
      })
  }, [token, pageKey, id, defaultLeft, defaultTop])

  useLayoutEffect(() => {
    if (!token || !hasLoadedRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const state: StoredLayout = { left, top, collapsed }
    saveTimerRef.current = setTimeout(() => {
      void saveWidgetState(token, pageKey, id, state).catch(() => {})
    }, 250)
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [token, pageKey, id, left, top, collapsed])

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
