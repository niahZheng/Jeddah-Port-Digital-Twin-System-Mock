import { useEffect, useMemo, useState } from 'react'
import { useBasemapStore } from '../../store/basemapStore'
import { selectVideoZoneCode, useYardPanelStore } from '../../store/yardPanelStore'
import { useEffectiveYardZones } from '../../hooks/useEffectiveYardZones'
import { YardVideoSimulatedFeed } from './YardVideoSimulatedFeed'

function cameraLabelForZone(code: string): string {
  const u = code.trim().toUpperCase()
  if (u === 'CY-01') return '枪机 CY-01-P01 · 约 45° 斜视俯拍（与数字孪生入口同镜头）'
  if (u === 'CY-02') return '枪机 CY-02-P01 · 约 45° 斜视俯拍（与孪生同向）'
  return `枪机 ${u}-P01 · 约 45° 斜视俯拍`
}

export function YardLiveVideoOverlay() {
  const activeZoneCode = useYardPanelStore(selectVideoZoneCode)
  const close = useYardPanelStore((s) => s.close)
  const basemapEntities = useBasemapStore((s) => s.entities)
  const zones = useEffectiveYardZones()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const zoneStat = useMemo(() => {
    if (!activeZoneCode) return null
    return zones?.find((z) => z.zoneCode.trim().toUpperCase() === activeZoneCode) ?? null
  }, [activeZoneCode, zones])

  const zoneName = useMemo(() => {
    if (!activeZoneCode) return ''
    const ent = basemapEntities.find(
      (e) =>
        e.kind === 'zone' &&
        (e.zoneCode ?? '').trim().toUpperCase() === activeZoneCode,
    )
    return ent?.name ?? zoneStat?.shortName ?? activeZoneCode
  }, [activeZoneCode, basemapEntities, zoneStat?.shortName])

  const demoSrc = import.meta.env.VITE_YARD_VIDEO_DEMO_URL as string | undefined
  const hasDemoUrl = Boolean(demoSrc && String(demoSrc).trim().length > 0)

  if (!activeZoneCode) return null

  const timeStr = now.toLocaleString('zh-CN', { hour12: false })
  const camLabel = cameraLabelForZone(activeZoneCode)

  return (
    <div className="yard-video-overlay" role="presentation">
      <button
        type="button"
        className="yard-video-backdrop"
        aria-label="关闭实时视频"
        onClick={close}
      />
      <div
        className="yard-video-monitor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="yard-video-title"
      >
        <header className="yard-video-monitor__head">
          <div className="yard-video-monitor__title-wrap">
            <h2 id="yard-video-title" className="yard-video-monitor__title">
              实时视频 · {zoneName}
            </h2>
            <p className="yard-video-monitor__sub">{camLabel}</p>
          </div>
          <div className="yard-video-monitor__status">
            <span className="yard-video-monitor__live" aria-hidden>
              <span className="yard-video-monitor__live-dot" /> LIVE
            </span>
            <span className="yard-video-monitor__clock">{timeStr}</span>
            <button type="button" className="yard-video-monitor__close" onClick={close}>
              关闭
            </button>
          </div>
        </header>

        <div className="yard-video-monitor__body">
          <div className="yard-video-monitor__bezel">
            <div className="yard-video-monitor__corners" aria-hidden />
            {hasDemoUrl ? (
              <video
                className="yard-video-monitor__feed yard-video-monitor__feed--native"
                src={demoSrc}
                autoPlay
                muted
                playsInline
                loop
                controls={false}
              />
            ) : (
              <div className="yard-video-monitor__feed yard-video-monitor__feed--sim" aria-hidden>
                <YardVideoSimulatedFeed
                  zoneCode={activeZoneCode}
                  occupiedTeu={zoneStat?.occupiedTeu ?? 0}
                  capacityTeu={zoneStat?.capacityTeu ?? 0}
                />
                <div className="yard-video-feed-sim__scan" />
                <div className="yard-video-feed-sim__vignette" />
                <div className="yard-video-feed-sim__grain" />
              </div>
            )}
            <div className="yard-video-monitor__osd">
              <span>{activeZoneCode}</span>
              <span>1080p · 25fps</span>
              <span className="yard-video-monitor__osd--mute">演示信号 · 可接 RTSP/HLS</span>
            </div>
          </div>
        </div>

        <footer className="yard-video-monitor__foot">
          地图镜头与「进入孪生」一致（约 45° 斜视俯拍）。演示画面为同视角 CSS
          箱阵；生产环境将 <code>VITE_YARD_VIDEO_DEMO_URL</code> 设为转码后的 HLS/MP4
          即可替换为真实流。
          {zoneStat ? ` 当前在库 ${zoneStat.occupiedTeu} TEU / ${zoneStat.capacityTeu} TEU。` : ''}
        </footer>
      </div>
    </div>
  )
}
