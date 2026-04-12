export default function StatCard({ title, value, subtitle, icon, color = 'text-primary', trend }) {
  const IconComponent = icon

  return (
    <div className="bg-surface-card rounded-xl p-4 sm:p-5 border border-surface-border hover:border-primary/30 transition-colors group">
      <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
        <p className="min-w-0 text-sm font-medium text-text-secondary">{title}</p>
        <div className={`p-2 rounded-lg bg-surface ${color} group-hover:scale-110 transition-transform`}>
          <IconComponent size={16} className="sm:hidden" />
          <IconComponent size={18} className="hidden sm:block" />
        </div>
      </div>
      <p className="text-xl sm:text-2xl break-words font-bold text-text-primary tracking-tight">{value}</p>
      <div className="flex flex-col gap-1 mt-1 sm:flex-row sm:items-center sm:gap-2">
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  )
}
