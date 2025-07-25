import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { computeCDNUrl, getRod, getTotalRodCount } from '../libs/utils'
import { getUserInventory, getOrCreateUser } from '../services/user'

export const config = createCommandConfig({
  description: 'View your rod',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  try {
    // Create user if they don't exist
    await getOrCreateUser(interaction.user.id, interaction.user.username || interaction.user.globalName || 'Unknown User')

    // Get user's inventory
    const inventory = await getUserInventory(interaction.user.id)

    if (!inventory) {
      return interaction.editReply({
        content: '❌ **Could not load your inventory.** Please try again later.',
      })
    }

    // Check if user has any rods
    const totalRods = getTotalRodCount(inventory)

    if (totalRods === 0) {
      return interaction.editReply({
        content: "🎣 **You don't have any rods yet!**\n\nYou can buy a rod from the Rod Store using `/fishing-store rod`.",
      })
    }

    // Get the first (and should be only) rod from inventory
    const userRods = Object.entries(inventory.rods)
      .filter(([, rodData]) => rodData.quantity > 0)
      .map(([rodId, rodData]) => ({ rodId, quantity: rodData.quantity, usesLeft: rodData.usesLeft }))

    if (userRods.length === 0) {
      return interaction.editReply({
        content: "🎣 **You don't have any rods yet!**\n\nYou can buy a rod from the Rod Store using `/fishing-store rod`.",
      })
    }

    // Get the first rod (since user should only have 1)
    const userRod = userRods[0]
    const rod = getRod(userRod.rodId)

    if (!rod) {
      return interaction.editReply({
        content: '❌ **Rod configuration not found.** Please contact an admin.',
      })
    }

    // Check if rod is broken
    const isBroken = userRod.usesLeft <= 0
    const rodStatus = isBroken ? '🔴 Broken' : `🟢 ${userRod.usesLeft}/${rod.uses} uses left`

    // Prepare embed title and description based on rod count
    const embedTitle = userRods.length === 1 ? `Your ${rod.name} Rod!` : `Your Rods (${userRods.length})`

    const embedDescription =
      userRods.length === 1
        ? `${rod.description}${isBroken ? '\n\n⚠️ **This rod is broken!** Buy a new one from `/fishing-store rod`.' : ''}`
        : `${rod.description}\n\n⚠️ **Note:** You have ${userRods.length} rods, but only 1 is allowed. Consider using or trading extras.`

    await interaction.editReply({
      embeds: [
        {
          color: isBroken ? 0xff0000 : rod.color, // Red if broken, original color if working
          title: embedTitle,
          description: embedDescription,
          fields: [
            {
              name: '🎣 Rod',
              value: rod.name,
              inline: true,
            },
            {
              name: '% Rate',
              value: `${rod.rate}%`,
              inline: true,
            },
            {
              name: '⚡ Rod Status',
              value: rodStatus,
              inline: true,
            },
            {
              name: '📦 Quantity',
              value: `${userRod.quantity}`,
              inline: true,
            },
            {
              name: '🎯 Rod Limit',
              value: `${totalRods}/1`,
              inline: true,
            },
            {
              name: '💰 Price',
              value: `${rod.price} 🍬`,
              inline: true,
            },
          ],
          footer: {
            icon_url: interaction.user.displayAvatarURL(),
            text: `${interaction.user.globalName || interaction.user.username} • Use /inventory to see all items`,
          },
        },
      ],
      files: [
        {
          attachment: computeCDNUrl(rod.image),
          name: `${rod.image}.webp`,
        },
      ],
    })

    // If user has multiple rods, show additional info
    if (userRods.length > 1) {
      const additionalRods = userRods
        .slice(1)
        .map(({ rodId, quantity, usesLeft }) => {
          const additionalRod = getRod(rodId)
          const maxUses = additionalRod?.uses || 0
          const status = usesLeft <= 0 ? '🔴 Broken' : `🟢 ${usesLeft}/${maxUses}`
          return additionalRod ? `${additionalRod.emoji} ${additionalRod.name} x${quantity} (${status})` : `Unknown Rod (${rodId}) x${quantity}`
        })
        .join('\n')

      await interaction.followUp({
        content: `📋 **Additional Rods:**\n${additionalRods}\n\n⚠️ **Rod Limit:** You can only own 1 rod. The extra rods are from before the limit was enforced.`,
        ephemeral: true,
      })
    }
  } catch (error) {
    console.error('Error in rod command:', error)
    await interaction.editReply({
      content: '❌ **An error occurred while fetching your rod information.** Please try again later.',
    })
  }
}
