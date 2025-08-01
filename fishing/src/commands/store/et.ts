import type { ChatInputCommandInteraction } from 'discord.js'
import { ButtonStyle, ComponentType, MessageFlags, PermissionFlagsBits } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { computeCDNUrl, getStuff, isAdmin, isWhitelisted, require } from '../../libs/utils'
import { getUserInventory } from '../../services/user'
import { trackIdentity, trackEvent } from '../../libs/tracking'

export const config = createCommandConfig({
  description: "Enter ET's Seafood Store",
  integrationTypes: ['GuildInstall'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  try {
    await require(isWhitelisted(interaction.guildId, interaction.channelId), 'This command can only be used in #game-zone', interaction)
  } catch (error) {
    // The require function has already replied to the interaction
    return
  }

  logger.info(`[command][/store_et][${interaction.user.id}][${interaction.user.username}]`)

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  trackIdentity({
    id: interaction.user.id,
    username: interaction.user.username,
    globalName: interaction.user.globalName || interaction.user.username,
  })

  trackEvent({
    id: interaction.user.id,
    event: '/store_et',
    action: '/store_et',
    action_properties: {
      user_id: interaction.user.id,
      server_id: interaction.guildId,
    },
  })

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
        title: `Gm bro, welcome to ET's Seafood Store!`,
        description: `Store is open, you can sell your fish here to get candies 🍬!`,
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
        attachment: computeCDNUrl('store-et'),
        name: 'store-et.png',
      },
    ],
    components: [
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
    ],
  })
}
