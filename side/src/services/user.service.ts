import { eq, inArray } from 'drizzle-orm'
import { db } from '../libs/database'
import { usersTable, roundUsersTable } from '../schema'
import type { User, RoundUser } from '../schema'

export class UserService {
  async getUsersByIds(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) return []

    return await db
      .select()
      .from(usersTable)
      .where(userIds.length === 1 ? eq(usersTable.id, userIds[0]) : inArray(usersTable.id, userIds))
  }

  async updateUserStats(userId: string, stats: Partial<User>): Promise<void> {
    await db
      .update(usersTable)
      .set({
        ...stats,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(usersTable.id, userId))
  }

  async batchUpdateUserStats(userUpdates: Record<string, Partial<User>>): Promise<void> {
    await db.transaction(async (tx) => {
      for (const [userId, updates] of Object.entries(userUpdates)) {
        await tx
          .update(usersTable)
          .set({
            ...updates,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(usersTable.id, userId))
      }
    })
  }

  async getUserGuessHistory(userId: string, limit: number = 10) {
    return await db
      .select({
        roundId: roundUsersTable.roundId,
        guess: roundUsersTable.guess,
        isCorrect: roundUsersTable.isCorrect,
        candiesWon: roundUsersTable.candiesWon,
        axieId: roundUsersTable.roundId, // Will need to join with rounds table
        createdAt: roundUsersTable.roundId, // Will need to join with rounds table
      })
      .from(roundUsersTable)
      .where(eq(roundUsersTable.userId, userId))
      .limit(limit)
  }

  calculateStreakUpdates(
    allGuesses: RoundUser[],
    allUsers: User[],
    previousRoundParticipants: Set<string>,
    previousRoundId: number,
  ): {
    userUpdates: Record<string, { currentStreak: number; longestStreak: number; correctGuesses: number }>
    streakMessages: string[]
    streakRewardUsers: string[]
  } {
    const streakMessages: string[] = []
    const userUpdates: Record<string, { currentStreak: number; longestStreak: number; correctGuesses: number }> = {}
    const streakRewardUsers: string[] = []

    const userLookup = new Map(allUsers.map((user) => [user.id, user]))

    for (const guess of allGuesses) {
      const user = userLookup.get(guess.userId)
      if (!user) continue

      let newCurrentStreak = user.currentStreak
      let newLongestStreak = user.longestStreak
      let newCorrectGuesses = user.correctGuesses

      const participatedInPreviousRound = previousRoundId <= 0 ? true : previousRoundParticipants.has(guess.userId)

      if (guess.isCorrect) {
        if (participatedInPreviousRound) {
          newCurrentStreak = user.currentStreak + 1
        } else {
          if (user.currentStreak >= 2) {
            const missedRoundBlames = [
              `💔 <@${guess.userId}> had a ${user.currentStreak}-streak but missed round ${previousRoundId}! Streak reset! <:kek:1390252002809872435>`,
            ]
            const randomMissedBlame = missedRoundBlames[Math.floor(Math.random() * missedRoundBlames.length)]
            streakMessages.push(randomMissedBlame)
          }
          newCurrentStreak = 1
        }

        newCorrectGuesses = user.correctGuesses + 1
        newLongestStreak = Math.max(user.longestStreak, newCurrentStreak)

        if (newCurrentStreak >= 3) {
          streakRewardUsers.push(guess.userId)
        }
      } else {
        if (user.currentStreak === 2) {
          const blameMessages = [`💀 <@${guess.userId}>`]
          const randomBlame = blameMessages[Math.floor(Math.random() * blameMessages.length)]
          streakMessages.push(randomBlame)
        }
        newCurrentStreak = 0
      }

      userUpdates[guess.userId] = {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        correctGuesses: newCorrectGuesses,
      }
    }

    return { userUpdates, streakMessages, streakRewardUsers }
  }
}

export const userService = new UserService()
