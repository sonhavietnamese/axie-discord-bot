import sqlite3 from 'sqlite3'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { eq, desc, inArray } from 'drizzle-orm'
import { users, fish, fishCatches, underwater, type User, type Fish, type FishCatch } from '../schema'

// Create database connection
const sqlite = new sqlite3.Database('./dev.db')
export const db = drizzle(async (sql, params, method) => {
  return new Promise((resolve, reject) => {
    if (method === 'get') {
      sqlite.get(sql, params, (err, row) => {
        if (err) reject(err)
        else resolve({ rows: row ? [row] : [] })
      })
    } else if (method === 'all') {
      sqlite.all(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve({ rows: rows || [] })
      })
    } else {
      sqlite.run(sql, params, function (err) {
        if (err) reject(err)
        else resolve({ rows: [] })
      })
    }
  })
})

// User operations
export const userService = {
  // Get or create a user
  async getOrCreateUser(userId: string, username: string) {
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).get()

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
      })
      .returning()

    return newUser
  },

  // Get user by ID
  async getUser(userId: string) {
    return await db.select().from(users).where(eq(users.id, userId)).get()
  },

  // Update user's fish count
  async updateFishCount(userId: string, fishCount: number) {
    const [updatedUser] = await db.update(users).set({ fish: fishCount, updatedAt: new Date().toISOString() }).where(eq(users.id, userId)).returning()

    return updatedUser
  },

  // Add a fish to user's catch count
  async addFish(userId: string, fishId: string) {
    const user = await db.select().from(users).where(eq(users.id, userId)).get()

    if (!user) {
      throw new Error('User not found')
    }

    // Create a fish catch record
    await db.insert(fishCatches).values({
      userId,
      fishId,
    })

    // Update user's total fish count
    const [updatedUser] = await db
      .update(users)
      .set({ fish: user.fish + 1, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId))
      .returning()

    return updatedUser
  },

  // Get user stats
  async getUserStats(userId: string) {
    const user = await db.select().from(users).where(eq(users.id, userId)).get()

    if (!user) {
      return null
    }

    // Get user's fish catches with fish details
    const userCatches = await db
      .select({
        catch: fishCatches,
        fish: fish,
      })
      .from(fishCatches)
      .innerJoin(fish, eq(fishCatches.fishId, fish.id))
      .where(eq(fishCatches.userId, userId))
      .orderBy(desc(fishCatches.caughtAt))

    // Calculate stats
    const totalFish = user.fish
    const uniqueFishTypes = new Set(userCatches.map((c) => c.catch.fishId)).size
    const raresFishCaught = userCatches.filter((c) => ['rare', 'epic', 'legendary'].includes(c.fish.rarity)).length

    return {
      user,
      totalFish,
      uniqueFishTypes,
      raresFishCaught,
      recentCatches: userCatches.slice(0, 5),
    }
  },
}

// Fish operations
export const fishService = {
  // Get all fish
  async getAllFish() {
    return await db.select().from(fish)
  },

  // Get fish by ID
  async getFish(fishId: string) {
    return await db.select().from(fish).where(eq(fish.id, fishId)).get()
  },

  // Get fish by name
  async getFishByName(name: string) {
    return await db.select().from(fish).where(eq(fish.name, name)).get()
  },

  // Create a new fish type
  async createFish(data: { name: string; rarity: string; image?: string; description?: string }) {
    const [newFish] = await db.insert(fish).values(data).returning()

    return newFish
  },

  // Get fish by rarity
  async getFishByRarity(rarity: string) {
    return await db.select().from(fish).where(eq(fish.rarity, rarity))
  },

  // Get random fish based on rarity weights
  async getRandomFish() {
    const allFish = await db.select().from(fish)

    if (allFish.length === 0) {
      return null
    }

    // Define rarity weights (higher number = more likely to catch)
    const rarityWeights: Record<string, number> = {
      common: 50,
      uncommon: 25,
      rare: 15,
      epic: 7,
      legendary: 3,
    }

    // Create a weighted array of fish
    const weightedFish: typeof allFish = []
    allFish.forEach((fishItem) => {
      const weight = rarityWeights[fishItem.rarity] || 1
      for (let i = 0; i < weight; i++) {
        weightedFish.push(fishItem)
      }
    })

    // Return a random fish from the weighted array
    const randomIndex = Math.floor(Math.random() * weightedFish.length)
    return weightedFish[randomIndex]
  },
}

// Underwater operations (new table from user's schema)
export const underwaterService = {
  // Get all underwater items
  async getAllUnderwater() {
    return await db.select().from(underwater)
  },

  // Create a new underwater item
  async createUnderwater(data: { name: string; rarity: string; image?: string; description?: string }) {
    const [newUnderwater] = await db.insert(underwater).values(data).returning()

    return newUnderwater
  },

  // Get random underwater item based on rarity weights
  async getRandomUnderwater() {
    const allUnderwater = await db.select().from(underwater)

    if (allUnderwater.length === 0) {
      return null
    }

    // Define rarity weights (higher number = more likely to find)
    const rarityWeights: Record<string, number> = {
      common: 50,
      uncommon: 25,
      rare: 15,
      epic: 7,
      legendary: 3,
    }

    // Create a weighted array of underwater items
    const weightedUnderwater: typeof allUnderwater = []
    allUnderwater.forEach((item) => {
      const weight = rarityWeights[item.rarity] || 1
      for (let i = 0; i < weight; i++) {
        weightedUnderwater.push(item)
      }
    })

    // Return a random underwater item from the weighted array
    const randomIndex = Math.floor(Math.random() * weightedUnderwater.length)
    return weightedUnderwater[randomIndex]
  },
}

// Initialize default fish data
export async function seedFishData() {
  const existingFish = await db.select().from(fish)

  if (existingFish.length === 0) {
    const defaultFish = [
      {
        name: 'Bass',
        rarity: 'common',
        description: 'A common freshwater fish',
      },
      {
        name: 'Trout',
        rarity: 'common',
        description: 'A popular game fish',
      },
      {
        name: 'Salmon',
        rarity: 'uncommon',
        description: 'A prized catch!',
      },
      {
        name: 'Tuna',
        rarity: 'rare',
        description: 'A large and valuable fish',
      },
      {
        name: 'Swordfish',
        rarity: 'epic',
        description: 'A majestic deep-sea predator',
      },
      {
        name: 'Golden Fish',
        rarity: 'legendary',
        description: 'A mythical golden fish that brings good fortune!',
      },
    ]

    await db.insert(fish).values(defaultFish)
    console.log('Default fish data seeded!')
  }
}

// Cleanup function
export async function disconnectDatabase() {
  sqlite.close()
}
