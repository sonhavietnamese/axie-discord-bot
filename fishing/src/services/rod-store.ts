import { db } from '../libs/database'
import { rodStoreIntern } from '../schema'
import { desc, eq } from 'drizzle-orm'

export async function getRodStoreIntern(userId: string) {
  const intern = db.select().from(rodStoreIntern).where(eq(rodStoreIntern.userId, userId)).get()
  return intern
}

export async function getCurrentRodStoreIntern() {
  const intern = await db.select().from(rodStoreIntern).where(eq(rodStoreIntern.isHiring, 1)).orderBy(desc(rodStoreIntern.createdAt)).get()
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
