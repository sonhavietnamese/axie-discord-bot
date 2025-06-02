import type { ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig, Flashcore, logger } from 'robo.js'
import { STORAGE_KEYS } from '../../constants'
import { FishingEventHappening } from '../../types'

export const config = createCommandConfig({
  description: 'Start the fishing event',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Start fishing event command used by ${interaction.user}`)

  const happening = await Flashcore.get<FishingEventHappening>(STORAGE_KEYS.HAPPENING)

  if (!happening) {
    await interaction.reply({
      content: '🚫 No fishing event is currently happening!',
    })
  }

  await Flashcore.delete(STORAGE_KEYS.HAPPENING)

  await interaction.reply({
    content: '🎣 **Fishing Event Ended!**',
  })
}
