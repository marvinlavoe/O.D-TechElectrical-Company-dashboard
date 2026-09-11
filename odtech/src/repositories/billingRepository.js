import { queryDatabase, withTransaction } from "../db/sqlite";
import {
  createLocalId,
  fromMinorUnits,
  nowIso,
  toMinorUnits,
} from "../lib/localData";

function mapDocument(row) {
  return {
    ...row,
    amount: fromMinorUnits(row.amount_minor),
    workmanship_cost: fromMinorUnits(row.workmanship_cost_minor),
    discount_percentage: Number(row.discount_percentage || 0),
    discount: fromMinorUnits(row.discount_minor),
    gross_total: fromMinorUnits(row.gross_total_minor),
    net_total: fromMinorUnits(row.net_total_minor),
    customer: row.customer_name ? { name: row.customer_name } : null,
    customers: row.customer_name ? { name: row.customer_name } : null,
    items: row.items || [],
    document_items: row.items || [],
  };
}

async function nextDocumentNumber(db, type, year) {
  const prefix = type === "Invoice" ? "INV" : "QUO";
  const key = `sequence:${prefix}:${year}`;
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
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

const documentSelect = `
  SELECT d.*, c.name AS customer_name,
    COALESCE((SELECT json_group_array(json_object(
      'id', i.id, 'description', i.description, 'qty', i.qty, 'price', i.price_minor
    )) FROM document_items i WHERE i.document_id = d.id), '[]') AS item_json
  FROM billing_documents d
  LEFT JOIN customers c ON c.id = d.customer_id`;

function parseItems(row) {
  return JSON.parse(row.item_json || "[]").map((item) => ({
    ...item,
    price: fromMinorUnits(item.price),
  }));
}

export async function listDocuments(type) {
  const result = await queryDatabase(
    `${documentSelect} ${type ? "WHERE d.type = ?" : ""} ORDER BY d.created_at DESC`,
    type ? [type] : [],
  );
  return (result.values || []).map((row) =>
    mapDocument({ ...row, items: parseItems(row) }),
  );
}

export async function createDocument(form) {
  const id = createLocalId();
  const timestamp = nowIso();
  const year = form.date.slice(0, 4);

  return withTransaction(async (db) => {
    const documentNumber = await nextDocumentNumber(db, form.type, year);
    await db.run(
      `INSERT INTO billing_documents
      (id, document_number, customer_id, type, date, amount_minor, workmanship_cost_minor, discount_percentage, discount_minor, gross_total_minor, net_total_minor, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        documentNumber,
        form.customer_id,
        form.type,
        form.date,
        toMinorUnits(form.amount),
        toMinorUnits(form.workmanship_cost),
        Number(form.discount_percentage) || 0,
        toMinorUnits(form.discount),
        toMinorUnits(form.gross_total),
        toMinorUnits(form.net_total),
        form.status,
        timestamp,
        timestamp,
      ],
    );

    for (const item of form.items) {
      await db.run(
        `INSERT INTO document_items (id, document_id, description, qty, price_minor)
         VALUES (?, ?, ?, ?, ?)`,
        [
          createLocalId(),
          id,
          item.description.trim(),
          Number(item.qty),
          toMinorUnits(item.price),
        ],
      );
    }

    return {
      ...form,
      id,
      document_number: documentNumber,
      created_at: timestamp,
      updated_at: timestamp,
    };
  });
}

export async function updateDocument(id, form) {
  const timestamp = nowIso();

  return withTransaction(async (db) => {
    await db.run(
      `UPDATE billing_documents
      SET customer_id = ?, date = ?, amount_minor = ?, workmanship_cost_minor = ?, discount_percentage = ?, discount_minor = ?, gross_total_minor = ?, net_total_minor = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [
        form.customer_id,
        form.date,
        toMinorUnits(form.amount),
        toMinorUnits(form.workmanship_cost),
        Number(form.discount_percentage) || 0,
        toMinorUnits(form.discount),
        toMinorUnits(form.gross_total),
        toMinorUnits(form.net_total),
        form.status,
        timestamp,
        id,
      ],
    );
    await db.run("DELETE FROM document_items WHERE document_id = ?", [id]);

    for (const item of form.items) {
      await db.run(
        `INSERT INTO document_items (id, document_id, description, qty, price_minor)
         VALUES (?, ?, ?, ?, ?)`,
        [
          createLocalId(),
          id,
          item.description.trim(),
          Number(item.qty),
          toMinorUnits(item.price),
        ],
      );
    }

    return { ...form, id, updated_at: timestamp };
  });
}
