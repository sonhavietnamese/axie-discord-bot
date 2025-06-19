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

  // Store inventory as JSON: { "000": 0, "001": 1, "002": 0, ... }
  inventory: text('inventory').default('{}').notNull(),

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

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Hanana = typeof hanana.$inferSelect
export type NewHanana = typeof hanana.$inferInsert

export type HananaParticipant = typeof hananaParticipants.$inferSelect
export type NewHananaParticipant = typeof hananaParticipants.$inferInsert

// Type for inventory JSON structure
export type Inventory = Record<string, number>
