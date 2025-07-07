import type { ChatInputCommandInteraction } from 'discord.js'
import { ButtonStyle, ComponentType, MessageFlags, PermissionFlagsBits } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { computeCDNUrl, getStuff } from '../../libs/utils'
import { getUserInventory } from '../../services/user'

export const config = createCommandConfig({
  description: "Enter ET's Seafood Store",
  integrationTypes: ['GuildInstall'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  let inventory = await getUserInventory(interaction.user.id)

  if (!inventory) {
    // Create empty inventory structure
    inventory = { fishes: {}, rods: {} }
  }

  // Only show fish inventory in ET's store (he doesn't buy rods)
  const parsedInventory = Object.entries(inventory.fishes)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => {
      const stuff = getStuff(id)
      return {
        quantity,
        ...stuff,
      }
    })
    .sort((a, b) => Number(b.id) - Number(a.id))

  const totalEst = parsedInventory.reduce((acc, item) => acc + Math.floor(item.price * item.quantity), 0)

  // Show message if no fish to sell
  const inventoryContent =
    parsedInventory.length > 0
      ? {
          fields: [
            {
              name: 'Fish & Items',
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
        }
      : {
          description: 'No fish to sell! Go catch some fish first 🎣',
          fields: [],
        }

  await interaction.editReply({
    embeds: [
      {
        color: 0xc63b3b,
        title: `${process.env.STORE_STATUS === 'open' ? '[OPEN]' : '[CLOSED]'} Gm bro, welcome to ET's Seafood Store!`,
        description: `${
          process.env.STORE_STATUS === 'open'
            ? 'Store is open, you can sell your fish here to get candies 🍬!'
            : 'Store is closed, you can not sell your fish here to get candies 🍬!'
        }`,
      },
      {
        title: 'Your Fish Inventory',
        color: 0xfff7d9,
        description: inventoryContent.description,
        fields: inventoryContent.fields,
        footer:
          parsedInventory.length > 0
            ? {
                icon_url: interaction.user.displayAvatarURL(),
                text: `${interaction.user.globalName || interaction.user.username} • Total value: ${totalEst} 🍬`,
              }
            : undefined,
      },
    ],
    files: [
      {
        attachment: computeCDNUrl('store-001'),
        name: 'store-001.webp',
      },
    ],
    components:
      process.env.STORE_STATUS === 'open' && parsedInventory.length > 0
        ? [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Success,
                  label: 'Sell All Fish',
                  customId: 'sell-all',
                  emoji: '💰',
                },
              ],
            },
          ]
        : [],
  })
}
