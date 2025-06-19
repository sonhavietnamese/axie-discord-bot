import { ChannelType, type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { reset } from '../../libs/nft'
import { isAdmin, isWhitelisted, require } from '../../libs/utils'
import { endActiveEvent } from '../../services/hanana'

export const config = createCommandConfig({
  description: 'Start the fishing event',
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

  reset()
  const activeEvent = await endActiveEvent(interaction.guildId!, interaction.channelId)

  if (!activeEvent) {
    await interaction.reply({
      content: '🚫 No fishing event is currently happening!',
    })
  }

  await interaction.reply({
    content: '🎣 **Fishing Event Ended!**\n\nYou can still exchange your fish to get candies 🍬!',
  })
}
