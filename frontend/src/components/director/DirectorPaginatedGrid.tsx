import { useEffect, useMemo, useState, type ReactNode } from 'react'

const DEFAULT_PAGE_SIZE = 10

type Props<T> = {
  items: T[]
  pageSize?: number
  rowKey: (item: T) => string
  renderItem: (item: T) => ReactNode
}

/** 每页固定条数，双列栅格（适合决策卡片等） */
export function DirectorPaginatedGrid<T>(props: Props<T>) {
  const { items, pageSize = DEFAULT_PAGE_SIZE, rowKey, renderItem } = props
  const [page, setPage] = useState(1)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    setPage(1)
  }, [items])

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  const safePage = Math.min(Math.max(1, page), totalPages)
  const slice = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  return (
    <div className="director-paginated-grid">
      <div className="director-paged-card-grid">
        {slice.map((item) => (
          <div key={rowKey(item)} className="director-paged-card-grid__cell">
            {renderItem(item)}
          </div>
        ))}
      </div>
      <div className="director-pagination" role="navigation" aria-label="卡片分页">
        <button
          type="button"
          className="director-pagination__btn"
          disabled={safePage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          上一页
        </button>
        <span className="director-pagination__info">
          第 <strong>{safePage}</strong> / {totalPages} 页 · 共 {total} 条 · 每页 {pageSize} 条
        </span>
        <button
          type="button"
          className="director-pagination__btn"
          disabled={safePage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          下一页
        </button>
      </div>
    </div>
  )
}
