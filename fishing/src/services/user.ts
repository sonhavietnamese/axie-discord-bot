import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '../libs/database'
import { users } from '../schema'
import { UNDERWATER_STUFFS_COUNT } from '../constants'

// Get or create a user
export async function getOrCreateUser(userId: string, username: string) {
  const existingUser = db.select().from(users).where(eq(users.id, userId)).get()

  if (existingUser) {
    // Update username if it changed
    if (existingUser.name !== username) {
      const [updatedUser] = await db
        .update(users)
        .set({ name: username, updatedAt: new Date().toISOString() })
        .where(eq(users.id, userId))
        .returning()

      return updatedUser
    }
    return existingUser
  }

  const [newUser] = await db
    .insert(users)
    .values({
      id: userId,
      name: username,
      rates: JSON.stringify(Array(UNDERWATER_STUFFS_COUNT).fill(0)),
    })
    .returning()

  return newUser
}

// Get user by ID
export async function getUser(userId: string) {
  return await db.select().from(users).where(eq(users.id, userId)).get()
}

// Batch insert users, ignoring existing ones (optimized)
export async function batchCreateUsers(usersToCreate: Array<{ id: string; name: string }>) {
  if (usersToCreate.length === 0) {
    return { inserted: [], existing: [], total: 0 }
  }

  // Use transaction for atomic operations
  return db.transaction((tx) => {
    // Get existing users before attempting insert
    const userIds = usersToCreate.map((user) => user.id)
    const existingUsers = tx.select({ id: users.id }).from(users).where(inArray(users.id, userIds)).all()
    const existingUserIds = new Set(existingUsers.map((user) => user.id))

    // Prepare bulk insert data
    const newUsers = usersToCreate.filter((user) => !existingUserIds.has(user.id))

    if (newUsers.length === 0) {
      return {
        inserted: [],
        existing: Array.from(existingUserIds),
        total: usersToCreate.length,
        insertedCount: 0,
        existingCount: existingUserIds.size,
      }
    }

    // Bulk insert inventories using INSERT OR IGNORE for safety
    const inventoryValues = newUsers.map((user) => `('inventory_${user.id}', 0, 0, 0)`).join(', ')

    tx.run(
      sql.raw(`
        INSERT OR IGNORE INTO inventories (id, fishes, trash, nfts) 
        VALUES ${inventoryValues}
      `),
    )

    // Bulk insert users using INSERT OR IGNORE
    const defaultRates = JSON.stringify(Array(6).fill(0)).replace(/'/g, "''")
    const userValues = newUsers
      .map(
        (user) =>
          `('${user.id.replace(/'/g, "''")}', '${user.name.replace(/'/g, "''")}', '${defaultRates}', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .join(', ')

    tx.run(
      sql.raw(`
        INSERT OR IGNORE INTO users (id, name, rates, inventories, created_at, updated_at) 
        VALUES ${userValues}
      `),
    )

    // Get the actually inserted users
    const insertedUsers = tx
      .select()
      .from(users)
      .where(
        inArray(
          users.id,
          newUsers.map((u) => u.id),
        ),
      )
      .all()

    return {
      inserted: insertedUsers,
      existing: Array.from(existingUserIds),
      total: usersToCreate.length,
      insertedCount: insertedUsers.length,
      existingCount: existingUserIds.size,
    }
  })
}
