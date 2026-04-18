import { useEffect, useMemo, useRef } from 'react'
import { Cartesian2, Cartesian3 } from 'cesium'
import type { Viewer } from 'cesium'
import { basemapZoneTipAnchorDegrees } from '../../cesium/basemapEntities'
import type { BasemapEntity } from '../../types/basemap'
import type { YardZoneCargoStat } from '../../types/port'

const TRACKED_ZONE_CODES = new Set(['cy-01', 'cy-02'])
const DONUT_R = 18
const DONUT_C = 2 * Math.PI * DONUT_R

type Props = {
  viewer: Viewer | null
  basemapEntities: BasemapEntity[]
  zones: YardZoneCargoStat[] | undefined
}

export function YardZoneCargoTips({ viewer, basemapEntities, zones }: Props) {
  const byCode = useMemo(() => {
    const m = new Map<string, YardZoneCargoStat>()
    for (const z of zones ?? []) {
      m.set(String(z.zoneCode).trim().toUpperCase(), z)
    }
    return m
  }, [zones])

  const targets = useMemo(
    () =>
      basemapEntities.filter(
        (e) =>
          e.kind === 'zone' &&
          e.visible &&
          e.zoneCode &&
          TRACKED_ZONE_CODES.has(e.zoneCode.trim().toLowerCase()) &&
          e.zonePoints &&
          e.zonePoints.length >= 3,
      ),
    [basemapEntities],
  )

  const scratch = useRef(new Cartesian2())
  const tipElsRef = useRef<Map<string, HTMLDivElement | null>>(new Map())

  useEffect(() => {
    if (!viewer || (viewer as { isDestroyed?: () => boolean }).isDestroyed?.()) return

    const onPostRender = () => {
      const c2 = scratch.current
      for (const ent of targets) {
        const el = tipElsRef.current.get(ent.id)
        if (!el) continue
        const anchor = basemapZoneTipAnchorDegrees(ent.zonePoints!)
        const cart = Cartesian3.fromDegrees(anchor.longitude, anchor.latitude, anchor.height)
        const ok = viewer.scene.cartesianToCanvasCoordinates(cart, c2)
        if (!ok) {
          el.style.visibility = 'hidden'
          continue
        }
        el.style.visibility = 'visible'
        el.style.left = `${c2.x}px`
        el.style.top = `${c2.y}px`
      }
    }

    viewer.scene.postRender.addEventListener(onPostRender)
    return () => {
      viewer.scene.postRender.removeEventListener(onPostRender)
    }
  }, [viewer, targets])

  if (targets.length === 0) return null

  return (
    <div className="yard-zone-cargo-tips" aria-hidden>
      {targets.map((ent) => {
        const code = ent.zoneCode!.trim().toUpperCase()
        const st = byCode.get(code)
        const occupied = st?.occupiedTeu ?? 0
        const cap = Math.max(0, st?.capacityTeu ?? 0)
        const avail = Math.max(0, cap - occupied)
        const pct = cap > 0 ? Math.min(100, Math.round((occupied / cap) * 100)) : 0
        const frac = cap > 0 ? Math.min(1, occupied / cap) : 0
        const dash = frac * DONUT_C

        const tip = st
          ? `${st.shortName}：在库 ${occupied} TEU，可集散余量 ${avail} TEU（规划能力 ${cap} TEU）`
          : `${ent.name ?? code}：暂无集货区库存数据（等待 /api/stats中 yardZones）`

        return (
          <div
            key={ent.id}
            ref={(node) => {
              tipElsRef.current.set(ent.id, node)
            }}
            className="yard-zone-cargo-tip"
            title={tip}
          >
            <div className="yard-zone-cargo-tip__title">{st?.shortName ?? code}</div>
            <div className="yard-zone-cargo-tip__chart">
              <svg className="yard-zone-cargo-tip__pie" width="52" height="52" viewBox="0 0 52 52">
                <circle
                  cx="26"
                  cy="26"
                  r={DONUT_R}
                  fill="none"
                  stroke="rgba(51,65,85,0.95)"
                  strokeWidth="9"
                />
                <circle
                  cx="26"
                  cy="26"
                  r={DONUT_R}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${DONUT_C}`}
                  transform="rotate(-90 26 26)"
                />
              </svg>
              <span className="yard-zone-cargo-tip__pct">{pct}%</span>
            </div>
            <div className="yard-zone-cargo-tip__sub">在库 {occupied} TEU</div>
            <div className="yard-zone-cargo-tip__sub yard-zone-cargo-tip__sub--muted">
              可集散余量 {cap > 0 ? avail : '—'} TEU
            </div>
          </div>
        )
      })}
    </div>
  )
}
