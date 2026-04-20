import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  createBasemapEntity,
  deleteBasemapEntity,
  deleteShipDraftOverride,
  fetchBasemapEntities,
  fetchShipDraftList,
  putShipDraftOverride,
  updateBasemapEntity,
} from '../../api/client'
import { SHIP_DRAFTS_UPDATED_EVENT } from '../../cesium/cameraEvents'
import { useAuthStore } from '../../store/authStore'
import { useBasemapStore } from '../../store/basemapStore'
import type { BasemapEntity, BasemapEntityKind, ShipDraftConfigItem } from '../../types/basemap'

type Props = {
  open: boolean
  onClose: () => void
}

function IconCopyBasemap() {
  return (
    <svg
      className="basemap-list-icon-svg"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function IconDeleteBasemap() {
  return (
    <svg
      className="basemap-list-icon-svg"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function emptyZonePointsJson() {
  return JSON.stringify(
    [
      { longitude: 39.154, latitude: 21.476, height: 0 },
      { longitude: 39.156, latitude: 21.476, height: 0 },
      { longitude: 39.155, latitude: 21.478, height: 0 },
    ],
    null,
    2,
  )
}

function defaultPolylinePathPoints(): NonNullable<BasemapEntity['pathPoints']> {
  return [
    { longitude: 39.155, latitude: 21.476, height: 0 },
    { longitude: 39.155, latitude: 21.478, height: 0 },
  ]
}

export function BasemapConfigModal({ open, onClose }: Props) {
  const token = useAuthStore((s) => s.token)
  const setStoreEntities = useBasemapStore((s) => s.setEntities)
  const [items, setItems] = useState<BasemapEntity[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState<string | null>(null)
  const [mainPanel, setMainPanel] = useState<'entities' | 'shipDrafts'>('entities')
  const [shipDraftRows, setShipDraftRows] = useState<ShipDraftConfigItem[]>([])
  const [shipDraftInputs, setShipDraftInputs] = useState<Record<string, string>>({})
  const [shipDraftLoading, setShipDraftLoading] = useState(false)
  const [shipDraftError, setShipDraftError] = useState<string | null>(null)
  /** 弹窗左上角相对视口，默认 (0,0) 对齐页面左上角 */
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{
    pointerId: number
    startClientX: number
    startClientY: number
    originX: number
    originY: number
  } | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchBasemapEntities()
      setItems(list)
      setStoreEntities(list)
      setSelectedId((prev) => (prev && list.some((x) => x.id === prev) ? prev : list[0]?.id ?? null))
    } catch {
      setError('加载底图配置失败')
    } finally {
      setLoading(false)
    }
  }, [setStoreEntities])

  useEffect(() => {
    if (!open) return
    setModalPos({ x: 0, y: 0 })
    dragRef.current = null
    setMainPanel('entities')
    void refresh()
  }, [open, refresh])

  const loadShipDrafts = useCallback(async () => {
    setShipDraftLoading(true)
    setShipDraftError(null)
    try {
      const { items } = await fetchShipDraftList()
      setShipDraftRows(items)
      setShipDraftInputs({})
    } catch {
      setShipDraftError('加载船模下沉配置失败')
    } finally {
      setShipDraftLoading(false)
    }
  }, [])

  const saveShipDraftRow = async (mmsi: string) => {
    if (!token) {
      setShipDraftError('请先登录后再保存')
      return
    }
    const row = shipDraftRows.find((r) => r.mmsi === mmsi)
    const raw = shipDraftInputs[mmsi] ?? (row != null ? String(row.draftMeters) : '')
    const v = Number(raw)
    if (!Number.isFinite(v)) {
      setShipDraftError('Z轴偏移须为数字（可正可负，单位米）')
      return
    }
    setShipDraftError(null)
    try {
      await putShipDraftOverride(token, mmsi, v)
      window.dispatchEvent(new Event(SHIP_DRAFTS_UPDATED_EVENT))
      await loadShipDrafts()
    } catch (e) {
      setShipDraftError(e instanceof Error ? e.message : '保存失败')
    }
  }

  const resetShipDraftRow = async (mmsi: string) => {
    if (!token) {
      setShipDraftError('请先登录')
      return
    }
    setShipDraftError(null)
    try {
      await deleteShipDraftOverride(token, mmsi)
      window.dispatchEvent(new Event(SHIP_DRAFTS_UPDATED_EVENT))
      await loadShipDrafts()
    } catch (e) {
      setShipDraftError(e instanceof Error ? e.message : '恢复默认失败')
    }
  }

  const clampModalPosition = useCallback((x: number, y: number) => {
    const el = modalRef.current
    const w = el?.offsetWidth ?? 960
    const h = el?.offsetHeight ?? 640
    const maxX = Math.max(0, window.innerWidth - w)
    const maxY = Math.max(0, window.innerHeight - h)
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    }
  }, [])

  const onDragHandlePointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: modalPos.x,
      originY: modalPos.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onDragHandlePointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.startClientX
    const dy = e.clientY - d.startClientY
    setModalPos(clampModalPosition(d.originX + dx, d.originY + dy))
  }

  const onDragHandlePointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* released */
    }
  }

  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) ?? null,
    [items, selectedId],
  )

  const patchSelected = (patch: Partial<BasemapEntity>) => {
    if (!selectedId) return
    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== selectedId) return x
        const next = { ...x, ...patch }
        if (patch.kind === 'zone') {
          if (!next.zonePoints || next.zonePoints.length < 3) {
            next.zonePoints = JSON.parse(emptyZonePointsJson()) as BasemapEntity['zonePoints']
          }
          next.pathPoints = null
          next.glbUri = null
          next.patrolTruckCount = null
          next.patrolSegmentSeconds = null
          next.patrolStaggerSeconds = null
        }
        if (patch.kind === 'polyline') {
          if (!next.pathPoints || next.pathPoints.length < 2) {
            next.pathPoints = defaultPolylinePathPoints()
          }
          next.glbUri = null
          next.zonePoints = null
          next.patrolTruckCount = null
          next.patrolSegmentSeconds = null
          next.patrolStaggerSeconds = null
          next.trackMmsi = null
          next.rotationMode = 'fixed'
          if (!next.scale || next.scale === 1) next.scale = 5
        }
        if (patch.kind === 'model') {
          next.zonePoints = null
          if (!next.glbUri) next.glbUri = '/models/crane_harbour.glb'
        }
        return next
      }),
    )
  }

  const handleSave = async () => {
    if (!token) {
      setError('请先登录后再保存底图配置')
      return
    }
    if (!selected) return
    setError(null)
    setSaveOk(null)
    setLoading(true)
    try {
      const body = entityToApiBody(selected)
      await updateBasemapEntity(token, selected.id, body)
      setSaveOk('已保存')
      window.setTimeout(() => setSaveOk(null), 1500)
      const list = await fetchBasemapEntities()
      setItems(list)
      setStoreEntities(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!token) {
      setError('请先登录后再新增条目')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const created = await createBasemapEntity(token, {
        kind: 'model',
        name: '新底图模型',
        visible: true,
        glbUri: '/models/crane_harbour.glb',
        longitude: 39.15,
        latitude: 21.47,
        height: 0,
        scale: 1,
        headingDeg: 0,
        rotationMode: 'fixed',
        trackMmsi: null,
        heightRef: 'clamp',
        labelText: null,
        sortOrder: 900,
      })
      const list = await fetchBasemapEntities()
      setItems(list)
      setStoreEntities(list)
      setSelectedId(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAddZone = async () => {
    if (!token) {
      setError('请先登录后再新增条目')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const created = await createBasemapEntity(token, {
        kind: 'zone',
        name: '新装卸区',
        visible: true,
        glbUri: null,
        longitude: null,
        latitude: null,
        height: null,
        scale: 1,
        headingDeg: 0,
        rotationMode: 'fixed',
        trackMmsi: null,
        heightRef: 'clamp',
        zoneCode: 'ZONE',
        zonePoints: JSON.parse(emptyZonePointsJson()) as BasemapEntity['zonePoints'],
        fillColor: '#22d3ee',
        outlineColor: '#38bdf8',
        sortOrder: 50,
      })
      const list = await fetchBasemapEntities()
      setItems(list)
      setStoreEntities(list)
      setSelectedId(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPolyline = async () => {
    if (!token) {
      setError('请先登录后再新增条目')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const created = await createBasemapEntity(token, {
        kind: 'polyline',
        name: '新道路折线',
        visible: true,
        glbUri: null,
        longitude: null,
        latitude: null,
        height: null,
        scale: 5,
        headingDeg: 0,
        rotationMode: 'fixed',
        trackMmsi: null,
        heightRef: 'clamp',
        labelText: null,
        zoneCode: null,
        zonePoints: null,
        fillColor: null,
        outlineColor: '#94a3b8',
        pathPoints: defaultPolylinePathPoints(),
        patrolTruckCount: null,
        patrolSegmentSeconds: null,
        patrolStaggerSeconds: null,
        sortOrder: 60,
      })
      const list = await fetchBasemapEntities()
      setItems(list)
      setStoreEntities(list)
      setSelectedId(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!token) {
      setError('请先登录后再删除')
      return
    }
    if (!selected) return
    await deleteBasemapRow(selected)
  }

  /** 从 SQLite 删除底图实体并刷新列表（与详情区「删除条目」一致） */
  const deleteBasemapRow = async (row: BasemapEntity) => {
    if (!token) {
      setError('请先登录后再删除')
      return
    }
    if (
      !window.confirm(
        `确定删除「${row.name}」？\n将仅从数据库删除本条（编号：${row.id}），不会删除其它条目。`,
      )
    )
      return
    setError(null)
    setLoading(true)
    try {
      await deleteBasemapEntity(token, row.id)
      const list = await fetchBasemapEntities()
      setItems(list)
      setStoreEntities(list)
      setSelectedId((prev) => {
        if (prev === row.id) return list[0]?.id ?? null
        return prev && list.some((x) => x.id === prev) ? prev : list[0]?.id ?? null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    } finally {
      setLoading(false)
    }
  }

  /** 复制为一条新记录（新 id 写入 SQLite） */
  const duplicateBasemapRow = async (row: BasemapEntity) => {
    if (!token) {
      setError('请先登录后再复制条目')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const body = { ...entityToApiBody(row), name: `${row.name}（副本）`, sortOrder: row.sortOrder + 1 }
      delete (body as { id?: string }).id
      const created = await createBasemapEntity(token, body)
      const list = await fetchBasemapEntities()
      setItems(list)
      setStoreEntities(list)
      setSelectedId(created.id)
      setSaveOk('已复制并新建条目')
      window.setTimeout(() => setSaveOk(null), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : '复制失败')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="basemap-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={modalRef}
        className="basemap-modal"
        role="dialog"
        aria-labelledby="basemap-modal-title"
        style={{ left: modalPos.x, top: modalPos.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="basemap-modal-header basemap-modal-drag-handle"
          onPointerDown={onDragHandlePointerDown}
          onPointerMove={onDragHandlePointerMove}
          onPointerUp={onDragHandlePointerUp}
          onPointerCancel={onDragHandlePointerUp}
        >
          <h2 id="basemap-modal-title">底图配置</h2>
          <button
            type="button"
            className="basemap-modal-close"
            onClick={onClose}
            aria-label="关闭"
            onPointerDown={(ev) => ev.stopPropagation()}
          >
            ×
          </button>
        </header>
        <p className="basemap-modal-hint">
          {mainPanel === 'entities' ? (
            <>
              列表与地图联动：仅「显示」为开的条目会渲染到 Cesium。修改后请保存；新增、复制、删除均需登录，删除与复制会立即写入 SQLite。
            </>
          ) : (
            <>
              配置的是船模在<strong>竖直方向</strong>上的<strong>Z轴偏移（米）</strong>，相对该船经纬度处椭球零高参考面（h=0）：
              正值上浮，负值下沉，0 贴参考面。按 MMSI 写入数据库后立刻刷新三维；恢复默认则沿用 mock 默认偏移值。
            </>
          )}
        </p>
        <nav className="basemap-modal-tabs" aria-label="底图配置分区">
          <button
            type="button"
            className={mainPanel === 'entities' ? 'active' : ''}
            onClick={() => setMainPanel('entities')}
          >
            底图实体
          </button>
          <button
            type="button"
            className={mainPanel === 'shipDrafts' ? 'active' : ''}
            onClick={() => {
              setMainPanel('shipDrafts')
              void loadShipDrafts()
            }}
          >
            船模Z轴
          </button>
        </nav>
        {mainPanel === 'shipDrafts' ? (
          <div className="basemap-ship-drafts-panel">
            {shipDraftLoading && <p className="basemap-muted">加载中…</p>}
            {shipDraftError && <p className="basemap-error">{shipDraftError}</p>}
            <table className="basemap-ship-drafts-table">
              <thead>
                <tr>
                  <th>船名</th>
                  <th>MMSI</th>
                  <th>Z轴偏移（米）</th>
                  <th>mock 默认偏移</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {shipDraftRows.map((r) => (
                  <tr key={r.mmsi}>
                    <td>{r.name}</td>
                    <td>
                      <code className="basemap-mmsi">{r.mmsi}</code>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        min="-1000"
                        className="basemap-ship-draft-input"
                        value={shipDraftInputs[r.mmsi] ?? String(r.draftMeters)}
                        onChange={(e) =>
                          setShipDraftInputs((p) => ({ ...p, [r.mmsi]: e.target.value }))
                        }
                      />
                    </td>
                    <td>
                      {r.mockDefaultDraftMeters}
                      {r.usesDatabaseOverride ? (
                        <span className="basemap-draft-badge">库覆盖</span>
                      ) : null}
                    </td>
                    <td className="basemap-ship-draft-actions">
                      <button type="button" onClick={() => void saveShipDraftRow(r.mmsi)}>
                        保存
                      </button>
                      <button
                        type="button"
                        className="subtle"
                        disabled={!r.usesDatabaseOverride}
                        onClick={() => void resetShipDraftRow(r.mmsi)}
                      >
                        恢复默认
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
        <div className="basemap-modal-body">
          <aside className="basemap-modal-list-panel">
            <div className="basemap-modal-toolbar">
              <button type="button" onClick={() => void handleAdd()} disabled={loading}>
                新增模型
              </button>
              <button type="button" onClick={() => void handleAddZone()} disabled={loading}>
                新增区域
              </button>
              <button type="button" onClick={() => void handleAddPolyline()} disabled={loading}>
                新增折线
              </button>
            </div>
            <ul className="basemap-modal-list">
              {items.map((row) => (
                <li key={row.id} className="basemap-list-item">
                  <button
                    type="button"
                    className={row.id === selectedId ? 'active' : ''}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <span className="basemap-list-kind">
                      {row.kind === 'zone' ? '区' : row.kind === 'polyline' ? '线' : '模'}
                    </span>
                    <span className="basemap-list-name">{row.name}</span>
                    {!row.visible && <span className="basemap-list-hidden">隐</span>}
                  </button>
                  <div className="basemap-list-item-actions">
                    <button
                      type="button"
                      className="basemap-list-action basemap-list-action--icon"
                      title="复制此条目：在数据库中按相同参数新增一条副本（新编号，其它条目不受影响）"
                      aria-label="复制此条目：在数据库中按相同参数新增一条副本（新编号，其它条目不受影响）"
                      disabled={loading}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void duplicateBasemapRow(row)
                      }}
                    >
                      <IconCopyBasemap />
                    </button>
                    <button
                      type="button"
                      className="basemap-list-action basemap-list-action--icon danger"
                      title="删除此条目：仅从数据库移除本条记录（按条目编号删除，不会删除其它条目）"
                      aria-label="删除此条目：仅从数据库移除本条记录（按条目编号删除，不会删除其它条目）"
                      disabled={loading}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void deleteBasemapRow(row)
                      }}
                    >
                      <IconDeleteBasemap />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
          <section className="basemap-modal-detail">
            {loading && !selected && <p className="basemap-muted">加载中…</p>}
            {!selected && !loading && <p className="basemap-muted">请选择左侧条目</p>}
            {selected && (
              <>
                <div className="basemap-field-grid">
                  <label>
                    类型
                    <select
                      value={selected.kind}
                      onChange={(e) => patchSelected({ kind: e.target.value as BasemapEntityKind })}
                    >
                      <option value="model">模型</option>
                      <option value="zone">装卸区 / 多边形区域</option>
                      <option value="polyline">道路 / 折线</option>
                    </select>
                  </label>
                  <label>
                    名称
                    <input
                      value={selected.name}
                      onChange={(e) => patchSelected({ name: e.target.value })}
                    />
                  </label>
                  <label className="basemap-check">
                    <input
                      type="checkbox"
                      checked={selected.visible}
                      onChange={(e) => patchSelected({ visible: e.target.checked })}
                    />
                    在地图上显示
                  </label>
                  <label>
                    排序 sortOrder
                    <input
                      type="number"
                      value={selected.sortOrder}
                      onChange={(e) => patchSelected({ sortOrder: Number(e.target.value) })}
                    />
                  </label>
                </div>

                {selected.kind === 'zone' ? (
                  <div className="basemap-field-grid">
                    <label>
                      区域代码
                      <input
                        value={selected.zoneCode ?? ''}
                        onChange={(e) => patchSelected({ zoneCode: e.target.value || null })}
                      />
                    </label>
                    <label className="basemap-field-full">
                      多边形顶点 JSON（longitude, latitude, height）
                      <textarea
                        rows={8}
                        value={zonePointsToText(selected.zonePoints)}
                        onChange={(e) =>
                          patchSelected({ zonePoints: parsePointsJson(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      填充色
                      <input
                        value={selected.fillColor ?? ''}
                        onChange={(e) => patchSelected({ fillColor: e.target.value || null })}
                      />
                    </label>
                    <label>
                      轮廓色
                      <input
                        value={selected.outlineColor ?? ''}
                        onChange={(e) => patchSelected({ outlineColor: e.target.value || null })}
                      />
                    </label>
                  </div>
                ) : selected.kind === 'polyline' ? (
                  <div className="basemap-field-grid">
                    <p className="basemap-muted basemap-field-full" style={{ margin: 0 }}>
                      折线使用与巡逻相同的经纬度顶点序列（pathPoints），至少 2 点；线宽为下方「线宽」像素；线色为「线条色」。
                    </p>
                    <label>
                      关联区域代码（可空，仅备注）
                      <input
                        value={selected.zoneCode ?? ''}
                        onChange={(e) => patchSelected({ zoneCode: e.target.value || null })}
                      />
                    </label>
                    <label>
                      线宽（像素，对应 scale）
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={selected.scale}
                        onChange={(e) => patchSelected({ scale: Math.max(1, Number(e.target.value)) })}
                      />
                    </label>
                    <label>
                      线条色
                      <input
                        value={selected.outlineColor ?? ''}
                        onChange={(e) => patchSelected({ outlineColor: e.target.value || null })}
                      />
                    </label>
                    <label>
                      贴地模式
                      <select
                        value={selected.heightRef}
                        onChange={(e) =>
                          patchSelected({ heightRef: e.target.value as BasemapEntity['heightRef'] })
                        }
                      >
                        <option value="clamp">贴地（顶点 height≈0 时推荐）</option>
                        <option value="none">按顶点绝对高度</option>
                      </select>
                    </label>
                    <label className="basemap-field-full">
                      pathPoints JSON（longitude, latitude, height）
                      <textarea
                        rows={8}
                        value={pathPointsToText(selected.pathPoints)}
                        onChange={(e) =>
                          patchSelected({ pathPoints: parsePointsJson(e.target.value) })
                        }
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    {selected.glbUri?.includes('cargo ship 3d model') && (
                      <p className="basemap-muted" style={{ margin: '0 0 0.75rem' }}>
                        此条目是<strong>底图静态装饰船</strong>（Cesium 实体{' '}
                        <code style={{ fontSize: '0.9em' }}>basemap:{selected.id}</code>
）。场景中另有<strong>实时船舶</strong>（按 MMSI 从接口更新，使用{' '}
                        <code style={{ fontSize: '0.9em' }}>cargo_ship_01/02</code> 等模型），两者互不影响。
                        改坐标后请点<strong>保存</strong>（需登录）；若镜头里主要是带船名/航次标签的船，多半是实时船，本条目移动后它不会跟着动。
                      </p>
                    )}
                    <div className="basemap-field-grid">
                      <label>
                        经度
                        <input
                          type="number"
                          step="0.000001"
                          value={selected.longitude ?? ''}
                          onChange={(e) =>
                            patchSelected({
                              longitude: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        纬度
                        <input
                          type="number"
                          step="0.000001"
                          value={selected.latitude ?? ''}
                          onChange={(e) =>
                            patchSelected({
                              latitude: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        缩放
                        <input
                          type="number"
                          step="0.001"
                          value={selected.scale}
                          onChange={(e) => patchSelected({ scale: Number(e.target.value) })}
                        />
                      </label>
                      <label>
                        方向角（度）{selected.rotationMode === 'dynamic_track' ? '（相对船舶航向叠加）' : ''}
                        <input
                          type="number"
                          step="0.1"
                          value={selected.headingDeg}
                          onChange={(e) => patchSelected({ headingDeg: Number(e.target.value) })}
                        />
                      </label>
                      <label>
                        旋转模式
                        <select
                          value={selected.rotationMode}
                          onChange={(e) =>
                            patchSelected({
                              rotationMode: e.target.value as BasemapEntity['rotationMode'],
                            })
                          }
                        >
                          <option value="fixed">固定朝向</option>
                          <option value="dynamic_track">动态跟踪（绑定 MMSI）</option>
                        </select>
                      </label>
                      {selected.rotationMode === 'dynamic_track' && (
                        <label>
                          跟踪船舶 MMSI
                          <input
                            value={selected.trackMmsi ?? ''}
                            onChange={(e) => patchSelected({ trackMmsi: e.target.value || null })}
                          />
                        </label>
                      )}
                      <label>
                        贴地模式
                        <select
                          value={selected.heightRef}
                          onChange={(e) =>
                            patchSelected({ heightRef: e.target.value as BasemapEntity['heightRef'] })
                          }
                        >
                          <option value="clamp">贴地（clamp）</option>
                          <option value="none">绝对高度（none）</option>
                        </select>
                      </label>
                      <label className="basemap-field-full">
                        GLB 路径（如 /models/crane_harbour.glb）
                        <input
                          value={selected.glbUri ?? ''}
                          onChange={(e) => patchSelected({ glbUri: e.target.value || null })}
                        />
                      </label>
                      <label>
                        标签文字（可空）
                        <input
                          value={selected.labelText ?? ''}
                          onChange={(e) => patchSelected({ labelText: e.target.value || null })}
                        />
                      </label>
                    </div>
                    <details className="basemap-patrol-details">
                      <summary>巡逻路径（可选，多个顶点则按路径运动）</summary>
                      <label className="basemap-field-full">
                        pathPoints JSON
                        <textarea
                          rows={5}
                          value={pathPointsToText(selected.pathPoints)}
                          onChange={(e) =>
                            patchSelected({ pathPoints: parsePointsJson(e.target.value) })
                          }
                        />
                      </label>
                      <div className="basemap-field-grid">
                        <label>
                          车辆数量
                          <input
                            type="number"
                            min={1}
                            value={selected.patrolTruckCount ?? ''}
                            onChange={(e) =>
                              patchSelected({
                                patrolTruckCount:
                                  e.target.value === '' ? null : Math.max(1, Number(e.target.value)),
                              })
                            }
                          />
                        </label>
                        <label>
                          路段时长（秒）
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={selected.patrolSegmentSeconds ?? ''}
                            onChange={(e) =>
                              patchSelected({
                                patrolSegmentSeconds:
                                  e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label>
                          车间隔（秒）
                          <input
                            type="number"
                            min={0}
                            value={selected.patrolStaggerSeconds ?? ''}
                            onChange={(e) =>
                              patchSelected({
                                patrolStaggerSeconds:
                                  e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                    </details>
                  </>
                )}

                <div className="basemap-modal-actions">
                  <button type="button" onClick={() => void handleSave()} disabled={loading}>
                    保存到服务器
                  </button>
                  <button
                    type="button"
                    onClick={() => selected && void duplicateBasemapRow(selected)}
                    disabled={loading || !selected}
                  >
                    复制当前条目
                  </button>
                  <button type="button" className="danger" onClick={() => void handleDelete()} disabled={loading}>
                    删除条目
                  </button>
                  {saveOk && <span className="basemap-ok">{saveOk}</span>}
                </div>
                {error && <p className="basemap-error">{error}</p>}
              </>
            )}
          </section>
        </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function entityToApiBody(e: BasemapEntity): Record<string, unknown> {
  return {
    id: e.id,
    kind: e.kind,
    name: e.name,
    visible: e.visible,
    glbUri: e.glbUri,
    longitude: e.longitude,
    latitude: e.latitude,
    height: e.height,
    scale: e.scale,
    headingDeg: e.headingDeg,
    rotationMode: e.rotationMode,
    trackMmsi: e.trackMmsi,
    heightRef: e.heightRef,
    labelText: e.labelText,
    zoneCode: e.zoneCode,
    zonePoints: e.zonePoints,
    fillColor: e.fillColor,
    outlineColor: e.outlineColor,
    pathPoints: e.pathPoints,
    patrolTruckCount: e.patrolTruckCount,
    patrolSegmentSeconds: e.patrolSegmentSeconds,
    patrolStaggerSeconds: e.patrolStaggerSeconds,
    sortOrder: e.sortOrder,
  }
}

function zonePointsToText(pts: BasemapEntity['zonePoints']): string {
  if (!pts || pts.length === 0) return emptyZonePointsJson()
  return JSON.stringify(pts, null, 2)
}

function pathPointsToText(pts: BasemapEntity['pathPoints']): string {
  if (!pts || pts.length === 0) return ''
  return JSON.stringify(pts, null, 2)
}

function parsePointsJson(text: string): BasemapEntity['zonePoints'] {
  try {
    const v = JSON.parse(text) as unknown
    if (!Array.isArray(v)) return null
    const out: NonNullable<BasemapEntity['zonePoints']> = []
    for (const item of v) {
      if (typeof item !== 'object' || item === null) continue
      const o = item as Record<string, unknown>
      const longitude = Number(o.longitude)
      const latitude = Number(o.latitude)
      const height = o.height != null ? Number(o.height) : 0
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(height)) continue
      out.push({ longitude, latitude, height })
    }
    return out.length ? out : null
  } catch {
    return null
  }
}
