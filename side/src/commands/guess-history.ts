import { type ChatInputCommandInteraction } from 'discord.js'
import { eq, inArray, desc } from 'drizzle-orm'
import { createCommandConfig } from 'robo.js'
import { db } from '../libs/database'
import { roundsTable, roundUsersTable, axiesTable, usersTable } from '../schema'
import { formatReward } from '../libs/utils'

export const config = createCommandConfig({
  description: 'View your guess history',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: 64 })

  try {
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

    // Get axie names for all guesses using efficient batch query
    const axieIds = [...new Set(userGuesses.map((g) => g.axieId))]
    const axies = await db
      .select()
      .from(axiesTable)
      .where(axieIds.length === 1 ? eq(axiesTable.id, axieIds[0]) : inArray(axiesTable.id, axieIds))

    const axieNames = Object.fromEntries(axies.map((a) => [a.id, a.name]))

    // Get user's current stats
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, interaction.user.id))

    // Calculate streak information with consecutive round participation
    const sortedGuesses = [...userGuesses].sort((a, b) => parseInt(a.roundId) - parseInt(b.roundId))
    const streakInfo = calculateStreakHistory(sortedGuesses)

    let totalCandies = 0
    const historyLines = userGuesses.slice(0, 10).map((guess, index) => {
      const result = guess.isCorrect ? '✅ Correct' : '❌ Incorrect'
      const candyInfo = guess.isCorrect ? ` (${formatReward(guess.candiesWon)} candy)` : ''
      const streakAtTime = streakInfo.find((s) => s.roundId === guess.roundId)
      const streakDisplay = streakAtTime && streakAtTime.streak > 0 ? ` [🔥${streakAtTime.streak} streak]` : ''
      const missedRounds = streakAtTime?.missedRounds ? ` ⚠️ Missed: ${streakAtTime.missedRounds.join(', ')}` : ''

      totalCandies += guess.candiesWon

      return `**Round #${guess.roundId}**: ${result}${streakDisplay}
**Answer:** ${axieNames[guess.axieId]}
**Your guess:** ${guess.guess}${candyInfo}${missedRounds}`
    })

    const stats =
      `**📊 Your Stats:**\n` +
      `• Total Rounds Played: ${userGuesses.length}\n` +
      `• Correct Guesses: ${user?.correctGuesses || 0}\n` +
      `• Current Streak: ${user?.currentStreak || 0}\n` +
      `• Longest Streak: ${user?.longestStreak || 0}\n` +
      `• Total Candies Won: ${formatReward(totalCandies)}\n\n`

    const recentHistory =
      historyLines.length > 0 ? `**🕒 Recent History (Last ${Math.min(10, historyLines.length)} rounds):**\n\n${historyLines.join('\n\n')}` : ''

    const response = `${stats}${recentHistory}`

    // Split response if too long for Discord
    if (response.length > 2000) {
      await interaction.editReply(stats)
      if (recentHistory) {
        await interaction.followUp({ content: recentHistory, ephemeral: true })
      }
    } else {
      await interaction.editReply(response)
    }
  } catch (error) {
    console.error('Error fetching guess history:', error)
    await interaction.editReply('Sorry, there was an error fetching your guess history!')
  }
}

// Helper function to calculate streak history considering consecutive participation
function calculateStreakHistory(sortedGuesses: Array<{ roundId: string; isCorrect: boolean }>) {
  const streakHistory: Array<{ roundId: string; streak: number; missedRounds?: number[] }> = []
  let currentStreak = 0
  let previousRoundId = 0

  for (const guess of sortedGuesses) {
    const roundId = parseInt(guess.roundId)
    const missedRounds: number[] = []

    // Check for missed rounds (gaps in sequence)
    if (previousRoundId > 0 && roundId > previousRoundId + 1) {
      // There are missed rounds
      for (let i = previousRoundId + 1; i < roundId; i++) {
        missedRounds.push(i)
      }
      // Reset streak due to missed rounds
      if (currentStreak > 0) {
        currentStreak = 0
      }
    }

    if (guess.isCorrect) {
      if (missedRounds.length === 0) {
        // Consecutive participation
        currentStreak += 1
      } else {
        // Missed rounds, start new streak
        currentStreak = 1
      }
    } else {
      // Incorrect guess resets streak
      currentStreak = 0
    }

    streakHistory.push({
      roundId: guess.roundId,
      streak: currentStreak,
      missedRounds: missedRounds.length > 0 ? missedRounds : undefined,
    })

    previousRoundId = roundId
  }

  return streakHistory
}
