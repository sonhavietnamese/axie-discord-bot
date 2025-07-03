import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const axiesTable = sqliteTable('axies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // 0 = not revealed, 1 = revealed
  isRevealed: integer('is_revealed', { mode: 'boolean' }).default(false).notNull(),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(), // Discord user ID
  score: integer('score').default(0).notNull(),
  globalName: text('global_name').notNull(),
  correctGuesses: integer('correct_guesses').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  currentStreak: integer('current_streak').default(0).notNull(),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export const roundsTable = sqliteTable('rounds', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  axieId: text('axie_id')
    .references(() => axiesTable.id)
    .notNull(),

  status: text('status').notNull().default('happening'), // happening, finished

  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export const roundUsersTable = sqliteTable('round_users', {
  id: text('id').primaryKey(),
  roundId: text('round_id')
    .references(() => roundsTable.id)
    .notNull(),
  userId: text('user_id')
    .references(() => usersTable.id)
    .notNull(),
  guess: text('guess').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).default(false).notNull(),
  candiesWon: integer('candies_won').default(0).notNull(),
})

// New table to track claimed streak rewards
export const claimedRewardsTable = sqliteTable('claimed_rewards', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => usersTable.id)
    .notNull(),
  streakRounds: integer('streak_rounds').notNull(), // Number of rounds in the claimed streak
  streakCandies: integer('streak_candies').notNull(), // Total candies claimed
  startRoundId: integer('start_round_id').notNull(), // First round of the streak
  endRoundId: integer('end_round_id').notNull(), // Last round of the streak
  rewardType: text('reward_type').notNull(), // NFT, Premium Currency, VIP Access
  rewardDetails: text('reward_details'), // JSON string with reward details
  claimedAt: text('claimed_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export type Axie = typeof axiesTable.$inferSelect
export type NewAxie = typeof axiesTable.$inferInsert
export type User = typeof usersTable.$inferSelect
export type NewUser = typeof usersTable.$inferInsert
export type RoundUser = typeof roundUsersTable.$inferSelect
export type NewRoundUser = typeof roundUsersTable.$inferInsert
export type ClaimedReward = typeof claimedRewardsTable.$inferSelect
export type NewClaimedReward = typeof claimedRewardsTable.$inferInsert
