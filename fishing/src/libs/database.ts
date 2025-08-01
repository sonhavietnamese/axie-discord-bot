import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { FISHES } from '../configs/fishes'
import { NFTs } from '../configs/nfts'
import { RODS } from '../configs/rods'
import { TRASHES } from '../configs/trashes'
import { fishes, nfts, rods, rodStore, trashes } from '../schema'

// Create database connection using better-sqlite3
// const dbPath = './dev-v002.db'
const dbPath = './database.db'
const sqlite = new Database(dbPath)
export const db = drizzle(sqlite)

// Seed database with IDs from config files
export async function seedFishData() {
  console.log('🌱 Starting database seeding...')

  // Seed fishes table
  const existingFishes = await db.select().from(fishes)
  if (existingFishes.length === 0) {
    const fishesToInsert = FISHES.map((fish) => ({ id: fish.id }))
    await db.insert(fishes).values(fishesToInsert)
    console.log(`✅ Inserted ${fishesToInsert.length} fish IDs`)
  } else {
    console.log(`ℹ️ Fishes table already has ${existingFishes.length} entries`)
  }

  // Seed trashes table
  const existingTrashes = await db.select().from(trashes)
  if (existingTrashes.length === 0) {
    const trashesToInsert = TRASHES.map((trash) => ({ id: trash.id }))
    await db.insert(trashes).values(trashesToInsert)
    console.log(`✅ Inserted ${trashesToInsert.length} trash IDs`)
  } else {
    console.log(`ℹ️ Trashes table already has ${existingTrashes.length} entries`)
  }

  // Seed nfts table
  const existingNfts = await db.select().from(nfts)
  if (existingNfts.length === 0) {
    const nftsToInsert = NFTs.map((nft) => ({ id: nft.id }))
    await db.insert(nfts).values(nftsToInsert)
    console.log(`✅ Inserted ${nftsToInsert.length} NFT IDs`)
  } else {
    console.log(`ℹ️ NFTs table already has ${existingNfts.length} entries`)
  }

  // Seed rods table
  const existingRods = await db.select().from(rods)
  if (existingRods.length === 0) {
    const rodsToInsert = RODS.map((rod) => ({ id: rod.id }))
    await db.insert(rods).values(rodsToInsert)
    console.log(`✅ Inserted ${rodsToInsert.length} rod IDs`)
  } else {
    console.log(`ℹ️ Rods table already has ${existingRods.length} entries`)
  }

  // Seed rod store table
  const existingRodStore = await db.select().from(rodStore)
  if (existingRodStore.length === 0) {
    const rodStoreToInsert = RODS.map((rod) => ({ id: rod.id, rodId: rod.id, stock: 0 }))
    await db.insert(rodStore).values(rodStoreToInsert)
    console.log(`✅ Inserted ${rodStoreToInsert.length} rod store entries`)
  } else {
    console.log(`ℹ️ Rod store table already has ${existingRodStore.length} entries`)
  }

  console.log('🎉 Database seeding completed!')
}

// Cleanup function
export async function disconnectDatabase() {
  sqlite.close()
}
