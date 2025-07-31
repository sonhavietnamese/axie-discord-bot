import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const hanana = sqliteTable('hanana', {
  id: text('id').primaryKey(),
  by: text('by').notNull(),

  status: text('status').notNull(),

  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  endedAt: text('ended_at').default(sql`CURRENT_TIMESTAMP`),
})

export const fishingHistory = sqliteTable('fishing_history', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  hananaId: text('hanana_id')
    .notNull()
    .references(() => hanana.id, { onDelete: 'cascade' }),
  fishId: text('fish_id')
    .notNull()
    .references(() => fishes.id, { onDelete: 'cascade' }),

  rodId: text('rod_id'),

  createdAt: text('created_at')
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

// Rod Store with amount of stock of each rod
export const rodStore = sqliteTable('rod_store', {
  id: text('id').primaryKey(),
  rodId: text('rod_id')
    .notNull()
    .references(() => rods.id, { onDelete: 'cascade' }),
  stock: integer('stock').notNull().default(0),
})

export const rodPurchaseHistory = sqliteTable('rod_purchase_history', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rodId: text('rod_id')
    .notNull()
    .references(() => rods.id, { onDelete: 'cascade' }),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export const rockStoreHistory = sqliteTable('rock_store_history', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  amount: integer('amount').notNull(),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Hanana = typeof hanana.$inferSelect
export type NewHanana = typeof hanana.$inferInsert

export type FishingHistory = typeof fishingHistory.$inferSelect
export type NewFishingHistory = typeof fishingHistory.$inferInsert

export type Exchange = typeof exchanges.$inferSelect
export type NewExchange = typeof exchanges.$inferInsert

export type RodPurchaseHistory = typeof rodPurchaseHistory.$inferSelect
export type NewRodPurchaseHistory = typeof rodPurchaseHistory.$inferInsert

export type RockStoreHistory = typeof rockStoreHistory.$inferSelect
export type NewRockStoreHistory = typeof rockStoreHistory.$inferInsert

// Type for inventory JSON structure - new nested format
export type Inventory = {
  fishes: Record<string, number>
  rods: Record<string, { quantity: number; usesLeft: number }>
}

// Legacy inventory type for backward compatibility
export type LegacyInventory = Record<string, number>

// Helper function to migrate old inventory format to new format
export function migrateInventory(inventoryData: string | LegacyInventory | Inventory): Inventory {
  // Import RODS configuration for default uses
  const DEFAULT_ROD_USES = 10 // Fallback if rod config not found
  const ROD_CONFIG_USES: Record<string, number> = {
    '001': 10, // Branch rod
    '002': 12, // Mavis rod
    '003': 12, // BALD rod
    'rod-001': 10, // Branch rod alternate ID
    'rod-002': 12, // Mavis rod alternate ID
    'rod-003': 12, // BALD rod alternate ID
  }

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
    // Check if rods are in new format (with quantity and usesLeft)
    const rodsAreNewFormat = Object.values(parsed.rods || {}).every((rod: any) => typeof rod === 'object' && 'quantity' in rod && 'usesLeft' in rod)

    if (rodsAreNewFormat) {
      return parsed as Inventory
    } else {
      // Migrate old rod format to new format
      const migratedRods: Record<string, { quantity: number; usesLeft: number }> = {}
      for (const [rodId, quantity] of Object.entries(parsed.rods || {})) {
        if (typeof quantity === 'number') {
          const maxUses = ROD_CONFIG_USES[rodId] || DEFAULT_ROD_USES

          migratedRods[rodId] = {
            quantity: quantity,
            usesLeft: maxUses, // Initialize with max uses
          }
        }
      }

      return {
        fishes: parsed.fishes || {},
        rods: migratedRods,
      }
    }
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
          const maxUses = ROD_CONFIG_USES[itemId] || DEFAULT_ROD_USES

          newInventory.rods[itemId] = {
            quantity: quantity,
            usesLeft: maxUses,
          }
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
