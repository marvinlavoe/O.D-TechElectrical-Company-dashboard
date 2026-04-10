export function buildCustomerInsertPayload(form = {}) {
  return {
    name: form.full_name,
    email: form.email || null,
    phone: form.phone,
    address: form.address + (form.city ? `, ${form.city}` : ''),
    type: form.project_type,
    status: form.payment_status === 'unpaid' ? 'Inactive' : 'Active',
  }
}
