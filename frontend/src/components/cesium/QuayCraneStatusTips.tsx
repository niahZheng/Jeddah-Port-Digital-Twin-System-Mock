import { useEffect, useMemo, useRef } from 'react'
import { Cartesian2, Cartesian3 } from 'cesium'
import type { Viewer } from 'cesium'
import type { BasemapEntity } from '../../types/basemap'
import type { QuayCraneStat } from '../../types/port'

type Props = {
  viewer: Viewer | null
  basemapEntities: BasemapEntity[]
  cranes: QuayCraneStat[] | undefined
}

function pickCraneCode(ent: BasemapEntity): string | null {
  const fromLabel = (ent.labelText ?? '').trim().toUpperCase()
  if (/^(QC|GC)-\d{2}$/.test(fromLabel)) return fromLabel
  const m = (ent.name ?? '').toUpperCase().match(/(QC|GC)-\d{2}/)
  return m ? m[0]! : null
}

export function QuayCraneStatusTips({ viewer, basemapEntities, cranes }: Props) {
  const craneStatusByCode = useMemo(() => {
    const m = new Map<string, QuayCraneStat['status']>()
    for (const c of cranes ?? []) {
      m.set(String(c.craneCode).trim().toUpperCase(), c.status)
    }
    return m
  }, [cranes])

  const targets = useMemo(
    () =>
      basemapEntities
        .filter(
          (e) =>
            e.kind === 'model' &&
            e.visible &&
            Boolean(e.glbUri?.includes('crane_harbour') || e.glbUri?.includes('gantry_crane')),
        )
        .map((e) => ({ entity: e, code: pickCraneCode(e) }))
        .filter((x): x is { entity: BasemapEntity; code: string } => Boolean(x.code)),
    [basemapEntities],
  )

  const scratch = useRef(new Cartesian2())
  const tipElsRef = useRef<Map<string, HTMLDivElement | null>>(new Map())

  useEffect(() => {
    if (!viewer || (viewer as { isDestroyed?: () => boolean }).isDestroyed?.()) return

    const onPostRender = () => {
      const c2 = scratch.current
      const canvas = viewer.scene.canvas
      const sx = canvas.clientWidth / Math.max(1, canvas.width)
      const sy = canvas.clientHeight / Math.max(1, canvas.height)
      for (const { entity } of targets) {
        const el = tipElsRef.current.get(entity.id)
        if (!el) continue
        const lon = entity.longitude ?? 0
        const lat = entity.latitude ?? 0
        const h = (entity.height ?? 0) + 20
        const cart = Cartesian3.fromDegrees(lon, lat, h)
        const ok = viewer.scene.cartesianToCanvasCoordinates(cart, c2)
        if (!ok) {
          el.style.visibility = 'hidden'
          continue
        }
        el.style.visibility = 'visible'
        el.style.left = `${c2.x * sx}px`
        el.style.top = `${c2.y * sy}px`
      }
    }

    viewer.scene.postRender.addEventListener(onPostRender)
    return () => {
      viewer.scene.postRender.removeEventListener(onPostRender)
    }
  }, [viewer, targets])

  if (targets.length === 0) return null

  return (
    <div className="quay-crane-status-tips" aria-hidden>
      {targets.map(({ entity, code }) => {
        const status = craneStatusByCode.get(code) ?? 'idle'
        const statusText = status === 'busy' ? '忙碌' : status === 'alert' ? '异常' : '空闲'
        return (
          <div
            key={entity.id}
            ref={(node) => {
              tipElsRef.current.set(entity.id, node)
            }}
            className={`quay-crane-status-tip quay-crane-status-tip--${status}`}
            title={`${code} ${statusText}`}
          >
            <span className="quay-crane-status-tip__anchor" />
            <span className="quay-crane-status-tip__leader" />
            <div className="quay-crane-status-tip__bubble">
              <div className="quay-crane-status-tip__title">{code}</div>
              <div className="quay-crane-status-tip__status">
                {statusText}
                {status === 'alert' ? (
                  <span className="quay-crane-status-tip__alert"> !!!</span>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
