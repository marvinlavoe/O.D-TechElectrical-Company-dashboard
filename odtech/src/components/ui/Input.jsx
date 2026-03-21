import { forwardRef } from 'react'

const Input = forwardRef(function Input(
  { label, error, hint, className = '', icon: Icon, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text-secondary">
          {label}
          {props.required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <Icon size={16} />
          </span>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-surface border rounded-lg py-2 px-3 text-sm text-text-primary
            placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${error ? 'border-danger' : 'border-surface-border'}
            ${Icon ? 'pl-9' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  )
})

export default Input
