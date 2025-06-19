import { eq, inArray, sql, and, like } from 'drizzle-orm'
import { db } from '../libs/database'
import { users, hananaParticipants, hanana, exchanges, type Inventory } from '../schema'
import { BASE_FISHING_RATES } from '../configs/game'
import { getStuff } from '../libs/utils'

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

// Sell all items in user's inventory and record exchange
export async function sellAllItems(userId: string): Promise<{ success: boolean; candiesEarned: number; itemsSold: Inventory; error?: string }> {
  const user = await getUser(userId)

  if (!user) {
    return { success: false, candiesEarned: 0, itemsSold: {}, error: 'User not found' }
  }

  const currentInventory = parseInventory(user.inventory)

  // Check if user has any items to sell
  const sellableItems = Object.entries(currentInventory).filter(([, quantity]) => quantity > 0)

  if (sellableItems.length === 0) {
    return { success: false, candiesEarned: 0, itemsSold: {}, error: 'No items to sell' }
  }

  // Calculate total candies earned
  let totalCandies = 0
  const itemsSold: Inventory = {}

  for (const [itemId, quantity] of sellableItems) {
    const stuff = getStuff(itemId)
    const candiesForItem = Math.floor(stuff.price * quantity)
    totalCandies += candiesForItem
    itemsSold[itemId] = quantity
  }

  // Generate unique exchange ID
  const exchangeId = `exchange_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

  return db.transaction(async (tx) => {
    try {
      // 1. Create exchange record first (for logging and double-spend prevention)
      await tx.insert(exchanges).values({
        id: exchangeId,
        userId,
        itemsSold: JSON.stringify(itemsSold),
        candiesEarned: totalCandies,
        status: 'pending',
      })

      // 2. Clear user's inventory (set all quantities to 0)
      const emptyInventory: Inventory = {}
      for (const itemId of Object.keys(currentInventory)) {
        if (itemId >= '001' && itemId <= '006') {
          emptyInventory[itemId] = 0
        }
      }

      await tx
        .update(users)
        .set({
          inventory: JSON.stringify(emptyInventory),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, userId))

      // 3. Mark exchange as completed
      await tx.update(exchanges).set({ status: 'completed' }).where(eq(exchanges.id, exchangeId))

      console.log(`💰 Exchange completed for user ${userId}: ${totalCandies} candies earned from selling items:`, itemsSold)

      return {
        success: true,
        candiesEarned: totalCandies,
        itemsSold,
      }
    } catch (error) {
      console.error('❌ Error during exchange transaction:', error)

      // Mark exchange as failed if it exists
      try {
        await tx.update(exchanges).set({ status: 'failed' }).where(eq(exchanges.id, exchangeId))
      } catch (updateError) {
        console.error('Failed to update exchange status to failed:', updateError)
      }

      return {
        success: false,
        candiesEarned: 0,
        itemsSold: {},
        error: 'Transaction failed',
      }
    }
  })
}

// Get user's exchange history
export async function getUserExchangeHistory(userId: string, limit: number = 10) {
  return await db
    .select()
    .from(exchanges)
    .where(eq(exchanges.userId, userId))
    .orderBy(sql`${exchanges.createdAt} DESC`)
    .limit(limit)
}
