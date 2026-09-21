import { DATABASE_VERSION, schemaStatements } from "./schema";

async function hasColumn(db, table, column) {
  const result = await db.query(`PRAGMA table_info(${table})`);
  return (result.values || []).some((entry) => entry.name === column);
}

async function addColumnIfMissing(db, table, column, definition) {
  if (!(await hasColumn(db, table, column))) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export async function ensureCustomerSchema(db) {
  await db.execute(schemaStatements[1]);
  await addColumnIfMissing(db, "customers", "city", "TEXT");
  await addColumnIfMissing(db, "customers", "type", "TEXT");
  await addColumnIfMissing(
    db,
    "customers",
    "status",
    "TEXT NOT NULL DEFAULT 'Active'",
  );
  await addColumnIfMissing(db, "customers", "notes", "TEXT");
}

export async function migrateDatabase(db) {
  await db.execute("PRAGMA foreign_keys = ON");

  const versionResult = await db.query("PRAGMA user_version");
  const currentVersion = Number(versionResult.values?.[0]?.user_version || 0);

  if (currentVersion < 1) {
    for (const statement of schemaStatements) {
      await db.execute(statement);
    }
  }

  if (currentVersion >= 1 && currentVersion < 2) {
    await addColumnIfMissing(db, "customers", "city", "TEXT");
    await addColumnIfMissing(db, "customers", "type", "TEXT");
    await addColumnIfMissing(
      db,
      "customers",
      "status",
      "TEXT NOT NULL DEFAULT 'Active'",
    );
    await addColumnIfMissing(db, "customers", "notes", "TEXT");
  }

  if (currentVersion >= 2 && currentVersion < 3) {
    await addColumnIfMissing(
      db,
      "billing_documents",
      "workmanship_cost_minor",
      "INTEGER NOT NULL DEFAULT 0",
    );
    await addColumnIfMissing(
      db,
      "billing_documents",
      "discount_minor",
      "INTEGER NOT NULL DEFAULT 0",
    );
    await addColumnIfMissing(
      db,
      "billing_documents",
      "gross_total_minor",
      "INTEGER NOT NULL DEFAULT 0",
    );
    await addColumnIfMissing(
      db,
      "billing_documents",
      "net_total_minor",
      "INTEGER NOT NULL DEFAULT 0",
    );
    await db.execute(
      "UPDATE billing_documents SET gross_total_minor = amount_minor, net_total_minor = amount_minor WHERE gross_total_minor = 0 AND amount_minor != 0",
    );
  }

  if (currentVersion >= 3 && currentVersion < 4) {
    await addColumnIfMissing(
      db,
      "billing_documents",
      "discount_percentage",
      "REAL NOT NULL DEFAULT 0",
    );
  }

  if (currentVersion >= 4 && currentVersion < 5) {
    await db.execute(schemaStatements[3]);
  }

  await ensureCustomerSchema(db);
  await db.execute(schemaStatements[2]);
  await db.execute(schemaStatements[3]);
  await addColumnIfMissing(
    db,
    "billing_documents",
    "workmanship_cost_minor",
    "INTEGER NOT NULL DEFAULT 0",
  );
  await addColumnIfMissing(
    db,
    "billing_documents",
    "discount_minor",
    "INTEGER NOT NULL DEFAULT 0",
  );
  await addColumnIfMissing(
    db,
    "billing_documents",
    "discount_percentage",
    "REAL NOT NULL DEFAULT 0",
  );
  await addColumnIfMissing(
    db,
    "billing_documents",
    "gross_total_minor",
    "INTEGER NOT NULL DEFAULT 0",
  );
  await addColumnIfMissing(
    db,
    "billing_documents",
    "net_total_minor",
    "INTEGER NOT NULL DEFAULT 0",
  );

  if (currentVersion !== DATABASE_VERSION) {
    await db.execute(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}
