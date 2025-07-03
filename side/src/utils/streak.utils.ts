import type { StreakInfo } from '../models/types'
import { rewardService } from '../services/reward.service'

export function calculateStreakHistory(sortedGuesses: Array<{ roundId: string; isCorrect: boolean }>): StreakInfo[] {
  const streakHistory: StreakInfo[] = []
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

export function generateStreakBlameMessages(userId: string, streakType: 'missed' | 'broken', context: { streak?: number; roundId?: number }): string {
  if (streakType === 'missed' && context.streak && context.roundId) {
    const missedRoundBlames = [
      `💔 <@${userId}> had a ${context.streak}-streak but missed round ${context.roundId}! Streak reset! 😢`,
      `🏃‍♂️ <@${userId}> went AWOL during round ${context.roundId} and lost their ${context.streak}-streak! 🤦‍♂️`,
      `😴 <@${userId}> took a nap during round ${context.roundId} and their ${context.streak}-streak went poof! 💨`,
      `🎯 <@${userId}> was correct but skipped round ${context.roundId}! ${context.streak}-streak broken! ⛓️‍💥`,
    ]
    return missedRoundBlames[Math.floor(Math.random() * missedRoundBlames.length)]
  }

  if (streakType === 'broken') {
    const blameMessages = [
      `💀 RIP <@${userId}>'s streak! Had 2 in a row and fumbled the bag! 🤦‍♂️`,
      `😭 <@${userId}> was SO CLOSE to glory but choked at the finish line! 2-streak gone! 💔`,
      `🤡 <@${userId}> really thought they were the main character with that 2-streak... NOPE! 🎪`,
      `⚰️ Press F for <@${userId}>'s 2-streak. Gone but not forgotten... Actually, we're laughing! 😂`,
      `🎭 <@${userId}> peaked at 2 and said "nah, I'm good" 🤷‍♂️ What a legend!`,
    ]
    return blameMessages[Math.floor(Math.random() * blameMessages.length)]
  }

  return ''
}

// Updated function to properly detect skipped rounds and consecutive participation, excluding claimed rounds
export async function checkStreakRewardQualification(
  userId: string,
  userGuesses: Array<{ roundId: string; isCorrect: boolean; candiesWon: number }>,
  currentRoundId?: number,
): Promise<{
  qualified: boolean
  streakCandies: number
  streakRounds: number
  details: string
  startRoundId?: number
  endRoundId?: number
  alreadyClaimed?: boolean
  currentRoundSkipped?: boolean
}> {
  if (userGuesses.length < 3) {
    return {
      qualified: false,
      streakCandies: 0,
      streakRounds: 0,
      details: 'Need at least 3 guesses to qualify for streak rewards',
    }
  }

  // Get the last claimed reward to know where to start counting from
  const lastClaim = await rewardService.getLastClaimedReward(userId)
  const lastClaimedRoundId = lastClaim ? lastClaim.endRoundId : 0

  // Filter out rounds that were already claimed
  const unclaimedGuesses = userGuesses.filter((guess) => parseInt(guess.roundId) > lastClaimedRoundId)

  if (unclaimedGuesses.length < 3) {
    return {
      qualified: false,
      streakCandies: 0,
      streakRounds: 0,
      details: lastClaim
        ? `Only ${unclaimedGuesses.length} rounds since last claim (need 3+). Last claimed: Rounds ${lastClaim.startRoundId}-${lastClaim.endRoundId}`
        : 'Need at least 3 unclaimed guesses to qualify',
    }
  }

  // Sort guesses by round ID to check for consecutive participation
  const sortedGuesses = [...unclaimedGuesses].sort((a, b) => parseInt(a.roundId) - parseInt(b.roundId))

  // Check if user skipped the current round (if provided)
  const lastParticipatedRound = Math.max(...sortedGuesses.map((g) => parseInt(g.roundId)))
  const currentRoundSkipped = !!(currentRoundId && currentRoundId > lastParticipatedRound)

  // Check for any gaps in the sequence that would break streaks
  const participatedRounds = new Set(sortedGuesses.map((g) => parseInt(g.roundId)))
  const minRound = Math.min(...sortedGuesses.map((g) => parseInt(g.roundId)))
  const maxRound = Math.max(...sortedGuesses.map((g) => parseInt(g.roundId)))

  // Find all gaps in the sequence
  const gaps: number[] = []
  for (let i = minRound + 1; i <= maxRound; i++) {
    if (!participatedRounds.has(i)) {
      gaps.push(i)
    }
  }

  let maxStreakCandies = 0
  let maxStreakRounds = 0
  let currentStreakCandies = 0
  let currentStreakRounds = 0
  let previousRoundId = lastClaimedRoundId // Start from last claimed round
  let bestStreakStart = 0
  let bestStreakEnd = 0

  for (const guess of sortedGuesses) {
    const roundId = parseInt(guess.roundId)

    // Check if this round is consecutive (no gaps) and guess is correct
    const isConsecutive = previousRoundId === lastClaimedRoundId || roundId === previousRoundId + 1

    if (guess.isCorrect && isConsecutive) {
      // Continue or start streak
      if (currentStreakRounds === 0) {
        // Starting new streak, record start
        bestStreakStart = roundId
      }
      currentStreakCandies += guess.candiesWon
      currentStreakRounds += 1
    } else {
      // Streak broken due to incorrect guess or gap in rounds
      if (currentStreakRounds >= 3) {
        // Check if this is the best streak so far
        if (currentStreakRounds > maxStreakRounds || (currentStreakRounds === maxStreakRounds && currentStreakCandies > maxStreakCandies)) {
          maxStreakCandies = currentStreakCandies
          maxStreakRounds = currentStreakRounds
          bestStreakEnd = previousRoundId
        }
      }

      // Reset current streak
      if (guess.isCorrect) {
        currentStreakCandies = guess.candiesWon
        currentStreakRounds = 1
        bestStreakStart = roundId
      } else {
        currentStreakCandies = 0
        currentStreakRounds = 0
      }
    }

    previousRoundId = roundId
  }

  // Check final streak - but if current round is skipped, it breaks the streak
  if (currentStreakRounds >= 3 && !currentRoundSkipped) {
    if (currentStreakRounds > maxStreakRounds || (currentStreakRounds === maxStreakRounds && currentStreakCandies > maxStreakCandies)) {
      maxStreakCandies = currentStreakCandies
      maxStreakRounds = currentStreakRounds
      bestStreakEnd = previousRoundId
    }
  } else if (currentRoundSkipped && currentStreakRounds >= 3) {
    // Streak was valid but broken by skipping current round
    bestStreakEnd = previousRoundId
    // Keep the streak data but mark as not qualified due to current skip
  }

  // Additional check: if there are any gaps between the best streak start and the last participated round, invalidate it
  if (maxStreakRounds >= 3 && bestStreakStart && bestStreakEnd) {
    // Check for gaps within the streak itself
    for (let i = bestStreakStart + 1; i <= bestStreakEnd; i++) {
      if (!participatedRounds.has(i)) {
        // Gap found in the streak, invalidate it
        maxStreakRounds = 0
        maxStreakCandies = 0
        break
      }
    }

    // Also check for gaps between the end of the streak and the last participated round
    if (maxStreakRounds >= 3 && bestStreakEnd < lastParticipatedRound) {
      for (let i = bestStreakEnd + 1; i <= lastParticipatedRound; i++) {
        if (!participatedRounds.has(i)) {
          // Gap found after the streak, invalidate it
          maxStreakRounds = 0
          maxStreakCandies = 0
          break
        }
      }
    }

    // CRITICAL: Check if the streak is still "active" (no failed rounds after it ended)
    // A streak is only claimable if it's the user's most recent consecutive success
    if (maxStreakRounds >= 3 && bestStreakEnd < lastParticipatedRound) {
      // Check if there are any failed rounds after the streak ended
      const roundsAfterStreak = sortedGuesses.filter((g) => parseInt(g.roundId) > bestStreakEnd)
      const hasFailedRoundsAfterStreak = roundsAfterStreak.some((g) => !g.isCorrect)

      if (hasFailedRoundsAfterStreak) {
        // User failed a round after the streak ended, invalidate it
        maxStreakRounds = 0
        maxStreakCandies = 0
      }
    }
  }

  // Check if this specific streak has already been claimed
  let alreadyClaimed = false
  if (maxStreakRounds >= 3) {
    alreadyClaimed = await rewardService.hasClaimedStreak(userId, bestStreakStart, bestStreakEnd)
  }

  let details = ''
  if (maxStreakRounds >= 3) {
    if (currentRoundSkipped) {
      details = `Streak broken by skipping current round ${currentRoundId}! Previous streak: Rounds ${bestStreakStart}-${bestStreakEnd} (${maxStreakRounds} consecutive rounds)`
    } else if (alreadyClaimed) {
      details = `Streak already claimed: Rounds ${bestStreakStart}-${bestStreakEnd} (${maxStreakRounds} consecutive rounds)`
    } else {
      details = `Current claimable streak: Rounds ${bestStreakStart}-${bestStreakEnd} (${maxStreakRounds} consecutive rounds)`
      if (lastClaim) {
        details += ` • Since last claim: Round ${lastClaim.endRoundId}`
      }
    }
  } else {
    // Analyze why they don't qualify
    const issues = []
    let hasGaps = false
    let hasIncorrect = false
    let hasFailedAfterStreak = false
    let maxConsecutiveCorrect = 0
    let tempConsecutive = 0
    let tempPreviousRound = lastClaimedRoundId
    let tempBestStreakEnd = 0

    // First pass: find the best streak
    for (const guess of sortedGuesses) {
      const roundId = parseInt(guess.roundId)
      const isConsecutive = tempPreviousRound === lastClaimedRoundId || roundId === tempPreviousRound + 1

      if (!isConsecutive && tempPreviousRound > lastClaimedRoundId) {
        hasGaps = true
        tempConsecutive = 0
      }

      if (guess.isCorrect && isConsecutive) {
        tempConsecutive += 1
        if (tempConsecutive > maxConsecutiveCorrect) {
          maxConsecutiveCorrect = tempConsecutive
          tempBestStreakEnd = roundId
        }
      } else {
        if (!guess.isCorrect) hasIncorrect = true
        tempConsecutive = guess.isCorrect ? 1 : 0
      }

      tempPreviousRound = roundId
    }

    // Second pass: check if there are failed rounds after the best streak
    if (tempBestStreakEnd > 0) {
      const roundsAfterBestStreak = sortedGuesses.filter((g) => parseInt(g.roundId) > tempBestStreakEnd)
      hasFailedAfterStreak = roundsAfterBestStreak.some((g) => !g.isCorrect)
    }

    if (maxConsecutiveCorrect < 3) {
      issues.push(`Max consecutive correct: ${maxConsecutiveCorrect} (need 3+)`)
    }
    if (hasGaps || gaps.length > 0) {
      issues.push('Skipped rounds detected')
    }
    if (hasIncorrect) {
      issues.push('Incorrect guesses break streaks')
    }
    if (hasFailedAfterStreak) {
      issues.push('Failed rounds after streak invalidate it')
    }
    if (currentRoundSkipped) {
      issues.push(`Current round ${currentRoundId} skipped`)
    }

    details = `Not qualified: ${issues.join(', ')}`
    if (lastClaim) {
      details += ` • Since last claim: Round ${lastClaim.endRoundId}`
    }
  }

  return {
    qualified: maxStreakRounds >= 3 && !alreadyClaimed && !currentRoundSkipped,
    streakCandies: maxStreakCandies,
    streakRounds: maxStreakRounds,
    details,
    startRoundId: bestStreakStart,
    endRoundId: bestStreakEnd,
    alreadyClaimed,
    currentRoundSkipped,
  }
}

// Updated function to detect skipped rounds including current round
export function detectSkippedRounds(
  userGuesses: Array<{ roundId: string }>,
  currentRoundId?: number,
): Array<{ roundId: number; type: 'participated' | 'skipped' }> {
  if (userGuesses.length === 0 && !currentRoundId) return []

  const participatedRounds = userGuesses.map((g) => parseInt(g.roundId)).sort((a, b) => b - a) // Descending
  const result: Array<{ roundId: number; type: 'participated' | 'skipped' }> = []

  // Determine the range to check
  let maxRound = participatedRounds.length > 0 ? participatedRounds[0] : 0
  const minRound = participatedRounds.length > 0 ? participatedRounds[participatedRounds.length - 1] : currentRoundId || 1

  // If current round is provided and greater than max participated round, include it
  if (currentRoundId && currentRoundId > maxRound) {
    maxRound = currentRoundId
  }

  const participatedSet = new Set(participatedRounds)

  for (let roundId = maxRound; roundId >= minRound; roundId--) {
    if (participatedSet.has(roundId)) {
      result.push({ roundId, type: 'participated' })
    } else {
      result.push({ roundId, type: 'skipped' })
    }
  }

  return result
}
