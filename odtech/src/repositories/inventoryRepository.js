import { queryDatabase, runDatabase } from "../db/sqlite";
import {
  createLocalId,
  fromMinorUnits,
  nowIso,
  toMinorUnits,
} from "../lib/localData";
import { triggerBackgroundSync } from "../lib/syncService";

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
     (id, name, category, qty, unit, threshold, status, supplier, cost_minor, selling_price_minor, location, synced, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
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
  triggerBackgroundSync();
  return { ...item, id, created_at: timestamp, updated_at: timestamp };
}

export async function updateInventoryItem(id, item) {
  const timestamp = nowIso();
  await runDatabase(
    `UPDATE inventory
     SET name = ?, category = ?, qty = ?, unit = ?, threshold = ?, status = ?, supplier = ?, cost_minor = ?, selling_price_minor = ?, location = ?, synced = 0, updated_at = ?
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
  triggerBackgroundSync();
  return { ...item, id, updated_at: timestamp };
}
