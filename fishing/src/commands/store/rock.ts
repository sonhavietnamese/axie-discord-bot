import type { ChatInputCommandInteraction } from 'discord.js'
import { ButtonStyle, ComponentType, MessageFlags } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { trackEvent, trackIdentity } from '../../libs/tracking'
import { computeCDNUrl, isWhitelisted, require } from '../../libs/utils'
import { getCandyBalance } from '../../services/drip'
import { getUserInventory } from '../../services/user'

export const config = createCommandConfig({
  description: 'Rock Store - Candy Machine',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  try {
    await require(isWhitelisted(interaction.guildId, interaction.channelId), 'This command can only be used in #game-zone', interaction)
  } catch (error) {
    return
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  trackIdentity({
    id: interaction.user.id,
    username: interaction.user.username,
    globalName: interaction.user.globalName || interaction.user.username,
  })

  trackEvent({
    id: interaction.user.id,
    event: '/store_rock',
    action: '/store_rock',
    action_properties: {
      user_id: interaction.user.id,
      server_id: interaction.guildId,
    },
  })

  const candyBalance = await getCandyBalance(interaction.user.id)
  const inventory = await getUserInventory(interaction.user.id)

  if (!inventory) {
    return interaction.editReply({
      content: 'You do not have an inventory!',
    })
  }

  const rockBalance = inventory.fishes['000'] || 0

  const buttonGroup = [
    {
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      label: `Roll`,
      emoji: '🪨',
      customId: 'roll-rock',
    },
  ]

  const thumbnail = computeCDNUrl('store-rock')

  await interaction.editReply({
    content: '## 🪨 Rock Store - 🍬 Candy Machine\n\nWelcome to the Rock Store! \nYou can craft 2 rocks and 2 candies for 1 roll.',
    embeds: [
      {
        color: 0xfff7d9,
        title: `Your Balance`,
        fields: [
          {
            name: 'Candies',
            value: `${candyBalance} 🍬`,
            inline: true,
          },
          {
            name: 'Rocks',
            value: `${rockBalance} 🪨`,
            inline: true,
          },
        ],
      },
    ],
    files: [{ name: `store-rock.png`, contentType: 'image/png', attachment: thumbnail }],
    components: [
      {
        type: ComponentType.ActionRow,
        components: buttonGroup,
      },
    ],
  })
}
