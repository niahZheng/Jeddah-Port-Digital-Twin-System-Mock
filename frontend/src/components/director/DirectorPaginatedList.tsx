import { useEffect, useMemo, useState, type ReactNode } from 'react'

const DEFAULT_PAGE_SIZE = 10

type Props<T> = {
  items: T[]
  pageSize?: number
  /** globalIndex 为整条列表中的从 0 开始的序号，保证分页后 key 稳定 */
  rowKey: (item: T, globalIndex: number) => string
  renderItem: (item: T) => ReactNode
  /** 列表外层 ol / ul */
  listType?: 'ol' | 'ul'
  className?: string
}

export function DirectorPaginatedList<T>(props: Props<T>) {
  const {
    items,
    pageSize = DEFAULT_PAGE_SIZE,
    rowKey,
    renderItem,
    listType = 'ul',
    className = '',
  } = props
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

  const listBody = slice.map((item, i) => {
    const globalIndex = (safePage - 1) * pageSize + i
    return (
      <li key={rowKey(item, globalIndex)} className="director-paginated-list__li">
        {renderItem(item)}
      </li>
    )
  })

  const listClass = 'director-paginated-list__body director-insights director-insights--paged'

  return (
    <div className={`director-paginated-list ${className}`.trim()}>
      {listType === 'ol' ? (
        <ol className={listClass} start={(safePage - 1) * pageSize + 1}>
          {listBody}
        </ol>
      ) : (
        <ul className={listClass}>{listBody}</ul>
      )}
      <div className="director-pagination" role="navigation" aria-label="列表分页">
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
