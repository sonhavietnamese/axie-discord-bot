import type { MessageReaction, User } from 'discord.js'
import { logger } from 'robo.js'
import { fishingEventManager } from '../core/fishingEvent'

export default async (reaction: MessageReaction, user: User) => {
  // Ignore reactions from bots
  if (user.bot) return

  // Check if this is a fishing reaction (🎣)
  if (reaction.emoji.name !== '🎣') return

  // Ensure we have the guild context
  if (!reaction.message.guildId) return

  // Check if there's an active fishing event for this guild
  const activeEvent = fishingEventManager.getActiveEvent(reaction.message.guildId)
  if (!activeEvent) return

  // Check if this reaction is on the correct channel for the fishing event
  if (reaction.message.channelId !== activeEvent.channelId) return

  // Remove the user from participants
  if (activeEvent.participants.has(user.id)) {
    activeEvent.participants.delete(user.id)
    logger.info(`User ${user.username} (${user.id}) left fishing event in guild ${reaction.message.guildId}`)

    // Send a notification message to the channel
    try {
      if (reaction.message.channel && 'send' in reaction.message.channel) {
        const timeRemaining = fishingEventManager.getFormattedTimeRemaining(reaction.message.guildId)
        await reaction.message.channel.send({
          content: `🚫 **${user} left the fishing event.** You can rejoin by reacting with 🎣\n⏰ Time remaining: ${timeRemaining}`,
        })
      }
    } catch (error) {
      logger.error('Error sending leave notification:', error)
    }
  }
}
