import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { getStuff, getRod } from '../libs/utils'
import { getUserInventory } from '../services/user'

export const config = createCommandConfig({
  description: 'View your inventory',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const rawInventory = await getUserInventory(interaction.user.id)

  if (!rawInventory) {
    return interaction.editReply({
      content: 'You have no inventory yet.',
    })
  }

  // Parse fish inventory (items 001-006, and 000 for trash)
  const fishInventory = Object.entries(rawInventory.fishes)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => {
      const stuff = getStuff(id)
      return {
        quantity: Number(quantity),
        ...stuff,
      }
    })
    .sort((a, b) => Number(b.id) - Number(a.id))

  // Parse rod inventory
  const rodInventory = Object.entries(rawInventory.rods)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => {
      const rod = getRod(id)
      return {
        quantity: Number(quantity),
        ...rod,
      }
    })
    .sort((a, b) => Number(b.id) - Number(a.id))

  // Calculate total estimated candies from fish only
  const totalFishValue = fishInventory
    .filter((item) => item.id >= '001' && item.id <= '006') // Only fish, not trash
    .reduce((acc, item) => acc + Math.floor(item.price * item.quantity), 0)

  const embeds = []

  // Fish inventory embed
  if (fishInventory.length > 0) {
    embeds.push({
      title: '🐟 Fish Inventory',
      description: 'Your caught fish and items',
      color: 0x00bfff,
      fields: [
        {
          name: 'Items',
          value: fishInventory.map((item) => `${item.emoji} ${item.name}`).join('\n') || 'None',
          inline: true,
        },
        {
          name: 'Quantity',
          value: fishInventory.map((item) => `${item.quantity}`).join('\n') || '0',
          inline: true,
        },
        {
          name: 'Est. 🍬',
          value: fishInventory.map((item) => `${Math.floor(item.price * item.quantity)}`).join('\n') || '0',
          inline: true,
        },
      ],
      footer: {
        text: `Total fish value: ${totalFishValue} 🍬`,
      },
    })
  }

  // Rod inventory embed
  if (rodInventory.length > 0) {
    embeds.push({
      title: '🎣 Rod Inventory',
      description: 'Your fishing rods',
      color: 0xff7a00,
      fields: [
        {
          name: 'Rods',
          value: rodInventory.map((rod) => `${rod.emoji} ${rod.name}`).join('\n') || 'None',
          inline: true,
        },
        {
          name: 'Quantity',
          value: rodInventory.map((rod) => `${rod.quantity}`).join('\n') || '0',
          inline: true,
        },
        {
          name: 'Uses Each',
          value: rodInventory.map((rod) => `${rod.uses} uses`).join('\n') || '0',
          inline: true,
        },
      ],
    })
  }

  // If no items at all
  if (embeds.length === 0) {
    embeds.push({
      title: '📦 Empty Inventory',
      description: 'You have no items yet. Go fishing to catch some fish and buy rods from the store!',
      color: 0x888888,
    })
  }

  await interaction.editReply({
    embeds,
  })
}
