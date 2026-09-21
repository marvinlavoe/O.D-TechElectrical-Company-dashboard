import { supabase } from "./supabase";
import { queryDatabase, runDatabase, withTransaction } from "../db/sqlite";
import { fromMinorUnits, toMinorUnits, nowIso } from "./localData";
import { isMobileApp } from "./platform";
import useAuthStore from "../store/useAuthStore";

const LAST_SYNC_KEY = "odtech.last_sync_time";
let isSyncingState = false;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener(isSyncingState);
    } catch (err) {
      console.error("Sync listener error:", err);
    }
  });
}

export function subscribeSyncStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getIsSyncing() {
  return isSyncingState;
}

export function getLastSyncTime() {
  return localStorage.getItem(LAST_SYNC_KEY) || null;
}

export function setLastSyncTime(timestamp = nowIso()) {
  localStorage.setItem(LAST_SYNC_KEY, timestamp);
}

/**
 * PUSH: Upload local unsynced records (synced = 0) to Supabase
 */
async function pushLocalChangesToSupabase() {
  const pushSummary = {
    customers: 0,
    billing: 0,
    receipts: 0,
    inventory: 0,
  };

  // 1. Customers
  const localCustomers = await queryDatabase(
    "SELECT * FROM customers WHERE synced = 0",
  );
  if (localCustomers.values?.length) {
    for (const c of localCustomers.values) {
      const payload = {
        id: c.id,
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        city: c.city || null,
        type: c.type || null,
        status: c.status || "Active",
        notes: c.notes || null,
        created_at: c.created_at || nowIso(),
        updated_at: c.updated_at || nowIso(),
      };
      const { error } = await supabase.from("customers").upsert(payload);
      if (!error) {
        await runDatabase("UPDATE customers SET synced = 1 WHERE id = ?", [c.id]);
        pushSummary.customers += 1;
      } else {
        console.warn("Error pushing customer:", c.id, error.message);
      }
    }
  }

  // 2. Billing Documents (Invoices and Quotes)
  const localDocs = await queryDatabase(
    "SELECT * FROM billing_documents WHERE synced = 0",
  );
  if (localDocs.values?.length) {
    for (const d of localDocs.values) {
      const payload = {
        id: d.id,
        document_number: d.document_number,
        customer_id: d.customer_id,
        type: d.type,
        date: d.date,
        amount: fromMinorUnits(d.amount_minor),
        workmanship_cost: fromMinorUnits(d.workmanship_cost_minor),
        discount_percentage: Number(d.discount_percentage || 0),
        discount: fromMinorUnits(d.discount_minor),
        gross_total: fromMinorUnits(d.gross_total_minor),
        net_total: fromMinorUnits(d.net_total_minor),
        payment_details: d.payment_details || null,
        status: d.status,
        created_at: d.created_at || nowIso(),
        updated_at: d.updated_at || nowIso(),
      };

      const { error: docError } = await supabase
        .from("billing_documents")
        .upsert(payload);

      if (!docError) {
        // Push line items
        const localItems = await queryDatabase(
          "SELECT * FROM document_items WHERE document_id = ?",
          [d.id],
        );
        if (localItems.values?.length) {
          const itemPayloads = localItems.values.map((item) => ({
            id: item.id,
            document_id: d.id,
            description: item.description,
            qty: Number(item.qty),
            price: fromMinorUnits(item.price_minor),
          }));
          await supabase.from("document_items").upsert(itemPayloads);
        }

        await runDatabase(
          "UPDATE billing_documents SET synced = 1 WHERE id = ?",
          [d.id],
        );
        pushSummary.billing += 1;
      } else {
        console.warn("Error pushing billing document:", d.id, docError.message);
      }
    }
  }

  // 3. Receipts
  const localReceipts = await queryDatabase(
    "SELECT * FROM receipts WHERE synced = 0",
  );
  if (localReceipts.values?.length) {
    for (const r of localReceipts.values) {
      const payload = {
        id: r.id,
        receipt_number: r.receipt_number,
        customer_id: r.customer_id,
        job_id: r.job_id || null,
        date: r.date,
        amount: fromMinorUnits(r.amount_minor),
        method: r.method,
        notes: r.notes || null,
        created_at: r.created_at || nowIso(),
        updated_at: r.updated_at || nowIso(),
      };
      const { error } = await supabase.from("receipts").upsert(payload);
      if (!error) {
        await runDatabase("UPDATE receipts SET synced = 1 WHERE id = ?", [r.id]);
        pushSummary.receipts += 1;
      } else {
        console.warn("Error pushing receipt:", r.id, error.message);
      }
    }
  }

  // 4. Inventory
  const localInventory = await queryDatabase(
    "SELECT * FROM inventory WHERE synced = 0",
  );
  if (localInventory.values?.length) {
    for (const item of localInventory.values) {
      const payload = {
        id: item.id,
        name: item.name,
        category: item.category,
        qty: Number(item.qty),
        unit: item.unit,
        threshold: Number(item.threshold),
        status: item.status,
        supplier: item.supplier || null,
        cost: fromMinorUnits(item.cost_minor),
        selling_price: fromMinorUnits(item.selling_price_minor),
        location: item.location || null,
        created_at: item.created_at || nowIso(),
        updated_at: item.updated_at || nowIso(),
      };
      const { error } = await supabase.from("inventory").upsert(payload);
      if (!error) {
        await runDatabase("UPDATE inventory SET synced = 1 WHERE id = ?", [
          item.id,
        ]);
        pushSummary.inventory += 1;
      } else {
        console.warn("Error pushing inventory:", item.id, error.message);
      }
    }
  }

  return pushSummary;
}

/**
 * PULL: Download records from Supabase into local SQLite
 */
async function pullRemoteChangesFromSupabase() {
  const pullSummary = {
    customers: 0,
    billing: 0,
    receipts: 0,
    inventory: 0,
  };

  // 1. Pull Customers
  const { data: remoteCustomers, error: custError } = await supabase
    .from("customers")
    .select("*");

  if (!custError && remoteCustomers?.length) {
    for (const c of remoteCustomers) {
      await runDatabase(
        `INSERT INTO customers (id, name, phone, email, address, city, type, status, notes, synced, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           phone = excluded.phone,
           email = excluded.email,
           address = excluded.address,
           city = excluded.city,
           type = excluded.type,
           status = excluded.status,
           notes = excluded.notes,
           synced = 1,
           updated_at = excluded.updated_at`,
        [
          c.id,
          c.name || "Unnamed Customer",
          c.phone || null,
          c.email || null,
          c.address || null,
          c.city || null,
          c.type || null,
          c.status || "Active",
          c.notes || null,
          c.created_at || nowIso(),
          c.updated_at || nowIso(),
        ],
      );
      pullSummary.customers += 1;
    }
  }

  // 2. Pull Billing Documents & Items
  const { data: remoteDocs, error: docsError } = await supabase
    .from("billing_documents")
    .select("*, document_items(*)");

  if (!docsError && remoteDocs?.length) {
    for (const doc of remoteDocs) {
      await withTransaction(async (db) => {
        await db.run(
          `INSERT INTO billing_documents
           (id, document_number, customer_id, type, date, amount_minor, workmanship_cost_minor, discount_percentage, discount_minor, gross_total_minor, net_total_minor, payment_details, status, synced, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             document_number = excluded.document_number,
             customer_id = excluded.customer_id,
             type = excluded.type,
             date = excluded.date,
             amount_minor = excluded.amount_minor,
             workmanship_cost_minor = excluded.workmanship_cost_minor,
             discount_percentage = excluded.discount_percentage,
             discount_minor = excluded.discount_minor,
             gross_total_minor = excluded.gross_total_minor,
             net_total_minor = excluded.net_total_minor,
             payment_details = COALESCE(excluded.payment_details, billing_documents.payment_details),
             status = excluded.status,
             synced = 1,
             updated_at = excluded.updated_at`,
          [
            doc.id,
            doc.document_number,
            doc.customer_id,
            doc.type,
            doc.date,
            toMinorUnits(doc.amount),
            toMinorUnits(doc.workmanship_cost),
            Number(doc.discount_percentage || 0),
            toMinorUnits(doc.discount),
            toMinorUnits(doc.gross_total),
            toMinorUnits(doc.net_total),
            doc.payment_details || null,
            doc.status,
            doc.created_at || nowIso(),
            doc.updated_at || nowIso(),
          ],
        );

        if (doc.document_items?.length) {
          await db.run("DELETE FROM document_items WHERE document_id = ?", [
            doc.id,
          ]);
          for (const item of doc.document_items) {
            await db.run(
              `INSERT INTO document_items (id, document_id, description, qty, price_minor)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 description = excluded.description,
                 qty = excluded.qty,
                 price_minor = excluded.price_minor`,
              [
                item.id,
                doc.id,
                item.description || "",
                Number(item.qty || 1),
                toMinorUnits(item.price),
              ],
            );
          }
        }
      });
      pullSummary.billing += 1;
    }
  }

  // 3. Pull Receipts
  const { data: remoteReceipts, error: recError } = await supabase
    .from("receipts")
    .select("*");

  if (!recError && remoteReceipts?.length) {
    for (const r of remoteReceipts) {
      await runDatabase(
        `INSERT INTO receipts
         (id, receipt_number, customer_id, job_id, date, amount_minor, method, notes, synced, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           receipt_number = excluded.receipt_number,
           customer_id = excluded.customer_id,
           job_id = excluded.job_id,
           date = excluded.date,
           amount_minor = excluded.amount_minor,
           method = excluded.method,
           notes = excluded.notes,
           synced = 1,
           updated_at = excluded.updated_at`,
        [
          r.id,
          r.receipt_number,
          r.customer_id,
          r.job_id || null,
          r.date,
          toMinorUnits(r.amount),
          r.method,
          r.notes || null,
          r.created_at || nowIso(),
          r.updated_at || nowIso(),
        ],
      );
      pullSummary.receipts += 1;
    }
  }

  // 4. Pull Inventory
  const { data: remoteInventory, error: invError } = await supabase
    .from("inventory")
    .select("*");

  if (!invError && remoteInventory?.length) {
    for (const item of remoteInventory) {
      await runDatabase(
        `INSERT INTO inventory
         (id, name, category, qty, unit, threshold, status, supplier, cost_minor, selling_price_minor, location, synced, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           category = excluded.category,
           qty = excluded.qty,
           unit = excluded.unit,
           threshold = excluded.threshold,
           status = excluded.status,
           supplier = excluded.supplier,
           cost_minor = excluded.cost_minor,
           selling_price_minor = excluded.selling_price_minor,
           location = excluded.location,
           synced = 1,
           updated_at = excluded.updated_at`,
        [
          item.id,
          item.name,
          item.category,
          Number(item.qty || 0),
          item.unit,
          Number(item.threshold || 0),
          item.status,
          item.supplier || null,
          toMinorUnits(item.cost),
          toMinorUnits(item.selling_price),
          item.location || null,
          item.created_at || nowIso(),
          item.updated_at || nowIso(),
        ],
      );
      pullSummary.inventory += 1;
    }
  }

  return pullSummary;
}

/**
 * Perform full two-way synchronization
 */
export async function syncAllData({ silent = false } = {}) {
  if (isSyncingState) {
    console.debug("Sync already in progress, skipping duplicate trigger.");
    return { success: false, inProgress: true };
  }

  const { session } = useAuthStore.getState();
  if (!session?.user) {
    console.debug("User is not authenticated. Skipping sync.");
    return { success: false, notAuthenticated: true };
  }

  isSyncingState = true;
  notifyListeners();

  try {
    // 1. Push local changes to Supabase first
    const pushed = await pushLocalChangesToSupabase();
    // 2. Pull remote records from Supabase
    const pulled = await pullRemoteChangesFromSupabase();

    const timestamp = nowIso();
    setLastSyncTime(timestamp);

    return {
      success: true,
      pushed,
      pulled,
      timestamp,
    };
  } catch (error) {
    console.error("Sync error:", error);
    return {
      success: false,
      error: error?.message || "Sync failed",
    };
  } finally {
    isSyncingState = false;
    notifyListeners();
  }
}

let backgroundSyncTimer = null;

export function triggerBackgroundSync(delayMs = 1500) {
  if (typeof window === "undefined") return;
  if (!isMobileApp) return;

  if (backgroundSyncTimer) {
    clearTimeout(backgroundSyncTimer);
  }

  backgroundSyncTimer = setTimeout(() => {
    syncAllData({ silent: true }).catch((err) =>
      console.warn("Background sync error:", err),
    );
  }, delayMs);
}
