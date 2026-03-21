import { FolderOpen } from 'lucide-react'

export default function EmptyState({ title = 'Nothing here yet', subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mb-4">
        <FolderOpen size={24} className="text-text-muted" />
      </div>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
