import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

const Select = forwardRef(function Select(
  { label, error, options = [], placeholder = 'Select…', className = '', ...props },
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
        <select
          ref={ref}
          className={`
            w-full appearance-none bg-surface border rounded-lg py-2 px-3 pr-9 text-sm
            text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer
            ${error ? 'border-danger' : 'border-surface-border'}
            ${className}
          `}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
})

export default Select
