import type { ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { METADATA } from '../metadata'

export const config = createCommandConfig({
  description: 'Start the fishing event',
  integrationTypes: ['GuildInstall'],
} as const)

const RODS = {
  '001': {
    name: 'Branch',
    rate: 50,
    uses: 5,
    color: 0xfaabac,
    image: `${METADATA.CDN}/rod-001.webp`,
    description: `BALD is not the choice, BALD is in our blood!\n :`,
  },
  '002': {
    name: 'Mavis',
    rate: 80,
    uses: 5,
    color: 0x3f74b5,
    image: `${METADATA.CDN}/rod-002.webp`,
    description: `BALD is not the choice, BALD is in our blood!\n :`,
  },
  '003': {
    name: 'BALD',
    rate: 80,
    uses: 5,
    color: 0xfaabac,
    image: `${METADATA.CDN}/rod-003.webp`,
    description: `BALD is not the choice, BALD is in our blood!\n :`,
  },
}

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply()
  await interaction.editReply({
    embeds: [
      {
        color: RODS['001'].color,
        description: `BALD is not the choice, BALD is in our blood!\n :`,

        fields: [
          {
            name: '🎣 Rod',
            value: `BALD`,
            inline: true,
          },
          {
            name: '% Rate',
            value: `80%`,
            inline: true,
          },
          {
            name: '⌛ Uses',
            value: `5/5`,
            inline: true,
          },
        ],
        footer: {
          icon_url: interaction.user.displayAvatarURL(),
          text: interaction.user.displayName,
        },
        title: `You got BALD Rod!`,
      },
    ],
    files: [
      {
        attachment: `${METADATA.CDN}/rod-001.webp`,
        name: 'rod-001.webp',
        contentType: 'image/webp',
      },
    ],
  })
}
