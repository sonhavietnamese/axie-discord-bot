import { type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'

export const config = createCommandConfig({
  description: 'Personal fishoo for poor people without Nitro',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    content: `<a:ooooooooooooo:1385193747268112455><a:ooooooooooooo:1385193747268112455><a:ooooooooooooo:1385193747268112455><a:ooooooooooooo:1385193747268112455>`,
  })
}
