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

  const added = fishingEventManager.addParticipant(reaction.message.guildId, user.id)

  if (added) {
    logger.info(`User ${user.username} (${user.id}) joined fishing event in guild ${reaction.message.guildId}`)
  }
}
