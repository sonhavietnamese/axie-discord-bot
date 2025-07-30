import { ChannelType, type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { nuke } from '../../services/hanana'
import { isAdmin, isWhitelisted, require } from '../../libs/utils'
import { reset } from '../../libs/nft'

export const config = createCommandConfig({
  description: 'Nuke the fishing event',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Nuke fishing event command used by ${interaction.user}`)

  try {
    await require(interaction.channel?.type === ChannelType.GuildText, 'This command can only be used in a text channel', interaction)
    await require(isAdmin(interaction.user.id), 'You must be an admin to use this command', interaction)
    await require(isWhitelisted(interaction.guildId, interaction.channelId), 'This command can only be used in whitelisted channels', interaction)
  } catch (error) {
    // The require function has already replied to the interaction
    return
  }

  await nuke()
  reset()

  await interaction.reply({
    content: '🎣 **Fishing Event Nuked!**',
  })
}
