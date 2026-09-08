import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { DATABASE_NAME } from './schema'
import { migrateDatabase } from './migrations'

let connectionPromise

async function openDatabase() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('The local SQLite database is available in the Android app only.')
  }

  const sqlite = new SQLiteConnection(CapacitorSQLite)
  const db = await sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', 1, false)
  await db.open()
  await migrateDatabase(db)
  return db
}

export function getDatabase() {
  connectionPromise ??= openDatabase().catch((error) => {
    connectionPromise = undefined
    throw error
  })
  return connectionPromise
}

export async function initializeDatabase() {
  await getDatabase()
}

export async function closeDatabase() {
  const db = await connectionPromise
  if (!db) return

  await db.close()
  connectionPromise = undefined
}

export async function queryDatabase(statement, values = []) {
  const db = await getDatabase()
  return db.query(statement, values)
}

export async function runDatabase(statement, values = []) {
  const db = await getDatabase()
  return db.run(statement, values)
}

export async function withTransaction(callback) {
  const db = await getDatabase()

  await db.beginTransaction()
  try {
    const result = await callback(db)
    await db.commitTransaction()
    return result
  } catch (error) {
    await db.rollbackTransaction()
    throw error
  }
}
