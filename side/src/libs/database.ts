import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { axiesTable } from '../schema'
import { AXIES } from '../constants/axies'

// Path to SQLite database (side project root)
const dbPath = './dev.db'
// @ts-ignore
const sqlite = new Database(dbPath)

export const db = drizzle(sqlite)

export async function seedAxies() {
  const existing = await db.select().from(axiesTable)
  if (existing.length === 0) {
    const toInsert = AXIES.map((axie) => ({
      id: axie.id,
      name: axie.name,
      isRevealed: false,
    }))

    if (toInsert.length > 0) {
      // @ts-ignore - drizzle type for insert
      await db.insert(axiesTable).values(toInsert)
    }
  }
}

export async function closeDb() {
  sqlite.close()
}
