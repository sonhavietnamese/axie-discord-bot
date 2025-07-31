import { ChannelType, ChatInputCommandInteraction, GuildTextBasedChannel } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { computeCDNUrl, isAdmin, isWhitelisted, require } from '../../libs/utils'
import { createFishingEvent, nuke, startFishingEvent } from '../../services/hanana'

export const config = createCommandConfig({
  description: 'Start the fishing event',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
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
      '🎣 **Fishing Hanana is Officially Open!**\n\n' +
      '💫 **Useful commands:**\n' +
      '1. `/cast` - Cast your line and catch a fish!\n' +
      '2. `/inventory` - View your inventory!\n' +
      "3. `/store et` - Go to the ET's Seafood Store!\n" +
      '4. `/store rod` - Go to the Rod Store! Go buy a rod!\n' +
      '5. `/store rock` - Go to the Rock Store! Craft candies and rocks for extra rewards!\n' +
      '6. `/fishoo` - Get a fishoo for poor people without Nitro!\n',
    files: [
      {
        attachment: computeCDNUrl('thumbnail-001'),
        name: 'thumbnail-001.png',
        contentType: 'image/png',
      },
    ],
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
      await response.react('<a:ooooooooooooo:1385193747268112455>')
    }

    // Start the fishing event immediately (simplified version)
    await startFishingEvent(createdEvent.id)

    await interaction.followUp({
      content:
        '💫 **Fishing Event is LIVE!**\n\n' +
        '🎣 **Ready to fish!** Use `/cast` to start fishing!\n\n' +
        '📝 **Requirements:**\n' +
        '• You must have a rod in your inventory\n' +
        '• Buy rods from `/fishing-store rod` if needed\n' +
        '• View your rods with `/rod` command\n\n' +
        '_Good luck and happy fishing 🐟🐠🐡!_',
    })
  } catch (error) {
    logger.error('Failed to set up fishing event:', error)
    // Continue execution even if reaction fails
  }
}
