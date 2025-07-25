import { eq, inArray, sql, like, and } from 'drizzle-orm'
import { db } from '../libs/database'
import { hanana, fishingHistory, users } from '../schema'
import { reset } from '../libs/nft'
import { getUserInventory } from './user'
import { getTotalRodCount, getUsableRods } from '../libs/utils'

// Create a new fishing event
export async function createFishingEvent(guildId: string, channelId: string, createdBy: string) {
  console.log('[DB][⏹️] Creating event', guildId, channelId, createdBy)
  const eventId = `${guildId}_${channelId}_${Date.now()}`

  const [newEvent] = await db
    .insert(hanana)
    .values({
      id: eventId,
      by: createdBy,
      status: 'pending',
    })
    .returning()

  console.log('[DB][✅] Event created', newEvent.id)

  return newEvent
}

// End a fishing event
export async function endFishingEvent(eventId: string) {
  const [updatedEvent] = await db
    .update(hanana)
    .set({
      status: 'ended',
      endedAt: new Date().toISOString(),
    })
    .where(eq(hanana.id, eventId))
    .returning()

  return updatedEvent
}

// Get active fishing event for a channel
export async function getActiveFishingEvent(guildId: string, channelId: string) {
  return await db
    .select()
    .from(hanana)
    .where(and(like(hanana.id, `${guildId}_${channelId}_%`), inArray(hanana.status, ['pending', 'active'])))
    .get()
}

// Start a pending fishing event
export async function startFishingEvent(eventId: string) {
  const [updatedEvent] = await db
    .update(hanana)
    .set({ status: 'active', createdAt: new Date().toISOString() })
    .where(eq(hanana.id, eventId))
    .returning()

  return updatedEvent
}

// Add fishing activity to history
export async function addFishingHistory(userId: string, hananaId: string, fishId: string, rodId: string) {
  const historyId = `fishing_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

  const [fishingRecord] = await db
    .insert(fishingHistory)
    .values({
      id: historyId,
      userId,
      hananaId,
      fishId,
      rodId,
    })
    .returning()

  console.log('[DB][🎣] Fishing activity recorded:', fishingRecord)
  return fishingRecord
}

// Get fishing history for a user
export async function getUserFishingHistory(userId: string, limit: number = 10) {
  return await db
    .select()
    .from(fishingHistory)
    .where(eq(fishingHistory.userId, userId))
    .orderBy(sql`${fishingHistory.createdAt} DESC`)
    .limit(limit)
}

// Get user's rod from inventory (replaces old event-based system)
export const getUserRod = async (guildId: string, channelId: string, userId: string) => {
  // Check if there's an active fishing event (optional - for tracking purposes)
  const activeEvent = await db
    .select()
    .from(hanana)
    .where(and(like(hanana.id, `${guildId}_${channelId}_%`), eq(hanana.status, 'active')))
    .get()

  // Get user's inventory to check for rods
  const inventory = await getUserInventory(userId)

  if (!inventory) {
    throw new Error('You need to set up your inventory first. Try buying a rod from the Rod Store!')
  }

  // Get all usable rods (quantity > 0 and usesLeft > 0)
  const usableRods = getUsableRods(inventory)

  if (usableRods.length === 0) {
    throw new Error("You don't have any usable rods! Buy one from the Rod Store using `/fishing-store rod` or your current rod may be broken.")
  }

  // Return the first rod (since users should only have 1 rod)
  const selectedRod = usableRods[0]

  return {
    rod: selectedRod.rodId,
    uses: selectedRod.usesLeft, // Track current uses left
    activeEventId: activeEvent?.id || null, // Optional event tracking
  }
}

export async function nuke() {
  console.log('[DB][💥] Nuking all active events')

  reset()

  // Batch change status to ended
  await db
    .update(hanana)
    .set({ status: 'ended' })
    .where(inArray(hanana.status, ['pending', 'active']))

  console.log('[DB][✅] All events nuked')
}

export const endActiveEvent = async (guildId: string, channelId: string) => {
  const activeEvent = await db
    .select()
    .from(hanana)
    .where(and(like(hanana.id, `${guildId}_${channelId}_%`), eq(hanana.status, 'active')))
    .get()

  if (!activeEvent) {
    throw new Error('There is no happening Fishing event!')
  }

  await db.update(hanana).set({ status: 'ended' }).where(eq(hanana.id, activeEvent.id))

  return activeEvent
}
