export default function StatCard({ title, value, subtitle, icon: Icon, color = 'text-primary', trend }) {
  return (
    <div className="bg-surface-card rounded-xl p-5 border border-surface-border hover:border-primary/30 transition-colors group">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        <div className={`p-2 rounded-lg bg-surface ${color} group-hover:scale-110 transition-transform`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-text-primary tracking-tight">{value}</p>
      <div className="flex items-center gap-2 mt-1">
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
