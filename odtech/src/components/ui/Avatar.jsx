import { getInitials } from '../../lib/utils'

export default function Avatar({ src, name = '', size = 'md', className = '' }) {
  const sizes = {
    xs:  'w-6 h-6 text-xs',
    sm:  'w-8 h-8 text-xs',
    md:  'w-10 h-10 text-sm',
    lg:  'w-14 h-14 text-base',
    xl:  'w-20 h-20 text-xl',
  }

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover flex-shrink-0 ${sizes[size]} ${className}`}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center
                  flex-shrink-0 select-none ${sizes[size]} ${className}`}
    >
      {getInitials(name)}
    </div>
  )
}
