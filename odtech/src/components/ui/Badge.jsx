const colorMap = {
  success: 'bg-success/10 text-success border border-success/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  danger:  'bg-danger/10 text-danger border border-danger/20',
  info:    'bg-info/10 text-info border border-info/20',
  default: 'bg-surface text-text-secondary border border-surface-border',
}

export default function Badge({ label, color = 'default', dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[color]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
      {label}
    </span>
  )
}
