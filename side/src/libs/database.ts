import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { axiesTable } from '../schema'

// Path to SQLite database (side project root)
const dbPath = './dev.db'
// @ts-ignore
const sqlite = new Database(dbPath)

export const db = drizzle(sqlite)

export async function seedAxies() {
  const existing = await db.select().from(axiesTable)
  if (existing.length === 0) {
    const data = [
      {
        id: '001',
        name: 'Krio',
        isRevealed: false,
      },
      {
        id: '002',
        name: 'Machito',
        isRevealed: false,
      },
      {
        id: '003',
        name: 'Olek',
        isRevealed: false,
      },
      {
        id: '004',
        name: 'Puff',
        isRevealed: false,
      },
      {
        id: '005',
        name: 'Buba',
        isRevealed: false,
      },
      {
        id: '006',
        name: 'Hope',
        isRevealed: false,
      },
      {
        id: '007',
        name: 'Rouge',
        isRevealed: false,
      },
      {
        id: '008',
        name: 'Noir',
        isRevealed: false,
      },
      {
        id: '009',
        name: 'Ena',
        isRevealed: false,
      },
      {
        id: '010',
        name: 'Xia',
        isRevealed: false,
      },
      {
        id: '011',
        name: 'Tripp',
        isRevealed: false,
      },
      {
        id: '012',
        name: 'Momo',
        isRevealed: false,
      },
    ]

    const toInsert = data.map((axie) => ({
      id: axie.id,
      name: axie.name,
      isRevealed: axie.isRevealed,
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
