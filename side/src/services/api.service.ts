import { rewardService } from './reward.service'
import { REALM_ID, CURRENCY_ID } from '../constants'
import { consoleDrain } from 'robo.js/dist/core/logger'

// API service for streak rewards using Drip API
export class ApiService {
  async claimStreakReward(
    userId: string,
    candies: number,
    streakRounds: number,
    startRoundId: number,
    endRoundId: number,
  ): Promise<{ success: boolean; message: string; reward?: any }> {
    // Check if this specific streak has already been claimed
    const alreadyClaimed = await rewardService.hasClaimedStreak(userId, startRoundId, endRoundId)

    if (alreadyClaimed) {
      return {
        success: false,
        message: '❌ This streak has already been claimed! You cannot claim the same streak twice.',
      }
    }

    try {
      // Find user in Drip by Discord ID
      const dripUserResponse = await fetch(`https://api.drip.re/api/v1/realms/${REALM_ID}/members/search?type=discord-id&values=${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.DRIP_API_KEY}`,
        },
      })

      // const dripUserResponse = await fetch(
      //   `https://api.drip.re/api/v1/realms/${REALM_ID}/members/search?type=discord-id&values=${interaction.user.id}`,
      //   {
      //     method: 'GET',
      //     headers: {
      //       Authorization: `Bearer ${process.env.DRIP_API_KEY}`,
      //     },
      //   },
      // )

      if (!dripUserResponse.ok) {
        console.error(`Failed to find user in Drip: ${dripUserResponse.status} ${dripUserResponse.statusText}`)
        return {
          success: false,
          message: '❌ Failed to find your account in the reward system. Please try again later.',
        }
      }

      const dripUser = (await dripUserResponse.json()) as { data: { id: string }[] }
      const user = dripUser.data[0]

      if (!user) {
        console.warn(`User ${userId} not found in Drip`)
        return {
          success: false,
          message: '❌ Your account was not found in the reward system. Please contact support.',
        }
      }

      console.log(user, process.env.DRIP_API_KEY)

      // Update balance via Drip API
      const dripResponse = await fetch(`https://api.drip.re/api/v1/realms/${REALM_ID}/members/${user.id}/balance`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.DRIP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.floor(candies),
          currencyId: CURRENCY_ID,
        }),
      })

      if (!dripResponse.ok) {
        console.error(`Failed to update Drip balance for user ${userId}: ${dripResponse.status} ${dripResponse.statusText}`)
        return {
          success: false,
          message: '❌ Failed to update your balance. Please try again later.',
        }
      }

      // Create reward data
      const reward = {
        type: 'Candies',
        amount: candies,
        streakRounds,
      }

      // Record the claim in the database
      await rewardService.claimReward(userId, streakRounds, candies, startRoundId, endRoundId, 'Candies', reward)

      // Log the successful API call
      console.log(`Streak reward claimed by user ${userId}:`, {
        streakRounds,
        candies,
        startRoundId,
        endRoundId,
        reward,
      })

      return {
        success: true,
        message: `🎉 Congratulations! You've successfully claimed ${Math.floor(
          candies,
        )} candies from your ${streakRounds}-round streak! Your balance has been updated.`,
        reward,
      }
    } catch (error) {
      console.error('Error claiming streak reward:', error)
      return {
        success: false,
        message: '❌ An error occurred while claiming your reward. Please try again later.',
      }
    }
  }
}

export const apiService = new ApiService()
