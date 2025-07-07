import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const hanana = sqliteTable('hanana', {
  id: text('id').primaryKey(),
  by: text('by').notNull(),

  status: text('status').notNull(),

  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  endedAt: text('ended_at').default(sql`CURRENT_TIMESTAMP`),
})

// Junction table for many-to-many relationship between users and hanana events
export const hananaParticipants = sqliteTable('hanana_participants', {
  hananaId: text('hanana_id')
    .notNull()
    .references(() => hanana.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  rod: text('rod').references(() => rods.id),
  uses: integer('uses').default(0).notNull(),

  joinedAt: text('joined_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),

  rates: text('rates').notNull(),

  // Store inventory as JSON: { "fishes": { "001": 1, "002": 0, ... }, "rods": { "001": 1, "002": 0, ... } }
  inventory: text('inventory').default('{"fishes":{},"rods":{}}').notNull(),

  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export const fishes = sqliteTable('fishes', {
  id: text('id').primaryKey(),
})

export const trashes = sqliteTable('trashes', {
  id: text('id').primaryKey(),
})

export const nfts = sqliteTable('nfts', {
  id: text('id').primaryKey(),
})

export const rods = sqliteTable('rods', {
  id: text('id').primaryKey(),
})

// Exchange table to track sell transactions and prevent double spending
export const exchanges = sqliteTable('exchanges', {
  id: text('id').primaryKey(), // UUID for unique exchange ID
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Store the items that were sold as JSON: { "001": 5, "002": 3, ... }
  itemsSold: text('items_sold').notNull(),

  // Total candies earned from this exchange
  candiesEarned: integer('candies_earned').notNull(),

  // Status of the exchange (completed, failed, pending)
  status: text('status').notNull().default('completed'),

  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export const rodStoreIntern = sqliteTable('rod_store_interns', {
  userId: text('user_id').primaryKey(),
  serverNickname: text('server_nickname').notNull().default(''),
  userName: text('user_name').notNull().default(''),
  isHiring: integer('is_hiring').notNull().default(0), // 0: not hiring, 1: hiring
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Hanana = typeof hanana.$inferSelect
export type NewHanana = typeof hanana.$inferInsert

export type HananaParticipant = typeof hananaParticipants.$inferSelect
export type NewHananaParticipant = typeof hananaParticipants.$inferInsert

export type Exchange = typeof exchanges.$inferSelect
export type NewExchange = typeof exchanges.$inferInsert

// Type for inventory JSON structure - new nested format
export type Inventory = {
  fishes: Record<string, number>
  rods: Record<string, number>
}

// Legacy inventory type for backward compatibility
export type LegacyInventory = Record<string, number>

// Helper function to migrate old inventory format to new format
export function migrateInventory(inventoryData: string | LegacyInventory | Inventory): Inventory {
  // If it's a string, parse it first
  let parsed: any
  if (typeof inventoryData === 'string') {
    try {
      parsed = JSON.parse(inventoryData)
    } catch {
      return { fishes: {}, rods: {} }
    }
  } else {
    parsed = inventoryData
  }

  // If already in new format, return as is
  if (parsed && typeof parsed === 'object' && 'fishes' in parsed && 'rods' in parsed) {
    return parsed as Inventory
  }

  // Convert legacy format to new format
  const newInventory: Inventory = { fishes: {}, rods: {} }

  if (parsed && typeof parsed === 'object') {
    for (const [itemId, quantity] of Object.entries(parsed)) {
      if (typeof quantity === 'number') {
        // Fish IDs: 000-006 (000 is trash, 001-006 are fish)
        // Rod IDs: rod-001, rod-002, rod-003 OR 001, 002, 003 (we'll detect context)
        if (itemId === '000' || (itemId >= '001' && itemId <= '006')) {
          newInventory.fishes[itemId] = quantity
        } else if (itemId.startsWith('rod-') || (itemId >= '001' && itemId <= '003')) {
          // For ambiguous cases (001-003), we'll assume it's fish unless context suggests otherwise
          // This will be handled case by case in migration
          newInventory.rods[itemId] = quantity
        }
      }
    }
  }

  return newInventory
}

// Helper function to ensure inventory has proper structure
export function ensureInventoryStructure(inventory: Partial<Inventory>): Inventory {
  return {
    fishes: inventory.fishes || {},
    rods: inventory.rods || {},
  }
}

export type RodStoreIntern = typeof rodStoreIntern.$inferSelect
export type NewRodStoreIntern = typeof rodStoreIntern.$inferInsert
