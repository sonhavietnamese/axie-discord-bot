import type { ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { getStuff } from '../libs/utils'
import { getUserInventory } from '../services/user'

export const config = createCommandConfig({
  description: 'View your inventory',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true })

  const inventory = await getUserInventory(interaction.user.id)

  if (!inventory) {
    return interaction.editReply({
      content: 'You have no inventory yet.',
    })
  }

  const parsedInventory = Object.entries(inventory)
    .map(([id, quantity]) => {
      const stuff = getStuff(id)
      return {
        quantity,
        ...stuff,
      }
    })
    .sort((a, b) => Number(b.id) - Number(a.id))

  await interaction.editReply({
    embeds: [
      {
        title: 'Inventory',
        description: 'Here is your inventory.',
        fields: [
          ...parsedInventory.map((item, index) => ({
            name: `${item.emoji} ${item.name}`,
            value: `${item.quantity} ${item.price > 0 ? `(est. ${item.price * item.quantity} 🍬)` : ''}`,
            inline: index % 2 === 0,
          })),
        ],
        footer: {
          icon_url: interaction.user.displayAvatarURL(),
          text: interaction.user.globalName || interaction.user.username,
        },
      },
    ],
  })
}
