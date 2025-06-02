import type { MessageReaction, User } from 'discord.js'
import { logger } from 'robo.js'
import { fishingEventManager } from '../core/fishingEvent'

export default async (reaction: MessageReaction, user: User) => {
  if (user.bot) return

  if (reaction.emoji.name !== '🎣') return

  if (!reaction.message.guildId) return

  const activeEvent = fishingEventManager.getActiveEvent(reaction.message.guildId)
  if (!activeEvent) return

  if (reaction.message.channelId !== activeEvent.channelId) return

  if (activeEvent.participants.has(user.id)) {
    activeEvent.participants.delete(user.id)
    logger.info(`User ${user.username} (${user.id}) left fishing event in guild ${reaction.message.guildId}`)

    // Send a private confirmation message to the user via DM
    try {
    } catch (error) {
      logger.error('Error sending leave confirmation DM:', error)
    }
  }
}
