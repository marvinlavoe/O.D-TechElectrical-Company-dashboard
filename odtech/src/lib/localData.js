export function createLocalId() {
  return crypto.randomUUID()
}

export function toMinorUnits(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100)
}

export function fromMinorUnits(value) {
  return Number(value || 0) / 100
}

export function nowIso() {
  return new Date().toISOString()
}
