import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Drawer({ isOpen, onClose, title, children, width = 'w-[480px]' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      {/* Slide panel */}
      <div
        className={`
          fixed top-0 right-0 h-full z-50 bg-surface-card border-l border-surface-border
          flex flex-col shadow-2xl transition-transform duration-300 ease-out
          ${width}
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border flex-shrink-0">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </>
  )
}
