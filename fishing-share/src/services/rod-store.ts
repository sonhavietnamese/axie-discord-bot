import { desc, eq, sql } from 'drizzle-orm'
import { db } from '../libs/database'
import { rodPurchaseHistory, rodStore, rodStoreIntern } from '../schema'
import { v4 as uuidv4 } from 'uuid'

export async function getRodStoreIntern(userId: string) {
  const intern = db.select().from(rodStoreIntern).where(eq(rodStoreIntern.userId, userId)).get()
  return intern
}

export async function getCurrentRodStoreInterns() {
  const interns = await db.select().from(rodStoreIntern).where(eq(rodStoreIntern.isHiring, 1)).orderBy(desc(rodStoreIntern.createdAt))
  return interns
}

export async function addStoreIntern(userId: string, serverNickname: string, userName: string) {
  const intern = await db
    .insert(rodStoreIntern)
    .values({ userId, serverNickname, userName, isHiring: 1 })
    .onConflictDoUpdate({
      target: rodStoreIntern.userId,
      set: {
        serverNickname,
        userName,
        isHiring: 1,
      },
    })
    .returning()
  return intern
}

export async function fireStoreIntern(userId: string) {
  const intern = await db.update(rodStoreIntern).set({ isHiring: 0 }).where(eq(rodStoreIntern.userId, userId)).returning()
  return intern
}

export async function createRodStoreIntern(userId: string, serverNickname: string, userName: string) {
  await db.insert(rodStoreIntern).values({ userId, serverNickname, userName })
}

export async function restockRodStore(rodStoreToRestock: { id: string; rodId: string; stock: number }[]) {
  // Use insert with conflict resolution to handle both new and existing records
  const results = await Promise.all(
    rodStoreToRestock.map(async (item) => {
      console.log(`🔄 Upserting rod store item ${item.id} (rodId: ${item.rodId}) to stock: ${item.stock}`)

      const result = await db
        .insert(rodStore)
        .values({
          id: item.id,
          rodId: item.rodId,
          stock: item.stock,
        })
        .onConflictDoUpdate({
          target: rodStore.id,
          set: {
            stock: item.stock,
          },
        })
        .returning()

      return result
    }),
  )

  const flattenedResults = results.flat()
  return flattenedResults
}

export async function reduceRodStore(id: string, reduceBy: number) {
  const updated = await db
    .update(rodStore)
    .set({ stock: sql`stock - ${reduceBy}` })
    .where(eq(rodStore.id, id))
    .returning()
  return updated
}

export async function getRodStoreStock() {
  const stock = await db.select().from(rodStore)
  return stock
}

export async function getRodStoreStockByRodId(rodId: string) {
  const stock = await db.select().from(rodStore).where(eq(rodStore.rodId, rodId)).get()
  return stock
}

export async function getRodPurchaseHistory(userId: string) {
  const history = await db.select().from(rodPurchaseHistory).where(eq(rodPurchaseHistory.userId, userId)).orderBy(desc(rodPurchaseHistory.createdAt))
  return history
}

export async function addRodPurchaseHistory(userId: string, rodId: string) {
  await db.insert(rodPurchaseHistory).values({ userId, rodId, id: uuidv4() })
}
