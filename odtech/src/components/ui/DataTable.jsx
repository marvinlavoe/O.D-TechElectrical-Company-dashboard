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
  const [page, setPage]   = useState(1)

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
    <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
      {searchable && (
        <div className="px-4 py-3 border-b border-surface-border">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1) }}
              placeholder="Search…"
              className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-3 py-1.5
                         text-sm text-text-primary placeholder:text-text-muted
                         focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
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
                    className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap"
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
                  className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-surface-hover' : 'hover:bg-surface/50'}`}
                >
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-text-secondary whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > pageSize && (
        <div className="px-4 py-3 border-t border-surface-border flex items-center justify-between">
          <p className="text-xs text-text-muted">
            {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-surface disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} className="text-text-secondary" />
            </button>
            <span className="px-2 py-1 text-xs text-text-muted self-center">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-surface disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} className="text-text-secondary" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
