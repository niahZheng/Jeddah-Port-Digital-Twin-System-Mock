import { useEffect, useMemo, useState, type ReactNode } from 'react'

export type DirectorTableColumn<T extends Record<string, unknown>> = {
  key: string
  label: string
  render?: (row: T) => ReactNode
  headerClassName?: string
  cellClassName?: string
}

const DEFAULT_PAGE_SIZE = 10

type Props<T extends Record<string, unknown>> = {
  columns: DirectorTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  pageSize?: number
  /** 列多、需横向滚动时置 true */
  wide?: boolean
}

export function DirectorPaginatedTable<T extends Record<string, unknown>>(props: Props<T>) {
  const { columns, rows, rowKey, pageSize = DEFAULT_PAGE_SIZE, wide } = props
  const [page, setPage] = useState(1)

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    setPage(1)
  }, [rows])

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  const safePage = Math.min(Math.max(1, page), totalPages)
  const slice = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, safePage, pageSize])

  return (
    <div className={`director-paginated-table${wide ? ' director-paginated-table--wide' : ''}`}>
      <div className={`director-table-frame${wide ? ' director-table-frame--wide' : ''}`}>
        <table className="director-table director-table--paged-rows">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.headerClassName}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={rowKey(r)} className="director-table-tbody-row">
                {columns.map((c) => (
                  <td key={c.key} className={c.cellClassName}>
                    {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="director-pagination" role="navigation" aria-label="表格分页">
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
