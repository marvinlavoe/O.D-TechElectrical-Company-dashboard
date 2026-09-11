import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { DATABASE_NAME } from "./schema";
import { ensureCustomerSchema, migrateDatabase } from "./migrations";
import { isMobileApp } from "../lib/platform";

let connectionPromise;
let transactionQueue = Promise.resolve();

function queueDatabaseWork(work) {
  const queuedWork = transactionQueue.then(work);
  transactionQueue = queuedWork.catch(() => {});
  return queuedWork;
}

async function openDatabase() {
  if (!isMobileApp) {
    throw new Error(
      "The local SQLite database is available in the Android app only.",
    );
  }

  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const db = await sqlite.createConnection(
    DATABASE_NAME,
    false,
    "no-encryption",
    1,
    false,
  );
  await db.open();
  await ensureCustomerSchema(db);
  try {
    await migrateDatabase(db);
  } catch (error) {
    console.error(
      "Database migration failed; customer data remains available:",
      error,
    );
  }
  return db;
}

export function getDatabase() {
  connectionPromise ??= openDatabase().catch((error) => {
    connectionPromise = undefined;
    throw error;
  });
  return connectionPromise;
}

export async function initializeDatabase() {
  await getDatabase();
}

export async function closeDatabase() {
  const db = await connectionPromise;
  if (!db) return;

  await db.close();
  connectionPromise = undefined;
  transactionQueue = Promise.resolve();
}

export async function queryDatabase(statement, values = []) {
  const db = await getDatabase();
  return db.query(statement, values);
}

export function runDatabase(statement, values = []) {
  return queueDatabaseWork(async () => {
    const db = await getDatabase();
    return db.run(statement, values);
  });
}

export async function withTransaction(callback) {
  return queueDatabaseWork(async () => {
    const db = await getDatabase();

    try {
      await db.beginTransaction();
    } catch (error) {
      if (!String(error?.message || error).includes("Already in transaction")) {
        throw error;
      }

      await db.rollbackTransaction().catch(() => {});
      await db.beginTransaction();
    }

    try {
      // `run()` starts its own transaction by default. Every statement in this
      // callback must instead join the explicit transaction opened above.
      const transactionDb = new Proxy(db, {
        get(target, property) {
          if (property === "run") {
            return (
              statement,
              values = [],
              _transaction,
              returnMode,
              isSQL92,
            ) => target.run(statement, values, false, returnMode, isSQL92);
          }

          const value = target[property];
          return typeof value === "function" ? value.bind(target) : value;
        },
      });

      const result = await callback(transactionDb);
      await db.commitTransaction();
      return result;
    } catch (error) {
      await db.rollbackTransaction().catch(() => {});
      throw error;
    }
  });
}
