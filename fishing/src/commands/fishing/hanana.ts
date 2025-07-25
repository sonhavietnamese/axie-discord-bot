import { ChannelType, ChatInputCommandInteraction, GuildTextBasedChannel } from 'discord.js'
import { createCommandConfig, Flashcore, logger } from 'robo.js'
import { GAME_READY_DURATION } from '../../configs/game'
import { EVENT_DURATION, STORAGE_KEYS } from '../../constants'
import { randomPlayer } from '../../libs/nft'
import { computeCDNUrl, isAdmin, isWhitelisted, require } from '../../libs/utils'
import { createFishingEvent, nuke, startFishingEvent } from '../../services/hanana'
import { batchCreateUsers } from '../../services/user'
import { FishingEventHappening, FishingEventStatus } from '../../types'

export const config = createCommandConfig({
  description: 'Start the fishing event!',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Start fishing event command used by ${interaction.user}`)

  try {
    await require(interaction.channel?.type === ChannelType.GuildText, 'This command can only be used in a text channel', interaction)
    await require(isAdmin(interaction.user.id), 'You must be an admin to use this command', interaction)
    await require(isWhitelisted(interaction.guildId, interaction.channelId), 'This command can only be used in whitelisted channels', interaction)
  } catch (error) {
    // The require function has already replied to the interaction
    return
  }

  await nuke()

  const createdEvent = await createFishingEvent(interaction.guildId!, interaction.channelId, interaction.user.id)

  // Defer the reply first to avoid timeout issues with file downloads
  await interaction.deferReply()

  const response = await interaction.editReply({
    content:
      '🎣 **Fishing Hanana is Open!**\n\n' +
      '🕒 **Duration:** 15 minutes\n' +
      '🎯 **How to participate:** Make sure you have a rod in your inventory!\n\n' +
      '💫 **Useful commands:**\n' +
      '1. `/cast` - Cast your line and catch a fish!\n' +
      '2. `/inventory` - View your inventory!\n' +
      '3. `/rod` - View your rod!\n' +
      "4. `/fishing-store rod` - Buy a rod if you don't have one!\n" +
      "5. `/fishing-store et` - Go to the ET's Seafood Store!\n\n" +
      '⏰ Event starts in 2 minutes...\n\n' +
      "**Note:** You need to own a rod to participate. Buy one from the Rod Store if you don't have any!",
    files: [
      {
        attachment: computeCDNUrl('thumbnail-001'),
        name: 'thumbnail-001.png',
        contentType: 'image/png',
      },
    ],
  })

  await Flashcore.set<FishingEventHappening>(STORAGE_KEYS.HAPPENING, {
    channelId: interaction.channelId,
    startTime: Date.now(),
    endTime: Date.now() + EVENT_DURATION, // 15 minutes
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

    // Set up countdown timer to start the event
    const startTime = Date.now()
    const countdownDuration = GAME_READY_DURATION // 120 second countdown

    setTimeout(async () => {
      try {
        // Start the fishing event
        await startFishingEvent(createdEvent.id)

        const happening = await Flashcore.get<FishingEventHappening>(STORAGE_KEYS.HAPPENING)

        if (happening) {
          happening.status = FishingEventStatus.ACTIVE
          await Flashcore.set<FishingEventHappening>(STORAGE_KEYS.HAPPENING, happening)
        }

        await Flashcore.set<FishingEventHappening>(STORAGE_KEYS.HAPPENING, {
          channelId: interaction.channelId,
          startTime: Date.now(),
          endTime: Date.now() + EVENT_DURATION, // 15 minutes
          status: FishingEventStatus.ACTIVE,
        })

        await interaction.followUp({
          content:
            '💫 **Fishing Hanana STARTED!**\n\n' +
            '🎣 **Ready to fish!** Use `/cast` to start fishing!\n\n' +
            '📝 **Requirements:**\n' +
            '• You must have a rod in your inventory\n' +
            '• Buy rods from `/fishing-store rod` if needed\n' +
            '• View your rods with `/rod` command\n\n' +
            '_Good luck and happy fishing 🐟🐠🐡!_',
        })

        // TODO: pick the won axie winner - simplified since we're not tracking participants
        // randomPlayer([]) // Empty for now since we don't track participants anymore
      } catch (error) {
        logger.error('Error starting fishing event:', error)
      }
    }, countdownDuration)

    // Send countdown updates
    setTimeout(async () => {
      try {
        await interaction.followUp({
          content: `🎣 **Get Ready!** Fishing event starts in 1 minute!\n\nMake sure you have a rod in your inventory to participate!`,
        })
      } catch (error) {
        logger.error('Error sending countdown update:', error)
      }
    }, countdownDuration - 60000) // 1 minute before start
  } catch (error) {
    logger.error('Failed to set up fishing event:', error)
    // Continue execution even if reaction fails
  }
}
