import { queryDatabase, runDatabase, withTransaction } from "../db/sqlite";
import {
  createLocalId,
  fromMinorUnits,
  nowIso,
  toMinorUnits,
} from "../lib/localData";

export async function listReceipts() {
  const result = await queryDatabase(
    `SELECT r.*, c.name AS customer_name, j.title AS job_title
     FROM receipts r
     LEFT JOIN customers c ON c.id = r.customer_id
     LEFT JOIN jobs j ON j.id = r.job_id
     ORDER BY r.created_at DESC`,
  );
  return (result.values || []).map((row) => ({
    ...row,
    amount: fromMinorUnits(row.amount_minor),
    customer: row.customer_name ? { name: row.customer_name } : null,
    customers: row.customer_name ? { name: row.customer_name } : null,
    job: row.job_title ? { title: row.job_title } : null,
    jobs: row.job_title ? { title: row.job_title } : null,
  }));
}

async function nextReceiptNumber(db, year) {
  const key = `sequence:REC:${year}`;
  const result = await db.query(
    "SELECT value FROM app_settings WHERE key = ?",
    [key],
  );
  const next = Number(result.values?.[0]?.value || 0) + 1;
  await db.run(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, String(next), nowIso()],
  );
  return `REC-${year}-${String(next).padStart(4, "0")}`;
}

export async function createReceipt(form) {
  const id = createLocalId();
  const timestamp = nowIso();

  return withTransaction(async (db) => {
    const receiptNumber = await nextReceiptNumber(db, form.date.slice(0, 4));
    await db.run(
      `INSERT INTO receipts
       (id, receipt_number, customer_id, job_id, date, amount_minor, method, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        receiptNumber,
        form.customer_id,
        form.job_id || null,
        form.date,
        toMinorUnits(form.amount),
        form.method,
        form.notes || null,
        timestamp,
        timestamp,
      ],
    );
    return {
      ...form,
      id,
      receipt_number: receiptNumber,
      created_at: timestamp,
      updated_at: timestamp,
    };
  });
}

export async function updateReceipt(id, form) {
  const timestamp = nowIso();
  await runDatabase(
    `UPDATE receipts
     SET customer_id = ?, job_id = ?, date = ?, amount_minor = ?, method = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [
      form.customer_id,
      form.job_id || null,
      form.date,
      toMinorUnits(form.amount),
      form.method,
      form.notes || null,
      timestamp,
      id,
    ],
  );
  return { ...form, id, updated_at: timestamp };
}
