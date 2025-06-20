import { createCommandConfig } from 'robo.js'
import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js'
import { db } from '../../libs/database'
import { users } from '../../schema'
import { getStuff } from '../../libs/utils'
import { abbreviateNumber } from '../../libs/utils'

export const config = createCommandConfig({
  description: 'Top Rock collectors',
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  try {
    // Get all users from database
    const allUsers = await db.select().from(users)

    if (!allUsers || allUsers.length === 0) {
      return interaction.editReply({
        content: 'No users found in the database.',
      })
    }

    // Parse inventories and filter users who have rocks (id: '000')
    const usersWithRocks = allUsers
      .map((user) => {
        try {
          const inventory = JSON.parse(user.inventory)
          const rockCount = inventory['000'] || 0

          return {
            userId: user.id,
            username: user.name,
            rockCount: Number(rockCount),
          }
        } catch {
          return {
            userId: user.id,
            username: user.name,
            rockCount: 0,
          }
        }
      })
      .filter((user) => user.rockCount > 0)
      .sort((a, b) => b.rockCount - a.rockCount)
      .slice(0, 10) // Top 10 users

    if (usersWithRocks.length === 0) {
      return interaction.editReply({
        content: 'No users have collected any rocks yet!',
      })
    }

    // Get rock item details
    const rockItem = getStuff('000')

    // Create leaderboard embed
    const leaderboardText = usersWithRocks
      .map((user, index) => {
        const rank = index + 1
        const medal = rank === 1 ? 'Rock King.' : rank === 2 ? 'Rock Addicted.' : rank === 3 ? 'Rock Collector.' : `${rank}.`
        return `${medal} **${user.username}** - ${abbreviateNumber(user.rockCount)} ${rockItem.emoji}`
      })
      .join('\n')

    await interaction.editReply({
      embeds: [
        {
          title: `${rockItem.emoji} Rock Collection Leaderboard`,
          description: leaderboardText,
          color: 0x8b7355, // Brown color for rocks
          footer: {
            text: `Showing top ${usersWithRocks.length} rock collectors`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    })
  } catch (error) {
    console.error('Error fetching rock leaderboard:', error)
    await interaction.editReply({
      content: 'An error occurred while fetching the rock leaderboard.',
    })
  }
}
