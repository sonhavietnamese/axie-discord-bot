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

  // Add the user as a participant
  const added = fishingEventManager.addParticipant(reaction.message.guildId, user.id)

  if (added) {
    logger.info(`User ${user.username} (${user.id}) joined fishing event in guild ${reaction.message.guildId}`)

    // Send a confirmation message to the channel
    try {
      if (reaction.message.channel && 'send' in reaction.message.channel) {
        const timeRemaining = fishingEventManager.getFormattedTimeRemaining(reaction.message.guildId)
        await reaction.message.channel.send({
          content: `🎣 **${user} joined the fishing event!** You can now use \`/cast\` to start fishing!\n⏰ Time remaining: ${timeRemaining}`,
        })
      }
    } catch (error) {
      logger.error('Error sending join confirmation:', error)
    }
  }
}
