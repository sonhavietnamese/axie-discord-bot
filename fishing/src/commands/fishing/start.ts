import { ChannelType, ChatInputCommandInteraction, GuildTextBasedChannel } from 'discord.js'
import { createCommandConfig, Flashcore, logger } from 'robo.js'
import { EVENT_DURATION, STORAGE_KEYS } from '../../constants'
import { isAdmin, isWhitelisted, require } from '../../libs/utils'
import { METADATA } from '../../metadata'
import { addParticipant, createFishingEvent, startFishingEvent } from '../../services/hanana'
import { batchCreateUsers } from '../../services/user'
import { FishingEventHappening, FishingEventStatus } from '../../types'

export const config = createCommandConfig({
  description: 'Start the fishing event',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Start fishing event command used by ${interaction.user}`)

  await require(interaction.channel?.type === ChannelType.GuildText, 'This command can only be used in a text channel', interaction)
  await require(isAdmin(interaction.user.id), 'You must be an admin to use this command', interaction)
  await require(isWhitelisted(interaction.guildId, interaction.channelId), 'This command can only be used in whitelisted channels', interaction)

  const createdEvent = await createFishingEvent(interaction.guildId!, interaction.channelId, interaction.user.id)

  // Defer the reply first to avoid timeout issues with file downloads
  await interaction.deferReply()

  const response = await interaction.editReply({
    content:
      '🎣 **Fishing Hanana is Open!**\n\n' +
      '🕒 **Duration:** 15 minutes\n' +
      '🎯 **How to participate:** React with 🎣 to join the event!\n' +
      "🎮 **How to fish:** Use `/cast` command once you've joined and event started\n\n" +
      '⏰ Event starts in 15 seconds...',
    files: [
      {
        attachment: `${METADATA.CDN}/thumbnail-001.webp`,
        name: 'thumbnail-001.webp',
        contentType: 'image/webp',
      },
    ],
  })

  await Flashcore.set<FishingEventHappening>(STORAGE_KEYS.HAPPENING, {
    channelId: interaction.channelId,
    startTime: Date.now(),
    endTime: Date.now() + EVENT_DURATION, // 10 minutes
    status: FishingEventStatus.PENDING,
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
    }

    // Set up interval to send follow-up messages with reaction count and track participants
    const startTime = Date.now()
    const countdownDuration = 6 * 1000 // 15 second countdown
    const updateInterval = 3 * 1000 // 5 seconds

    const intervalId = setInterval(async () => {
      try {
        // Check if we've exceeded the countdown duration
        if (Date.now() - startTime > countdownDuration) {
          clearInterval(intervalId)

          // Fetch the latest message to get reaction users and add them as participants
          const channel = interaction.channel || (await interaction.client.channels.fetch(interaction.channelId))
          if (channel && channel.isTextBased()) {
            try {
              const updatedMessage = await channel.messages.fetch(response.id)
              const fishingReaction = updatedMessage.reactions.cache.get('🎣')

              if (fishingReaction) {
                const users = await fishingReaction.users.fetch()
                const filteredUsers = users.filter((user) => !user.bot)

                const { inserted, existing } = await batchCreateUsers(filteredUsers.map((user) => ({ id: user.id, name: user.username })))

                await addParticipant(createdEvent.id, [...inserted.map((user) => user.id), ...existing])
                await startFishingEvent(createdEvent.id)
              }
            } catch (error) {
              logger.error('Error fetching reaction users:', error)
            }
          }

          const happening = await Flashcore.get<FishingEventHappening>(STORAGE_KEYS.HAPPENING)

          if (happening) {
            happening.status = FishingEventStatus.ACTIVE
            await Flashcore.set<FishingEventHappening>(STORAGE_KEYS.HAPPENING, happening)
          }

          await Flashcore.set<FishingEventHappening>(STORAGE_KEYS.HAPPENING, {
            channelId: interaction.channelId,
            startTime: Date.now(),
            endTime: Date.now() + EVENT_DURATION, // 10 minutes
            status: FishingEventStatus.ACTIVE,
          })

          await interaction.followUp({
            content:
              '🚀 **FISHING EVENT STARTED!**\n\n' +
              '🎣 Participants can now use `/cast` to start fishing!\n' +
              // `⏰ Event ends in ${fishingEventManager.getFormattedTimeRemaining(interaction.guildId!)}\n\n` +
              '🏆 Good luck and happy fishing!',
          })

          // Send an ephemeral message to the admin who started the event
          await interaction.followUp({
            content: 'This is your rod!',
            // add a row of infomation about name, rate, and level
            embeds: [
              {
                fields: [
                  {
                    name: 'Name',
                    value: 'John Doe',
                  },
                ],
              },
            ],

            ephemeral: true,
            files: [
              {
                attachment: `${METADATA.CDN}/rod-003.webp`,
                name: 'rod-002.webp',
                contentType: 'image/webp',
              },
            ],
          })
          return
        }

        // Fetch the latest message to get updated reaction counts
        const channel = interaction.channel || (await interaction.client.channels.fetch(interaction.channelId))
        if (!channel || !channel.isTextBased()) {
          clearInterval(intervalId)
          return
        }

        // const updatedMessage = await channel.messages.fetch(response.resource?.message?.id || '')
        // const fishingReaction = updatedMessage.reactions.cache.get('🎣')
        // const reactionCount = fishingReaction ? fishingReaction.count - 1 : 0 // Subtract 1 for the bot's reaction

        // Send follow-up with current participant count
        // await interaction.followUp({
        //   content: `🎣 **Fishing Event Update:** ${reactionCount} ${
        //     reactionCount === 1 ? 'angler has' : 'anglers have'
        //   } joined the fishing event! React with 🎣 to participate!`,
        // })
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

        const updatedMessage = await channel.messages.fetch(response.id)
        const fishingReaction = updatedMessage.reactions.cache.get('🎣')
        const reactionCount = fishingReaction ? fishingReaction.count - 1 : 0

        if (reactionCount === 0) {
          await interaction.followUp({
            content: `🎣 **Get Ready!** No one has joined yet! React with 🎣 to participate before the event starts!`,
          })
        } else {
          await interaction.followUp({
            content: `🎣 **Get Ready!** ${reactionCount} ${
              reactionCount === 1 ? 'angler has' : 'anglers have'
            } joined! React with 🎣 to participate before the event starts!`,
          })
        }
      } catch (error) {
        logger.error('Error sending first update:', error)
      }
    }, 5000)
  } catch (error) {
    logger.error('Failed to add reaction:', error)
    // Continue execution even if reaction fails
  }
}
