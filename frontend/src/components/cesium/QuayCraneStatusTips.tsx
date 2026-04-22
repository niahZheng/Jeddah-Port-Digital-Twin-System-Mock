import { useEffect, useMemo, useRef } from 'react'
import { Cartesian2, Cartesian3 } from 'cesium'
import type { Viewer } from 'cesium'
import { pickQuayCraneCode } from '../../cesium/craneBasemap'
import { usePipViewStore } from '../../store/pipViewStore'
import type { BasemapEntity } from '../../types/basemap'
import type { QuayCraneStat } from '../../types/port'

const PIP_CRANE_SWITCH_CODE = 'QC-01'

type Props = {
  viewer: Viewer | null
  basemapEntities: BasemapEntity[]
  cranes: QuayCraneStat[] | undefined
}

export function QuayCraneStatusTips({ viewer, basemapEntities, cranes }: Props) {
  const setPipQuayCrane = usePipViewStore((s) => s.setPipViewQuayCrane)

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
        .map((e) => ({ entity: e, code: pickQuayCraneCode(e) }))
        .filter((x): x is { entity: BasemapEntity; code: string } => Boolean(x.code)),
    [basemapEntities],
  )

  const scratch = useRef(new Cartesian2())
  const tipElsRef = useRef<Map<string, HTMLDivElement | null>>(new Map())

  useEffect(() => {
    const v = viewer
    if (!v || (v as { isDestroyed?: () => boolean }).isDestroyed?.() || !v.scene) return

    const onPostRender = () => {
      if ((v as { isDestroyed?: () => boolean }).isDestroyed?.() || !v.scene) return
      const c2 = scratch.current
      const canvas = v.scene.canvas
      const sx = canvas.clientWidth / Math.max(1, canvas.width)
      const sy = canvas.clientHeight / Math.max(1, canvas.height)
      for (const { entity } of targets) {
        const el = tipElsRef.current.get(entity.id)
        if (!el) continue
        const lon = entity.longitude ?? 0
        const lat = entity.latitude ?? 0
        const h = (entity.height ?? 0) + 20
        const cart = Cartesian3.fromDegrees(lon, lat, h)
        const ok = v.scene.cartesianToCanvasCoordinates(cart, c2)
        if (!ok) {
          el.style.visibility = 'hidden'
          continue
        }
        el.style.visibility = 'visible'
        el.style.left = `${c2.x * sx}px`
        el.style.top = `${c2.y * sy}px`
      }
    }

    v.scene.postRender.addEventListener(onPostRender)
    return () => {
      try {
        v.scene?.postRender?.removeEventListener(onPostRender)
      } catch {
        /* Viewer 已销毁或 StrictMode 双调用边界 */
      }
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
              {code === PIP_CRANE_SWITCH_CODE ? (
                <button
                  type="button"
                  className="quay-crane-status-tip__pip"
                  title="切换大屏画中画为 QC-01 移动机舱俯视（约 45°）"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPipQuayCrane(PIP_CRANE_SWITCH_CODE)
                  }}
                >
                  摄像头→画中画
                </button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
