import type { ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { computeCDNUrl } from '../libs/utils'

export const config = createCommandConfig({
  description: "Enter ET's Seafood Store",
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true })
  await interaction.editReply({
    embeds: [
      {
        color: 0xc63b3b,
        title: "[CLOSE] Gm bro, welcome to ET's Seafood Store!",
        description:
          'You can exchange your fish here to get candies 🍬!\n\n_The store is under decoration, ET wants to make it look nice✨\nGrand opening will be announce later!_',
      },
    ],
    files: [
      {
        attachment: computeCDNUrl('store-et'),
        name: 'store-et.png',
        contentType: 'image/png',
      },
    ],
  })
}
