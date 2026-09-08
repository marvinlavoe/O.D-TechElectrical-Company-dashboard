import { DATABASE_VERSION, schemaStatements } from './schema'

export async function migrateDatabase(db) {
  await db.execute('PRAGMA foreign_keys = ON')

  const versionResult = await db.query('PRAGMA user_version')
  const currentVersion = Number(versionResult.values?.[0]?.user_version || 0)

  if (currentVersion < 1) {
    for (const statement of schemaStatements) {
      await db.execute(statement)
    }
  }

  if (currentVersion >= 1 && currentVersion < 2) {
    await db.execute('ALTER TABLE customers ADD COLUMN city TEXT')
    await db.execute('ALTER TABLE customers ADD COLUMN type TEXT')
    await db.execute("ALTER TABLE customers ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'")
    await db.execute('ALTER TABLE customers ADD COLUMN notes TEXT')
  }

  if (currentVersion !== DATABASE_VERSION) {
    await db.execute(`PRAGMA user_version = ${DATABASE_VERSION}`)
  }
}
