import { createCommandConfig, logger } from 'robo.js'
import type { ChatInputCommandInteraction } from 'discord.js'

export const config = createCommandConfig({
  description: 'Cast the fishing rod',
} as const)

export default (interaction: ChatInputCommandInteraction) => {
  logger.info(`Cast command used by ${interaction.user}`)

  interaction.reply('Casting the fishing rod...')
}
