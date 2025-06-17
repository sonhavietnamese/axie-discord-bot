import type { ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { nuke } from '../../services/hanana'

export const config = createCommandConfig({
  description: 'Nuke the fishing event',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Nuke fishing event command used by ${interaction.user}`)

  await nuke()

  await interaction.reply({
    content: '🎣 **Fishing Event Nuked!**',
  })
}
