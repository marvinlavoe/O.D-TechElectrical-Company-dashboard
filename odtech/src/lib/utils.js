/**
 * Format a date string to a readable format
 * @param {string|Date} date
 * @param {string} fmt - 'short' | 'long' | 'time'
 */
export function formatDate(date, fmt = 'short') {
  if (!date) return '—'
  const d = new Date(date)
  if (fmt === 'time') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (fmt === 'long')  return d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Format a number as currency */
export function formatCurrency(amount, currency = 'GHS') {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency }).format(amount ?? 0)
}

/** Truncate a string to maxLength characters */
export function truncate(str, maxLength = 40) {
  if (!str) return ''
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str
}

/** Return initials from a full name */
export function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/** Priority → colour mapping */
export const priorityColor = {
  High:   'danger',
  Medium: 'warning',
  Low:    'success',
}

/** Status → colour mapping */
export const statusColor = {
  Pending:     'warning',
  'In Progress': 'info',
  Completed:   'success',
  Cancelled:   'danger',
  Paid:        'success',
  Partial:     'warning',
  Unpaid:      'danger',
  Overdue:     'danger',
  Draft:       'default',
  Sent:        'info',
}
