import type { ChatInputCommandInteraction } from 'discord.js'
import { ButtonStyle, ComponentType, MessageFlags } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { computeCDNUrl } from '../../libs/utils'
import { getCandyBalance } from '../../services/drip'
import { getUserInventory } from '../../services/user'

export const config = createCommandConfig({
  description: 'Rock Store - Candy Machine',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

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
    embeds: [
      {
        color: 0xfff7d9,
        title: `Rock Store - Candy Machine`,
        description: `Welcome to the Rock Store! \n\nYou can craft 2 rocks and 2 candies for 1 roll.`,
      },
      {
        color: 0xfff7d9,
        title: `Your Candy Balance`,
        description: `You have ${await getCandyBalance(interaction.user.id)} 🍬 candies`,
      },
      {
        color: 0xfff7d9,
        title: `Your Rock Balance`,
        description: `You have ${rockBalance} 🪨 rocks`,
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
