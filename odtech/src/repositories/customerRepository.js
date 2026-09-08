import { queryDatabase, runDatabase } from '../db/sqlite'
import { createLocalId, nowIso } from '../lib/localData'

export async function listCustomers() {
  const result = await queryDatabase(
    'SELECT * FROM customers ORDER BY name COLLATE NOCASE ASC',
  )
  return result.values || []
}

export async function listCustomerOptions() {
  const customers = await listCustomers()
  return customers.map((customer) => ({
    value: customer.id,
    label: customer.name,
  }))
}

export async function createCustomer(customer) {
  const id = createLocalId()
  const timestamp = nowIso()
  await runDatabase(
    `INSERT INTO customers (id, name, phone, email, address, city, type, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, customer.name.trim(), customer.phone || null, customer.email || null, customer.address || null, customer.city || null, customer.type || null, customer.status || 'Active', customer.notes || null, timestamp, timestamp],
  )
  return { ...customer, id, created_at: timestamp, updated_at: timestamp }
}

export async function updateCustomer(id, customer) {
  const timestamp = nowIso()
  await runDatabase(
    `UPDATE customers
     SET name = ?, phone = ?, email = ?, address = ?, updated_at = ?
     WHERE id = ?`,
    [customer.name.trim(), customer.phone || null, customer.email || null, customer.address || null, timestamp, id],
  )
  return { ...customer, id, updated_at: timestamp }
}
