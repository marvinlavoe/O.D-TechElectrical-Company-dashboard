export const DATABASE_NAME = 'odtech'
export const DATABASE_VERSION = 2

export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    type TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY NOT NULL,
    customer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS billing_documents (
    id TEXT PRIMARY KEY NOT NULL,
    document_number TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Invoice', 'Quote')),
    date TEXT NOT NULL,
    amount_minor INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`,
  `CREATE TABLE IF NOT EXISTS document_items (
    id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL,
    description TEXT NOT NULL,
    qty INTEGER NOT NULL,
    price_minor INTEGER NOT NULL,
    FOREIGN KEY (document_id) REFERENCES billing_documents(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY NOT NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    job_id TEXT,
    date TEXT NOT NULL,
    amount_minor INTEGER NOT NULL DEFAULT 0,
    method TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_billing_documents_date ON billing_documents(date)',
  'CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date)',
  'CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id)',
]
