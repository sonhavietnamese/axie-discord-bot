import { eq, inArray, sql, and, like } from 'drizzle-orm'
import { db } from '../libs/database'
import { users, hananaParticipants, hanana, type Inventory } from '../schema'
import { BASE_FISHING_RATES } from '../configs/game'

// Helper function to parse and update inventory
function parseInventory(inventoryJson: string): Inventory {
  try {
    return JSON.parse(inventoryJson) as Inventory
  } catch {
    return {}
  }
}

// Helper function to update item in inventory
function updateInventoryItem(inventory: Inventory, itemId: string, quantity: number = 1): Inventory {
  return {
    ...inventory,
    [itemId]: (inventory[itemId] || 0) + quantity,
  }
}

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
      rates: JSON.stringify(BASE_FISHING_RATES),
      inventory: '{}', // Start with empty inventory
    })
    .returning()

  return newUser
}

// Get user by ID
export async function getUser(userId: string) {
  return await db.select().from(users).where(eq(users.id, userId)).get()
}

// Get user's inventory in parsed format
export async function getUserInventory(userId: string): Promise<Inventory | null> {
  const user = await getUser(userId)
  if (!user) {
    return null
  }
  return parseInventory(user.inventory)
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
    const existingUsers = tx.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)).all()
    const existingUserIds = new Set(existingUsers.map((user) => user.id))

    // Prepare bulk insert data
    const newUsers = usersToCreate.filter((user) => !existingUserIds.has(user.id))

    if (newUsers.length === 0) {
      return {
        inserted: [],
        existing: existingUsers,
        total: usersToCreate.length,
        insertedCount: 0,
        existingCount: existingUserIds.size,
      }
    }

    // Bulk insert users using INSERT OR IGNORE
    const defaultRates = JSON.stringify(BASE_FISHING_RATES).replace(/'/g, "''")
    const userValues = newUsers
      .map(
        (user) =>
          `('${user.id.replace(/'/g, "''")}', '${user.name.replace(/'/g, "''")}', '${defaultRates}', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .join(', ')

    tx.run(
      sql.raw(`
        INSERT OR IGNORE INTO users (id, name, rates, inventory, created_at, updated_at) 
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
      existing: existingUsers,
      total: usersToCreate.length,
      insertedCount: insertedUsers.length,
      existingCount: existingUserIds.size,
    }
  })
}

export async function getUserRate(userId: string) {
  const user = await getUser(userId)

  if (!user) {
    return null
  }

  const rates = JSON.parse(user.rates)

  return rates
}

export async function handleUserCatch(userId: string, rates: number[], stuffId: string | null, guildId: string | null, channelId: string) {
  const user = await getUser(userId)

  if (!user) {
    return null
  }

  return db.transaction(async (tx) => {
    // 1. Update user rates and inventory
    const currentInventory = parseInventory(user.inventory)
    const updatedInventory = stuffId ? updateInventoryItem(currentInventory, stuffId, 1) : currentInventory

    await tx
      .update(users)
      .set({
        rates: JSON.stringify(rates),
        inventory: JSON.stringify(updatedInventory),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))

    // 2. Increment rod uses in active hanana event
    const activeEvent = await tx
      .select()
      .from(hanana)
      .where(and(like(hanana.id, `${guildId}_${channelId}_%`), eq(hanana.status, 'active')))
      .get()

    if (activeEvent) {
      await tx
        .update(hananaParticipants)
        .set({
          uses: sql`${hananaParticipants.uses} + 1`,
        })
        .where(and(eq(hananaParticipants.hananaId, activeEvent.id), eq(hananaParticipants.userId, userId)))
    }

    // Return updated user data
    const updatedUser = await tx.select().from(users).where(eq(users.id, userId)).get()

    return updatedUser
  })
}
