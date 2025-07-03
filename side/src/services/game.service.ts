import { and, count, eq, inArray } from 'drizzle-orm'
import { db } from '../libs/database'
import { axiesTable, roundsTable, roundUsersTable, usersTable } from '../schema'
import { formatReward } from '../libs/utils'
import type { Axie, User } from '../models/types'
import type { NewRoundUser, RoundUser } from '../schema'

export class GameService {
  async createRound(axieId: string) {
    const [round] = await db.insert(roundsTable).values({ axieId, status: 'happening' }).returning()
    return round
  }

  async finishRound(roundId: number): Promise<void> {
    await db.update(roundsTable).set({ status: 'finished' }).where(eq(roundsTable.id, roundId))
  }

  async revealAxie(axieId: string): Promise<void> {
    await db.update(axiesTable).set({ isRevealed: true }).where(eq(axiesTable.id, axieId))
  }

  async getGuesses(roundId: number): Promise<RoundUser[]> {
    return await db.select().from(roundUsersTable).where(eq(roundUsersTable.roundId, roundId.toString()))
  }

  async getCorrectGuesses(roundId: number): Promise<RoundUser[]> {
    return await db
      .select()
      .from(roundUsersTable)
      .where(and(eq(roundUsersTable.roundId, roundId.toString()), eq(roundUsersTable.isCorrect, true)))
  }

  async getTotalGuesses(roundId: number): Promise<number> {
    const result = await db.select({ count: count() }).from(roundUsersTable).where(eq(roundUsersTable.roundId, roundId.toString()))
    return result[0].count
  }

  async calculateRewards(roundId: number): Promise<{ totalGuesses: number; estimatedReward: number; candiesPerCorrectGuess: number }> {
    const totalGuesses = await this.getTotalGuesses(roundId)
    const estimatedReward = Math.ceil(totalGuesses / 2)
    const correctGuesses = await this.getCorrectGuesses(roundId)
    const candiesPerCorrectGuess = correctGuesses.length > 0 ? estimatedReward / correctGuesses.length : 0

    return { totalGuesses, estimatedReward, candiesPerCorrectGuess }
  }

  async getLiveGameStats(roundId: number): Promise<{ participantCount: number; potSize: number }> {
    const totalGuesses = await this.getTotalGuesses(roundId)
    const potSize = Math.ceil(totalGuesses / 2)

    return { participantCount: totalGuesses, potSize }
  }

  async updateRewards(roundId: number, candiesPerCorrectGuess: number): Promise<void> {
    if (candiesPerCorrectGuess > 0) {
      await db
        .update(roundUsersTable)
        .set({ candiesWon: candiesPerCorrectGuess })
        .where(and(eq(roundUsersTable.roundId, roundId.toString()), eq(roundUsersTable.isCorrect, true)))
    }
  }

  async getCorrectGuessesWithStreaks(roundId: number) {
    return await db
      .select({
        id: roundUsersTable.id,
        roundId: roundUsersTable.roundId,
        userId: roundUsersTable.userId,
        guess: roundUsersTable.guess,
        isCorrect: roundUsersTable.isCorrect,
        candiesWon: roundUsersTable.candiesWon,
        currentStreak: usersTable.currentStreak,
        globalName: usersTable.globalName,
      })
      .from(roundUsersTable)
      .innerJoin(usersTable, eq(roundUsersTable.userId, usersTable.id))
      .where(and(eq(roundUsersTable.roundId, roundId.toString()), eq(roundUsersTable.isCorrect, true)))
  }

  async getPreviousRoundParticipants(roundId: number): Promise<Set<string>> {
    const previousRoundId = roundId - 1
    if (previousRoundId <= 0) return new Set()

    const participants = await db
      .select({ userId: roundUsersTable.userId })
      .from(roundUsersTable)
      .where(eq(roundUsersTable.roundId, previousRoundId.toString()))

    return new Set(participants.map((p) => p.userId))
  }

  formatCorrectGuesses(correctGuesses: any[]): string {
    return correctGuesses
      .map((guess, index) => {
        const streakDisplay = guess.currentStreak > 0 ? ` (🔥${guess.currentStreak} streak)` : ''
        return `${index + 1}. <@${guess.userId}> - ${formatReward(guess.candiesWon)} candy${streakDisplay}`
      })
      .join('\n')
  }
}

export const gameService = new GameService()
