import type { ChatInputCommandInteraction, GuildTextBasedChannel } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { fishingEventManager } from '../../core/fishingEvent'

export const config = createCommandConfig({
  description: 'Start the fishing event',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Start fishing event command used by ${interaction.user}`)

  if (!interaction.guildId) {
    await interaction.reply({
      content: 'This command can only be used in a server!',
      ephemeral: true,
    })
    return
  }

  // Check if there's an existing event and stop it
  if (fishingEventManager.isEventActive(interaction.guildId)) {
    fishingEventManager.stopEvent(interaction.guildId)
    await interaction.reply({
      content: '🛑 **Previous fishing event stopped!** Starting a new event...',
    })

    // Small delay to let users see the message
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // Start new fishing event (10 minutes duration)
  const fishingEvent = fishingEventManager.startEvent(interaction.guildId, interaction.channelId, 10)

  const response = await interaction.reply({
    content:
      '🎣 **Fishing Event is Starting!**\n\n' +
      '🕒 **Duration:** 10 minutes\n' +
      '🎯 **How to participate:** React with 🎣 to join the event!\n' +
      "🎮 **How to fish:** Use `/cast` command once you've joined\n\n" +
      '⏰ Event starts in 10 seconds...',
    withResponse: true,
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
      await response.resource?.message?.react('🎣')
    }

    // Set up interval to send follow-up messages with reaction count and track participants
    const startTime = Date.now()
    const countdownDuration = 10 * 1000 // 10 seconds countdown
    const updateInterval = 5 * 1000 // 5 seconds

    const intervalId = setInterval(async () => {
      try {
        // Check if we've exceeded the countdown duration
        if (Date.now() - startTime > countdownDuration) {
          clearInterval(intervalId)

          // Fetch the latest message to get reaction users and add them as participants
          const channel = interaction.channel || (await interaction.client.channels.fetch(interaction.channelId))
          if (channel && channel.isTextBased()) {
            try {
              const updatedMessage = await channel.messages.fetch(response.resource?.message?.id || '')
              const fishingReaction = updatedMessage.reactions.cache.get('🎣')

              if (fishingReaction) {
                // Fetch all users who reacted (excluding the bot)
                const users = await fishingReaction.users.fetch()
                users.forEach((user) => {
                  if (!user.bot) {
                    fishingEventManager.addParticipant(interaction.guildId!, user.id)
                  }
                })
              }
            } catch (error) {
              logger.error('Error fetching reaction users:', error)
            }
          }

          await interaction.followUp({
            content:
              '🚀 **FISHING EVENT STARTED!**\n\n' +
              '🎣 Participants can now use `/cast` to start fishing!\n' +
              `⏰ Event ends in ${fishingEventManager.getFormattedTimeRemaining(interaction.guildId!)}\n\n` +
              '🏆 Good luck and happy fishing!',
          })
          return
        }

        // Fetch the latest message to get updated reaction counts
        const channel = interaction.channel || (await interaction.client.channels.fetch(interaction.channelId))
        if (!channel || !channel.isTextBased()) {
          clearInterval(intervalId)
          return
        }

        const updatedMessage = await channel.messages.fetch(response.resource?.message?.id || '')
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

    // Send first update after 5 seconds
    setTimeout(async () => {
      try {
        const channel = interaction.channel || (await interaction.client.channels.fetch(interaction.channelId))
        if (!channel || !channel.isTextBased()) return

        const updatedMessage = await channel.messages.fetch(response.resource?.message?.id || '')
        const fishingReaction = updatedMessage.reactions.cache.get('🎣')
        const reactionCount = fishingReaction ? fishingReaction.count - 1 : 0

        await interaction.followUp({
          content: `🎣 **Get Ready!** ${reactionCount} ${
            reactionCount === 1 ? 'angler has' : 'anglers have'
          } joined! React with 🎣 to participate before the event starts!`,
        })
      } catch (error) {
        logger.error('Error sending first update:', error)
      }
    }, 5000)
  } catch (error) {
    logger.error('Failed to add reaction:', error)
    // Continue execution even if reaction fails
  }
}
