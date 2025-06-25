import type { ChatInputCommandInteraction } from 'discord.js'
import { ButtonStyle, ComponentType, MessageFlags, PermissionFlagsBits } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { computeCDNUrl, getStuff } from '../libs/utils'
import { getUserInventory } from '../services/user'

export const config = createCommandConfig({
  description: "Enter ET's Seafood Store",
  integrationTypes: ['GuildInstall'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

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

  const totalEst = parsedInventory.reduce((acc, item) => acc + Math.floor(item.price * item.quantity), 0)

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
        title: 'Your Inventory',
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
    files: [
      {
        attachment: computeCDNUrl('store-et'),
        name: 'store-et.png',
        contentType: 'image/png',
      },
    ],
    components:
      totalEst > 0 && process.env.STORE_STATUS === 'open'
        ? [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  label: `Sell All (${totalEst} 🍬)`,
                  style: ButtonStyle.Success,
                  custom_id: 'sell-all',
                },
              ],
            },
          ]
        : [],
  })
}
