import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { trackIdentity, trackEvent } from '../libs/tracking'

export const config = createCommandConfig({
  description: 'Personal fishoo for poor people without Nitro',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  trackIdentity({
    id: interaction.user.id,
    username: interaction.user.username,
    globalName: interaction.user.globalName || interaction.user.username,
  })

  trackEvent({
    id: interaction.user.id,
    event: '/fishoo',
    action: '/fishoo',
    action_properties: {
      user_id: interaction.user.id,
      server_id: interaction.guildId,
    },
  })

  await interaction.reply({
    content: `<a:ooooooooooooo:1385193747268112455><a:ooooooooooooo:1385193747268112455><a:ooooooooooooo:1385193747268112455><a:ooooooooooooo:1385193747268112455>`,
  })
}
