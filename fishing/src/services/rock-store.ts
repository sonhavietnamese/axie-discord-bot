import { db } from '../libs/database'
import { rockStoreHistory } from '../schema'
import { v4 as uuidv4 } from 'uuid'
import { eq, desc } from 'drizzle-orm'

export async function addRockStoreHistory(userId: string, type: string, amount: number) {
  await db.insert(rockStoreHistory).values({ userId, type, amount, id: uuidv4() })
}

export async function getRockStoreHistory(userId: string) {
  const history = await db.select().from(rockStoreHistory).where(eq(rockStoreHistory.userId, userId)).orderBy(desc(rockStoreHistory.createdAt))
  return history
}
