import { useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import EmptyState from './EmptyState'

export default function DataTable({
  columns,
  data = [],
  loading = false,
  pageSize = 10,
  onRowClick,
  searchable = true,
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = data.filter(row =>
    columns.some(col =>
      String(col.searchValue ? col.searchValue(row) : (row[col.key] ?? ''))
        .toLowerCase()
        .includes(query.toLowerCase())
    )
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
      {searchable && (
        <div className="border-b border-surface-border px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search…"
              className="w-full rounded-lg border border-surface-border bg-surface py-1.5 pl-8 pr-3
                         text-sm text-text-primary placeholder:text-text-muted
                         transition-colors focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      <div className="md:hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : slice.length === 0 ? (
          <EmptyState title="No results found" />
        ) : (
          <div className="divide-y divide-surface-border">
            {slice.map((row, i) => (
              <button
                key={row.id ?? i}
                type="button"
                onClick={() => onRowClick?.(row)}
                className={`w-full px-4 py-4 text-left transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-surface' : 'cursor-default'
                }`}
              >
                <div className="space-y-3">
                  {columns.map(col => (
                    <div
                      key={col.key}
                      className="flex items-start justify-between gap-4"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        {col.header}
                      </span>
                      <div className="min-w-0 flex-1 break-words text-right text-sm text-text-secondary">
                        {col.render
                          ? col.render(row[col.key], row)
                          : (row[col.key] ?? '—')}
                      </div>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : slice.length === 0 ? (
          <EmptyState title="No results found" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {slice.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-surface-hover'
                      : 'hover:bg-surface/50'
                  }`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-4 py-3 text-text-secondary"
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > pageSize && (
        <div className="flex flex-col gap-3 border-t border-surface-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-muted">
            {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1 self-end sm:self-auto">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg p-1.5 transition-colors hover:bg-surface disabled:opacity-40"
            >
              <ChevronLeft size={16} className="text-text-secondary" />
            </button>
            <span className="self-center px-2 py-1 text-xs text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg p-1.5 transition-colors hover:bg-surface disabled:opacity-40"
            >
              <ChevronRight size={16} className="text-text-secondary" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
