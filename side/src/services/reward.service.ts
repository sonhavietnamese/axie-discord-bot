import { eq, and, desc } from 'drizzle-orm'
import { db } from '../libs/database'
import { claimedRewardsTable } from '../schema'
import type { ClaimedReward, NewClaimedReward } from '../schema'
import { randomUUID } from 'crypto'

export class RewardService {
  async getLastClaimedReward(userId: string): Promise<ClaimedReward | null> {
    const [lastClaim] = await db
      .select()
      .from(claimedRewardsTable)
      .where(eq(claimedRewardsTable.userId, userId))
      .orderBy(desc(claimedRewardsTable.claimedAt))
      .limit(1)

    return lastClaim || null
  }

  async getAllClaimedRewards(userId: string): Promise<ClaimedReward[]> {
    return await db.select().from(claimedRewardsTable).where(eq(claimedRewardsTable.userId, userId)).orderBy(desc(claimedRewardsTable.claimedAt))
  }

  async claimReward(
    userId: string,
    streakRounds: number,
    streakCandies: number,
    startRoundId: number,
    endRoundId: number,
    rewardType: string,
    rewardDetails: any,
  ): Promise<ClaimedReward> {
    const newClaim: NewClaimedReward = {
      id: randomUUID(),
      userId,
      streakRounds,
      streakCandies,
      startRoundId,
      endRoundId,
      rewardType,
      rewardDetails: JSON.stringify(rewardDetails),
    }

    const [claimedReward] = await db.insert(claimedRewardsTable).values(newClaim).returning()

    return claimedReward
  }

  async hasClaimedStreak(userId: string, startRoundId: number, endRoundId: number): Promise<boolean> {
    const existing = await db
      .select()
      .from(claimedRewardsTable)
      .where(
        and(
          eq(claimedRewardsTable.userId, userId),
          eq(claimedRewardsTable.startRoundId, startRoundId),
          eq(claimedRewardsTable.endRoundId, endRoundId),
        ),
      )
      .limit(1)

    return existing.length > 0
  }

  async getClaimHistory(userId: string, limit: number = 5): Promise<Array<ClaimedReward & { formattedDetails: any }>> {
    const claims = await this.getAllClaimedRewards(userId)

    return claims.slice(0, limit).map((claim) => ({
      ...claim,
      formattedDetails: claim.rewardDetails ? JSON.parse(claim.rewardDetails) : null,
    }))
  }

  formatClaimHistory(claims: Array<ClaimedReward & { formattedDetails: any }>): string {
    if (claims.length === 0) {
      return '📜 **Claim History:** No rewards claimed yet!'
    }

    const historyLines = claims.map((claim, index) => {
      const rewardIcon = this.getRewardIcon(claim.rewardType)
      const timeAgo = this.getTimeAgo(claim.claimedAt)

      return `${index + 1}. ${rewardIcon} **${claim.rewardType}** - ${Math.floor(claim.streakCandies)} 🍬
   📅 Rounds ${claim.startRoundId}-${claim.endRoundId} (${claim.streakRounds} streak) • ${timeAgo}`
    })

    return `📜 **Claim History:**\n${historyLines.join('\n')}`
  }

  private getRewardIcon(rewardType: string): string {
    switch (rewardType) {
      case 'NFT':
        return '🎨'
      case 'Premium Currency':
        return '💎'
      case 'VIP Access':
        return '⭐'
      default:
        return '🎁'
    }
  }

  private getTimeAgo(timestamp: string): string {
    const now = new Date()
    const claimTime = new Date(timestamp)
    const diffMs = now.getTime() - claimTime.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }
}

export const rewardService = new RewardService()
