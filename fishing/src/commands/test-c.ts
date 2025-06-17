import type { ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { METADATA } from '../metadata'

export const config = createCommandConfig({
  description: 'Start the fishing event',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply()
  await interaction.editReply({
    embeds: [
      {
        color: 0x476dc6,
        title: 'You can catch A Fish!',
        description: 'You caught an Anchovy! This is an special fish! you can use it to cook Pasta, or just eat it raw! \n\n',
        fields: [
          {
            name: '🐟 Fish',
            value: `Anchovy`,
            inline: true,
          },
          {
            name: '% Rarity',
            value: `Common`,
            inline: true,
          },
          {
            name: 'Market Price',
            value: `0.3 🍬`,
            inline: true,
          },
        ],
      },
    ],
    files: [
      {
        attachment: `${METADATA.CDN}/axie-12114085.webp`,
        name: 'fish-002.webp',
        contentType: 'image/webp',
      },
    ],
  })
}
