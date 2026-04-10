export function getAssignedTechnicianIds(job = {}) {
  const ids = Array.isArray(job.technician_ids)
    ? job.technician_ids
    : job.technician_id !== null && job.technician_id !== undefined && job.technician_id !== ''
      ? [job.technician_id]
      : []

  const seen = new Set()
  return ids.filter((id) => {
    const key = String(id)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildJobAssignmentPayload(form = {}) {
  const technicianIds = getAssignedTechnicianIds(form)

  return {
    technician_ids: technicianIds,
    technician_id: technicianIds[0] ?? null,
  }
}

export function createWorkerLookup(workers = []) {
  return Object.fromEntries(workers.map((worker) => [String(worker.id), worker.name]))
}

export function getAssignedTechnicianNames(job = {}, workersById = {}) {
  const technicianIds = getAssignedTechnicianIds(job)

  if (!technicianIds.length) {
    return job.workers?.name ? [job.workers.name] : []
  }

  return technicianIds
    .map((id) => workersById[String(id)])
    .filter(Boolean)
}

export function formatAssignedTechnicians(job = {}, workersById = {}) {
  const names = getAssignedTechnicianNames(job, workersById)
  return names.length ? names.join(', ') : 'Unassigned'
}

export function jobHasAssignedTechnician(job = {}, technicianId) {
  return getAssignedTechnicianIds(job).some((id) => String(id) === String(technicianId))
}
