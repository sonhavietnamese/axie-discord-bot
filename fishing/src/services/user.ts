import { and, eq, inArray, like, sql } from 'drizzle-orm'
import { BASE_FISHING_RATES } from '../configs/game'
import { db } from '../libs/database'
import { getStuff } from '../libs/utils'
import { exchanges, hanana, hananaParticipants, users, type Inventory, migrateInventory, ensureInventoryStructure } from '../schema'

// Helper function to parse and migrate inventory
function parseInventory(inventoryJson: string): Inventory {
  try {
    return migrateInventory(inventoryJson)
  } catch {
    return { fishes: {}, rods: {} }
  }
}

// Helper function to update fish item in inventory
function updateFishInventoryItem(inventory: Inventory, itemId: string, quantity: number = 1): Inventory {
  return {
    ...inventory,
    fishes: {
      ...inventory.fishes,
      [itemId]: (inventory.fishes[itemId] || 0) + quantity,
    },
  }
}

// Helper function to update rod item in inventory
function updateRodInventoryItem(inventory: Inventory, itemId: string, quantity: number = 1): Inventory {
  return {
    ...inventory,
    rods: {
      ...inventory.rods,
      [itemId]: (inventory.rods[itemId] || 0) + quantity,
    },
  }
}

// Helper function to update any item in inventory (auto-detects type)
function updateInventoryItem(inventory: Inventory, itemId: string, quantity: number = 1, itemType?: 'fish' | 'rod'): Inventory {
  // Auto-detect item type if not specified
  if (!itemType) {
    if (itemId === '000' || (itemId >= '001' && itemId <= '006')) {
      itemType = 'fish'
    } else {
      itemType = 'rod'
    }
  }

  if (itemType === 'fish') {
    return updateFishInventoryItem(inventory, itemId, quantity)
  } else {
    return updateRodInventoryItem(inventory, itemId, quantity)
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
      inventory: '{"fishes":{},"rods":{}}', // Start with empty inventory
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

// Update user's inventory with new inventory object
export async function updateUserInventory(userId: string, newInventory: Inventory) {
  // Ensure inventory has proper structure
  const structuredInventory = ensureInventoryStructure(newInventory)

  return await db
    .update(users)
    .set({
      inventory: JSON.stringify(structuredInventory),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId))
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
          `('${user.id.replace(/'/g, "''")}', '${user.name.replace(
            /'/g,
            "''",
          )}', '${defaultRates}', '{"fishes":{},"rods":{}}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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
    const updatedInventory = stuffId ? updateInventoryItem(currentInventory, stuffId, 1, 'fish') : currentInventory

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
    return { success: false, candiesEarned: 0, itemsSold: { fishes: {}, rods: {} }, error: 'User not found' }
  }

  const currentInventory = parseInventory(user.inventory)

  // Check if user has any items to sell (only fish)
  const sellableItems = Object.entries(currentInventory.fishes)
    .filter(([, quantity]) => quantity > 0)
    .filter(([itemId]) => itemId >= '001' && itemId <= '006') // Only sell fish

  if (sellableItems.length === 0) {
    return { success: false, candiesEarned: 0, itemsSold: { fishes: {}, rods: {} }, error: 'No items to sell' }
  }

  // Calculate total candies earned
  let totalCandies = 0
  const itemsSold: Inventory = { fishes: {}, rods: {} }

  for (const [itemId, quantity] of sellableItems) {
    const stuff = getStuff(itemId)
    const candiesForItem = Math.floor(stuff.price * quantity)
    totalCandies += candiesForItem
    itemsSold.fishes[itemId] = quantity
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

      // 2. Clear user's fish inventory (set all quantities to 0)
      const updatedInventory: Inventory = {
        fishes: {},
        rods: currentInventory.rods, // Keep rods intact
      }

      // Reset only the sold fish items to 0
      for (const itemId of Object.keys(currentInventory.fishes)) {
        if (itemId >= '001' && itemId <= '006') {
          updatedInventory.fishes[itemId] = 0
        } else {
          updatedInventory.fishes[itemId] = currentInventory.fishes[itemId] // Keep non-sellable items
        }
      }

      await tx
        .update(users)
        .set({
          inventory: JSON.stringify(updatedInventory),
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
        itemsSold: { fishes: {}, rods: {} },
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
