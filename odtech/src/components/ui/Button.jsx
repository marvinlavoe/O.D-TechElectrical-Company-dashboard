export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  ...props
}) {
  const variants = {
    primary: 'bg-primary hover:bg-primary-dark text-white shadow-sm',
    outline: 'border border-surface-border text-text-secondary hover:bg-surface-hover hover:text-text-primary',
    danger:  'bg-danger hover:bg-red-600 text-white shadow-sm',
    success: 'bg-success hover:bg-emerald-600 text-white shadow-sm',
    ghost:   'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
  }
  const sizes = {
    xs: 'px-2.5 py-1 text-xs gap-1',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-sm gap-2',
  }

  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
