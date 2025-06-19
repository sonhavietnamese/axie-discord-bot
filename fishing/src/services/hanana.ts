import { eq, inArray, sql, like, and } from 'drizzle-orm'
import { db } from '../libs/database'
import { hanana, hananaParticipants, users } from '../schema'
import { reset } from '../libs/nft'

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

// Get existing running event or create new one
// async getOrCreateFishingEvent(guildId: string, channelId: string, createdBy: string) {
//   // Check for existing running/pending events in this channel
//   const existingEvent = await db
//     .select()
//     .from(hanana)
//     .where(sql`${hanana.id} LIKE '${guildId}_${channelId}_%' AND ${hanana.status} IN ('pending', 'active')`)
//     .get()

//   if (existingEvent) {
//     return { event: existingEvent, isNew: false }
//   }

//   // No running event found, create a new one
//   const newEvent = await this.createFishingEvent(guildId, channelId, createdBy)
//   return { event: newEvent, isNew: true }
// },

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

// Add participant to fishing event using junction table
export async function addParticipant(eventId: string, userIds: string[], rods: string[]) {
  console.log('[DB][👤] Adding participants', eventId, userIds)

  // Check if event exists
  const event = await db.select().from(hanana).where(eq(hanana.id, eventId)).get()
  if (!event) {
    throw new Error('Event not found')
  }

  // Get existing participants to avoid duplicates
  const existingParticipants = await db
    .select({ userId: hananaParticipants.userId })
    .from(hananaParticipants)
    .where(eq(hananaParticipants.hananaId, eventId))

  const existingUserIds = new Set(existingParticipants.map((p) => p.userId))

  // Filter out users who are already participants
  const newUserIds = userIds.filter((userId) => !existingUserIds.has(userId))

  if (newUserIds.length === 0) {
    console.log('[DB][ℹ️] All users are already participants')
    return event
  }

  // Insert new participants
  const participantRecords = newUserIds.map((userId, index) => ({
    hananaId: eventId,
    userId: userId,
    rod: rods[index],
    uses: 0,
  }))

  await db.insert(hananaParticipants).values(participantRecords)

  console.log('[DB][✅] Participants added', { newUsers: newUserIds, count: newUserIds.length })

  return event
}

// Remove participant from fishing event
export async function removeParticipant(eventId: string, userId: string) {
  console.log('[DB][👤] Removing participant', eventId, userId)

  // Check if event exists
  const event = db.select().from(hanana).where(eq(hanana.id, eventId)).get()
  if (!event) {
    throw new Error('Event not found')
  }

  // Remove participant from junction table
  const result = await db.delete(hananaParticipants).where(and(eq(hananaParticipants.hananaId, eventId), eq(hananaParticipants.userId, userId)))

  console.log('[DB][✅] Participant removed', { removedUser: userId })

  return event
}

// Get participants list for an event
export async function getParticipants(eventId: string): Promise<string[]> {
  const participants = await db.select({ userId: hananaParticipants.userId }).from(hananaParticipants).where(eq(hananaParticipants.hananaId, eventId))

  return participants.map((p) => p.userId)
}

// Get participants with full user details
export async function getParticipantsWithDetails(eventId: string) {
  const participants = await db
    .select({
      userId: hananaParticipants.userId,
      joinedAt: hananaParticipants.joinedAt,
      name: users.name,
    })
    .from(hananaParticipants)
    .innerJoin(users, eq(hananaParticipants.userId, users.id))
    .where(eq(hananaParticipants.hananaId, eventId))

  return participants
}

// Check if user is participant
export async function isParticipant(eventId: string, userId: string): Promise<boolean> {
  const participant = await db
    .select()
    .from(hananaParticipants)
    .where(and(eq(hananaParticipants.hananaId, eventId), eq(hananaParticipants.userId, userId)))
    .get()

  return !!participant
}

// Get participant count for an event
export async function getParticipantCount(eventId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(hananaParticipants)
    .where(eq(hananaParticipants.hananaId, eventId))
    .get()

  return result?.count || 0
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

// Clean up participants when ending an event
export async function clearEventParticipants(eventId: string) {
  console.log('[DB][🧹] Clearing participants for event', eventId)

  await db.delete(hananaParticipants).where(eq(hananaParticipants.hananaId, eventId))

  console.log('[DB][✅] Event participants cleared')
}

// End event and clean up participants
export async function endFishingEventWithCleanup(eventId: string) {
  // End the event
  const [updatedEvent] = await db
    .update(hanana)
    .set({
      status: 'ended',
      endedAt: new Date().toISOString(),
    })
    .where(eq(hanana.id, eventId))
    .returning()

  // Clean up participants (optional - you might want to keep them for historical data)
  // await this.clearEventParticipants(eventId)

  return updatedEvent
}

export async function nuke() {
  console.log('[DB][💥] Nuking all active events')

  reset()

  // Get all active event IDs first
  const activeEvents = await db
    .select({ id: hanana.id })
    .from(hanana)
    .where(inArray(hanana.status, ['pending', 'active']))

  // Clear participants for all active events
  // if (activeEvents.length > 0) {
  //   const eventIds = activeEvents.map((e) => e.id)
  //   await db.delete(hananaParticipants).where(inArray(hananaParticipants.hananaId, eventIds))
  // }

  // Batch change status to ended
  await db
    .update(hanana)
    .set({ status: 'ended' })
    .where(inArray(hanana.status, ['pending', 'active']))

  console.log('[DB][✅] All events nuked and participants cleared')
}

export const getUserRod = async (guildId: string, channelId: string, userId: string) => {
  const activeEvent = await db
    .select()
    .from(hanana)
    .where(and(like(hanana.id, `${guildId}_${channelId}_%`), eq(hanana.status, 'active')))
    .get()

  if (!activeEvent) {
    throw new Error('There is no happening Fishing event!')
  }

  const user = await db
    .select()
    .from(hananaParticipants)
    .where(and(eq(hananaParticipants.hananaId, activeEvent.id), eq(hananaParticipants.userId, userId)))
    .get()

  if (!user || !user.rod) {
    throw new Error('You are not join the event, wait for the event to start')
  }

  return {
    rod: user.rod,
    uses: user.uses,
  }
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
