import type { ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { userService } from '../libs/database'

export const config = createCommandConfig({
  description: 'View your fishing profile and statistics',
  options: [
    {
      name: 'user',
      description: 'User to view profile for (defaults to yourself)',
      type: 'user',
      required: false,
    },
  ],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Profile command used by ${interaction.user}`)

  const targetUser = interaction.options.getUser('user') || interaction.user

  try {
    const userStats = await userService.getUserStats(targetUser.id)

    if (!userStats) {
      await interaction.reply({
        content: `🎣 ${targetUser.username} hasn't started fishing yet! Use \`/cast\` to catch your first fish.`,
        ephemeral: true,
      })
      return
    }

    const { user, totalFish, uniqueFishTypes, raresFishCaught, recentCatches } = userStats

    // Create embeds for the profile
    const profileEmbed = {
      title: `🎣 ${user.name}'s Fishing Profile`,
      color: 0x0099ff,
      fields: [
        {
          name: '🐟 Total Fish Caught',
          value: totalFish.toString(),
          inline: true,
        },
        {
          name: '🌟 Unique Fish Types',
          value: uniqueFishTypes.toString(),
          inline: true,
        },
        {
          name: '💎 Rare Fish Caught',
          value: raresFishCaught.toString(),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Member since ${new Date(user.createdAt).toLocaleDateString()}`,
      },
    }

    // Add recent catches if any
    if (recentCatches.length > 0) {
      const recentCatchesText = recentCatches
        .map((catch_item, index) => {
          const rarity = catch_item.fish.rarity
          const rarityEmoji =
            {
              common: '⚪',
              uncommon: '🟢',
              rare: '🔵',
              epic: '🟣',
              legendary: '🟡',
            }[rarity] || '⚪'

          return `${index + 1}. ${rarityEmoji} **${catch_item.fish.name}** (${rarity})`
        })
        .join('\n')

      profileEmbed.fields.push({
        name: '🎯 Recent Catches',
        value: recentCatchesText,
        inline: false,
      })
    }

    await interaction.reply({
      embeds: [profileEmbed],
    })
  } catch (error) {
    logger.error('Error fetching user profile:', error)
    await interaction.reply({
      content: '❌ An error occurred while fetching your profile. Please try again later.',
      ephemeral: true,
    })
  }
}
