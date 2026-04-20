import { useEffect, useMemo, useRef } from 'react'
import { Cartesian2, Cartesian3, Cartographic } from 'cesium'
import type { Viewer } from 'cesium'
import { basemapZoneTipAnchorDegrees } from '../../cesium/basemapEntities'
import type { BasemapEntity } from '../../types/basemap'
import type { YardZoneCargoStat } from '../../types/port'

const TRACKED_ZONE_CODES = new Set(['cy-01', 'cy-02'])

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
      const canvas = viewer.scene.canvas
      const sx = canvas.clientWidth / Math.max(1, canvas.width)
      const sy = canvas.clientHeight / Math.max(1, canvas.height)
      for (const ent of targets) {
        const el = tipElsRef.current.get(ent.id)
        if (!el) continue
        const anchor = basemapZoneTipAnchorDegrees(ent.zonePoints!)
        const carto = Cartographic.fromDegrees(anchor.longitude, anchor.latitude)
        const groundH = viewer.scene.globe.getHeight(carto)
        const tipH =
          typeof groundH === 'number' && Number.isFinite(groundH)
            ? groundH + 12
            : anchor.height
        const cart = Cartesian3.fromDegrees(anchor.longitude, anchor.latitude, tipH)
        const ok = viewer.scene.cartesianToCanvasCoordinates(cart, c2)
        if (!ok) {
          el.style.visibility = 'hidden'
          continue
        }
        el.style.visibility = 'visible'
        /* 绘制缓冲区坐标 → CSS 像素，与相机距离无关；tip 尺寸用 px 固定屏幕大小 */
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
    <div className="yard-zone-cargo-tips" aria-hidden>
      {targets.map((ent) => {
        const code = ent.zoneCode!.trim().toUpperCase()
        const st = byCode.get(code)
        const occupied = st?.occupiedTeu ?? 0
        const cap = Math.max(0, st?.capacityTeu ?? 0)
        const avail = Math.max(0, cap - occupied)
        const pct = cap > 0 ? Math.min(100, Math.round((occupied / cap) * 100)) : 0

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
            <span className="yard-zone-cargo-tip__anchor" />
            <span className="yard-zone-cargo-tip__leader" />
            <div className="yard-zone-cargo-tip__bubble">
              <div className="yard-zone-cargo-tip__title">{st?.shortName ?? code}</div>
              <div className="yard-zone-cargo-tip__pct">{pct}%</div>
              <div className="yard-zone-cargo-tip__mini">在库 {occupied}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
