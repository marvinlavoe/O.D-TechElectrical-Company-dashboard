import { queryDatabase, runDatabase } from "../db/sqlite";
import {
  createLocalId,
  fromMinorUnits,
  nowIso,
  toMinorUnits,
} from "../lib/localData";

function mapInventory(row) {
  return {
    ...row,
    cost: fromMinorUnits(row.cost_minor),
    selling_price: fromMinorUnits(row.selling_price_minor),
  };
}

export async function listInventory() {
  const result = await queryDatabase(
    "SELECT * FROM inventory ORDER BY created_at DESC",
  );
  return (result.values || []).map(mapInventory);
}

export async function getInventoryItem(id) {
  const result = await queryDatabase("SELECT * FROM inventory WHERE id = ?", [
    id,
  ]);
  const row = result.values?.[0];
  return row ? mapInventory(row) : null;
}

export async function createInventoryItem(item) {
  const id = createLocalId();
  const timestamp = nowIso();
  await runDatabase(
    `INSERT INTO inventory
     (id, name, category, qty, unit, threshold, status, supplier, cost_minor, selling_price_minor, location, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      item.name.trim(),
      item.category,
      Number(item.qty),
      item.unit,
      Number(item.threshold),
      item.status,
      item.supplier || null,
      toMinorUnits(item.cost),
      toMinorUnits(item.selling_price),
      item.location || null,
      timestamp,
      timestamp,
    ],
  );
  return { ...item, id, created_at: timestamp, updated_at: timestamp };
}

export async function updateInventoryItem(id, item) {
  const timestamp = nowIso();
  await runDatabase(
    `UPDATE inventory
     SET name = ?, category = ?, qty = ?, unit = ?, threshold = ?, status = ?, supplier = ?, cost_minor = ?, selling_price_minor = ?, location = ?, updated_at = ?
     WHERE id = ?`,
    [
      item.name.trim(),
      item.category,
      Number(item.qty),
      item.unit,
      Number(item.threshold),
      item.status,
      item.supplier || null,
      toMinorUnits(item.cost),
      toMinorUnits(item.selling_price),
      item.location || null,
      timestamp,
      id,
    ],
  );
  return { ...item, id, updated_at: timestamp };
}
