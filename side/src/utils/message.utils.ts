import { formatReward } from '../libs/utils'
import type { UserStats } from '../models/types'
import { detectSkippedRounds } from './streak.utils'

export function formatGameResult(
  axieName: string,
  axieSound: string,
  axieEmoji: string,
  totalGuesses: number,
  estimatedReward: number,
  correctGuesses: any[],
  streakMessages: string[],
): string {
  let content = `🎉 It's **${axieName}**!\n_${axieEmoji} ${axieSound}_\n\n- Total guesses: ${totalGuesses}\n- Pot: ${estimatedReward} 🍬\n\nCorrect guess: \n${correctGuesses
    .map((guess, index) => {
      const streakDisplay = guess.currentStreak > 0 ? ` (🔥${guess.currentStreak})` : ''
      return `${index + 1}. <@${guess.userId}> - ${formatReward(guess.candiesWon)} 🍬${streakDisplay}`
    })
    .join('\n')}`

  if (streakMessages.length > 0) {
    content += '\n\n**HALL OF LAME (STREAK CASUALTIES):**\n' + streakMessages.join('\n')
  }

  return content
}

export function formatUserStats(stats: UserStats): string {
  return `**📊 Your Stats:**\n` + `• Current Streak: ${stats.currentStreak}\n` + `• Longest Streak: ${stats.longestStreak}\n`
}

export function formatGuessHistory(guesses: any[], axieNames: Record<string, string>, currentRoundId?: number): string[] {
  // Create a comprehensive history including skipped rounds and current round
  const roundsWithSkips = detectSkippedRounds(guesses, currentRoundId)
  const guessLookup = new Map(guesses.map((g) => [parseInt(g.roundId), g]))

  return roundsWithSkips
    .slice(0, 10)
    .map((round) => {
      if (round.type === 'skipped') {
        const isCurrentRound = currentRoundId && round.roundId === currentRoundId
        return `**Round #${round.roundId}**: ⏭️ **SKIPPED**${isCurrentRound ? ' (CURRENT)' : ''}
*You didn't participate in this round${isCurrentRound ? ' - Streak broken!' : ''}*`
      } else {
        const guess = guessLookup.get(round.roundId)
        if (!guess) return ''

        const result = guess.isCorrect ? '✅' : '❌'
        const candyInfo = guess.isCorrect ? ` (${formatReward(guess.candiesWon)} 🍬)` : ''

        // Add streak information if available
        let streakInfo = ''
        if (guess.streakAtTime) {
          if (guess.streakAtTime.streak > 0) {
            streakInfo = ` [🔥${guess.streakAtTime.streak} streak]`
          }
          if (guess.streakAtTime.missedRounds && guess.streakAtTime.missedRounds.length > 0) {
            streakInfo += ` ⚠️ Previous skipped: ${guess.streakAtTime.missedRounds.join(', ')}`
          }
        }

        return `**Round #${guess.roundId}**: ${result}${streakInfo}
**Answer:** ${axieNames[guess.axieId]} - **Your guess:** ${guess.guess}${candyInfo}`
      }
    })
    .filter((line) => line !== '')
}

export function formatStreakReward(streak: number): string {
  return `🔥 **STREAK MASTER!** 🔥\n\nYou're on fire with a **${streak} streak**!\n\n*Special rewards are coming your way... 👀*`
}

export function formatStreakQualificationDetails(details: string): string {
  return `\n📋 **Streak Analysis:** ${details}`
}
