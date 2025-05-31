import { logger } from 'robo.js'

export interface FishingEvent {
  guildId: string
  channelId: string
  startTime: number
  endTime: number
  isActive: boolean
  participants: Set<string> // User IDs who reacted to join
}

class FishingEventManager {
  private events: Map<string, FishingEvent> = new Map()

  /**
   * Start a new fishing event for a guild
   */
  startEvent(guildId: string, channelId: string, durationMinutes: number = 10): FishingEvent {
    // Stop any existing event for this guild
    this.stopEvent(guildId)

    const startTime = Date.now()
    const endTime = startTime + durationMinutes * 60 * 1000

    const event: FishingEvent = {
      guildId,
      channelId,
      startTime,
      endTime,
      isActive: true,
      participants: new Set(),
    }

    this.events.set(guildId, event)

    // Set up automatic cleanup when event ends
    setTimeout(() => {
      this.stopEvent(guildId)
    }, durationMinutes * 60 * 1000)

    logger.info(`Fishing event started for guild ${guildId}, duration: ${durationMinutes} minutes`)
    return event
  }

  /**
   * Stop the fishing event for a guild
   */
  stopEvent(guildId: string): boolean {
    const event = this.events.get(guildId)
    if (event && event.isActive) {
      event.isActive = false
      this.events.delete(guildId)
      logger.info(`Fishing event stopped for guild ${guildId}`)
      return true
    }
    return false
  }

  /**
   * Get the active fishing event for a guild
   */
  getActiveEvent(guildId: string): FishingEvent | null {
    const event = this.events.get(guildId)
    if (event && event.isActive && Date.now() < event.endTime) {
      return event
    }

    // Clean up expired events
    if (event) {
      this.stopEvent(guildId)
    }

    return null
  }

  /**
   * Check if there's an active fishing event for a guild
   */
  isEventActive(guildId: string): boolean {
    return this.getActiveEvent(guildId) !== null
  }

  /**
   * Add a participant to the fishing event
   */
  addParticipant(guildId: string, userId: string): boolean {
    const event = this.getActiveEvent(guildId)
    if (event) {
      event.participants.add(userId)
      return true
    }
    return false
  }

  /**
   * Check if a user can participate in fishing (event is active and they joined)
   */
  canUserFish(guildId: string, userId: string): boolean {
    const event = this.getActiveEvent(guildId)
    return event !== null && event.participants.has(userId)
  }

  /**
   * Get time remaining for the event in milliseconds
   */
  getTimeRemaining(guildId: string): number {
    const event = this.getActiveEvent(guildId)
    if (event) {
      return Math.max(0, event.endTime - Date.now())
    }
    return 0
  }

  /**
   * Get formatted time remaining string
   */
  getFormattedTimeRemaining(guildId: string): string {
    const remaining = this.getTimeRemaining(guildId)
    const minutes = Math.floor(remaining / (60 * 1000))
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000)
    return `${minutes}m ${seconds}s`
  }
}

// Export singleton instance
export const fishingEventManager = new FishingEventManager()
