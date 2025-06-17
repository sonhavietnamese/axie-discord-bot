import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Discord user ID
  name: text('name').notNull(), // Discord username
  fish: integer('fish').default(0).notNull(), // Number of fish caught
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

// Fish table
export const fish = sqliteTable('fish', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `fish_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
  name: text('name').unique().notNull(),
  rarity: text('rarity').notNull(), // common, uncommon, rare, epic, legendary
  image: text('image'), // Image URL for the fish
  description: text('description'),
})

// Fish catches table (junction table for user-fish relationships)
export const fishCatches = sqliteTable(
  'fish_catches',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `catch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fishId: text('fish_id')
      .notNull()
      .references(() => fish.id, { onDelete: 'cascade' }),
    caughtAt: text('caught_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    userIdIndex: index('fish_catches_user_id_idx').on(table.userId),
    fishIdIndex: index('fish_catches_fish_id_idx').on(table.fishId),
  }),
)

// Underwater table (based on user's schema addition)
export const underwater = sqliteTable('underwaters', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `underwater_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
  name: text('name').unique().notNull(),
  rarity: text('rarity').notNull(), // common, uncommon, rare, epic, legendary
  image: text('image'), // Image URL
  description: text('description'),
})

// Type definitions for TypeScript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Fish = typeof fish.$inferSelect
export type NewFish = typeof fish.$inferInsert

export type FishCatch = typeof fishCatches.$inferSelect
export type NewFishCatch = typeof fishCatches.$inferInsert

export type Underwater = typeof underwater.$inferSelect
export type NewUnderwater = typeof underwater.$inferInsert
