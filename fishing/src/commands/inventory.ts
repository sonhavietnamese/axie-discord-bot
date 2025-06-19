import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { getStuff } from '../libs/utils'
import { getUserInventory } from '../services/user'

export const config = createCommandConfig({
  description: 'View your inventory',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const rawInventory = await getUserInventory(interaction.user.id)
  const inventory = rawInventory
    ? Object.entries(rawInventory)
        .filter(([id]) => id >= '001' && id <= '006')
        .reduce((acc, [id, qty]) => ({ ...acc, [id]: qty }), {})
    : null

  if (!inventory) {
    return interaction.editReply({
      content: 'You have no inventory yet.',
    })
  }

  const parsedInventory = Object.entries(inventory)
    .map(([id, quantity]) => {
      const stuff = getStuff(id)
      return {
        quantity: Number(quantity),
        ...stuff,
      }
    })
    .sort((a, b) => Number(b.id) - Number(a.id))

  await interaction.editReply({
    embeds: [
      {
        title: 'Inventory',
        description: 'Here is your inventory.',
        color: 0xfff7d9,
        fields: [
          {
            name: 'Stuffs',
            value: parsedInventory.map((item) => `${item.emoji} ${item.name}`).join('\n'),
            inline: true,
          },
          {
            name: 'Quantity',
            value: parsedInventory.map((item) => `${item.quantity}`).join('\n'),
            inline: true,
          },
          {
            name: 'Est. 🍬',
            value: parsedInventory.map((item) => `${Math.floor(item.price * item.quantity)}`).join('\n'),
            inline: true,
          },
        ],
        footer: {
          icon_url: interaction.user.displayAvatarURL(),
          text: interaction.user.globalName || interaction.user.username,
        },
      },
    ],
  })
}
