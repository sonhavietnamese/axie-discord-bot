import { type ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { desc, eq } from 'drizzle-orm'
import { createCommandConfig } from 'robo.js'
import { AXIE_NAMES } from '../constants/axies'
import { db } from '../libs/database'
import { roundsTable, roundUsersTable, usersTable } from '../schema'
import { formatGuessHistory, formatUserStats, formatStreakQualificationDetails } from '../utils/message.utils'
import { calculateStreakHistory, checkStreakRewardQualification } from '../utils/streak.utils'
import { rewardService } from '../services/reward.service'
import { formatReward } from '../libs/utils'

export const config = createCommandConfig({
  description: 'View your guess history',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: 64 })

  try {
    // Get the current round ID (latest round)
    const [latestRound] = await db.select({ id: roundsTable.id }).from(roundsTable).orderBy(desc(roundsTable.id)).limit(1)

    const currentRoundId = latestRound?.id

    // Get all guesses for this user with round info
    const userGuesses = await db
      .select({
        roundId: roundUsersTable.roundId,
        guess: roundUsersTable.guess,
        isCorrect: roundUsersTable.isCorrect,
        candiesWon: roundUsersTable.candiesWon,
        axieId: roundsTable.axieId,
        createdAt: roundsTable.createdAt,
      })
      .from(roundUsersTable)
      .innerJoin(roundsTable, eq(roundUsersTable.roundId, roundsTable.id))
      .where(eq(roundUsersTable.userId, interaction.user.id))
      .orderBy(desc(roundsTable.id))

    if (userGuesses.length === 0) {
      await interaction.editReply("You haven't made any guesses yet!")
      return
    }

    // Get axie names for all guesses using the constant
    const axieNames = AXIE_NAMES

    // Get user's current stats
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, interaction.user.id))

    // Calculate streak information
    const sortedGuesses = [...userGuesses].sort((a, b) => parseInt(a.roundId) - parseInt(b.roundId))
    const streakInfo = calculateStreakHistory(sortedGuesses)

    // Check if user qualifies for streak reward (now with current round tracking)
    const streakReward = await checkStreakRewardQualification(interaction.user.id, userGuesses, currentRoundId)

    // Get claim history
    const claimHistory = await rewardService.getClaimHistory(interaction.user.id, 3)

    let totalCandies = 0
    const historyLines = formatGuessHistory(
      userGuesses.slice(0, 10).map((guess) => {
        totalCandies += guess.candiesWon
        const streakAtTime = streakInfo.find((s) => s.roundId === guess.roundId)
        return {
          ...guess,
          streakAtTime,
          axieNames,
        }
      }),
      axieNames,
      currentRoundId, // Pass current round ID to show skipped current round
    )

    const userStats = {
      totalRounds: userGuesses.length,
      correctGuesses: user?.correctGuesses || 0,
      currentStreak: user?.currentStreak || 0,
      longestStreak: user?.longestStreak || 0,
      totalCandies,
    }

    const stats = formatUserStats(userStats)
    const recentHistory =
      historyLines.length > 0 ? `**🕒 Recent History (Last ${Math.min(10, historyLines.length)} rounds):**\n\n${historyLines.join('\n\n')}` : ''

    let response = `${stats}${recentHistory}`

    // Add claim history
    if (claimHistory.length > 0) {
      response += `\n\n${rewardService.formatClaimHistory(claimHistory)}`
    }

    // Add streak qualification details
    response += formatStreakQualificationDetails(streakReward.details)

    // Add streak reward information if qualified
    if (streakReward.qualified) {
      response += `\n\n🔥 **NEW STREAK DETECTED!** 🔥\n`
      response += `You have a ${streakReward.streakRounds}-round perfect streak worth ${formatReward(
        streakReward.streakCandies,
      )} 🍬!\nClaimable: ${Math.floor(streakReward.streakCandies)} 🍬\n>Note: You'll lose the extra ${formatReward(
        streakReward.streakCandies - Math.floor(streakReward.streakCandies),
      )} 🍬. Consider guess more correct Axies until ${Math.ceil(streakReward.streakCandies)} 🍬 to maximize your claims!`
      response += `\n\nRounds ${streakReward.startRoundId}-${streakReward.endRoundId} • Click below to claim! 🎁`
    } else if (streakReward.alreadyClaimed) {
      response += `\n\n💰 **Previous Streak Claimed** 💰\n`
      response += `Your ${streakReward.streakRounds}-round streak (${formatReward(streakReward.streakCandies)} 🍬) has already been claimed.\n`
      response += `Keep playing to build a new streak for more rewards! 🎯`
    } else if (streakReward.currentRoundSkipped) {
      response += `\n\n💔 **STREAK BROKEN!** 💔\n`
      response += `You had a ${streakReward.streakRounds}-round streak but skipped round ${currentRoundId}!\n`
      response += `Your streak has been reset. Start playing again to build a new streak! 🎯`
    }

    // Prepare components (button if qualified and not claimed)
    const components = []
    if (streakReward.qualified && !streakReward.alreadyClaimed) {
      const button = new ButtonBuilder()
        .setCustomId(
          `claim_streak_reward:${interaction.user.id}:${streakReward.streakCandies}:${streakReward.streakRounds}:${streakReward.startRoundId}:${streakReward.endRoundId}`,
        )
        .setLabel(`Claim ${formatReward(Math.floor(streakReward.streakCandies))} 🍬`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('🍬')

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)
      components.push(row)
    }

    // Split response if too long for Discord
    if (response.length > 2000) {
      await interaction.editReply({ content: stats, components })

      // Send additional content in follow-up
      const additionalContent = `${recentHistory}\n\n${
        claimHistory.length > 0 ? rewardService.formatClaimHistory(claimHistory) + '\n\n' : ''
      }${formatStreakQualificationDetails(streakReward.details)}`

      if (additionalContent.trim()) {
        await interaction.followUp({ content: additionalContent, ephemeral: true })
      }
    } else {
      await interaction.editReply({ content: response, components })
    }
  } catch (error) {
    console.error('Error fetching guess history:', error)
    await interaction.editReply('Sorry, there was an error fetching your guess history!')
  }
}
