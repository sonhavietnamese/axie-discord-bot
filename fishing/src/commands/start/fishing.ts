import { createCommandConfig, logger } from 'robo.js'
import type { ChatInputCommandInteraction, TextChannel, GuildTextBasedChannel } from 'discord.js'

export const config = createCommandConfig({
  description: 'Start the fishing event',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Start fishing event command used by ${interaction.user}`)

  const response = await interaction.reply({
    content: 'Gear up! The fishing event is starting...',
    fetchReply: true,
  })

  // Ensure we have access to the channel before reacting
  try {
    // Use the interaction's channel which should be cached
    if (interaction.channel) {
      // Check if bot has permission to add reactions in guild channels
      if ('permissionsFor' in interaction.channel) {
        const permissions = (interaction.channel as GuildTextBasedChannel).permissionsFor(interaction.client.user!)
        if (!permissions?.has('AddReactions')) {
          logger.warn('Bot lacks AddReactions permission in this channel')
          return
        }
      }
      await response.react('🎣')
    } else {
      // If channel is not available, try to fetch it
      const channel = await interaction.client.channels.fetch(interaction.channelId)
      if (channel && channel.isTextBased()) {
        const message = await channel.messages.fetch(response.id)
        await message.react('🎣')
      }
    }

    // Set up interval to send follow-up messages with reaction count
    const startTime = Date.now()
    const maxDuration = 10 * 1000 // 12 seconds
    const updateInterval = 5 * 1000 // 3 seconds

    const intervalId = setInterval(async () => {
      try {
        // Check if we've exceeded the max duration
        if (Date.now() - startTime > maxDuration) {
          clearInterval(intervalId)
          await interaction.followUp({
            content: '🎣 **Fishing event has ended!** Thanks to all participants!',
          })
          return
        }

        // Fetch the latest message to get updated reaction counts
        const channel = interaction.channel || (await interaction.client.channels.fetch(interaction.channelId))
        if (!channel || !channel.isTextBased()) {
          clearInterval(intervalId)
          return
        }

        const updatedMessage = await channel.messages.fetch(response.id)
        const fishingReaction = updatedMessage.reactions.cache.get('🎣')
        const reactionCount = fishingReaction ? fishingReaction.count - 1 : 0 // Subtract 1 for the bot's reaction

        // Send follow-up with current participant count
        await interaction.followUp({
          content: `🎣 **Fishing Event Update:** ${reactionCount} ${
            reactionCount === 1 ? 'angler has' : 'anglers have'
          } joined the fishing event! React with 🎣 to participate!`,
        })
      } catch (error) {
        logger.error('Error in fishing event update:', error)
        clearInterval(intervalId)
      }
    }, updateInterval)

    // Send first update after 10 seconds
    setTimeout(async () => {
      try {
        const channel = interaction.channel || (await interaction.client.channels.fetch(interaction.channelId))
        if (!channel || !channel.isTextBased()) return

        const updatedMessage = await channel.messages.fetch(response.id)
        const fishingReaction = updatedMessage.reactions.cache.get('🎣')
        const reactionCount = fishingReaction ? fishingReaction.count - 1 : 0

        await interaction.followUp({
          content: `🎣 **Fishing Event Started!** ${reactionCount} ${
            reactionCount === 1 ? 'angler has' : 'anglers have'
          } already joined! React with 🎣 on the first message to participate!`,
        })
      } catch (error) {
        logger.error('Error sending first update:', error)
      }
    }, 10000)
  } catch (error) {
    logger.error('Failed to add reaction:', error)
    // Continue execution even if reaction fails
  }
}
