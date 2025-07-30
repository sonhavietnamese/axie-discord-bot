import { desc, eq, sql } from 'drizzle-orm'
import { db } from '../libs/database'
import { rodStore, rodStoreIntern } from '../schema'

export async function getRodStoreIntern(userId: string) {
  const intern = db.select().from(rodStoreIntern).where(eq(rodStoreIntern.userId, userId)).get()
  return intern
}

export async function getCurrentRodStoreIntern() {
  const intern = await db.select().from(rodStoreIntern).where(eq(rodStoreIntern.isHiring, 1)).orderBy(desc(rodStoreIntern.createdAt)).limit(1).get()
  return intern
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
  // Update each rod store item individually to ensure correct stock updates
  const updates = await Promise.all(
    rodStoreToRestock.map(async (item) => {
      return db
        .update(rodStore)
        .set({
          stock: sql`stock + ${item.stock}`,
        })
        .where(eq(rodStore.id, item.id))
        .returning()
    }),
  )

  return updates.flat()
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
