import { logger } from 'robo.js'
import { CURRENCY_ID, REALM_ID } from '../constants'

type DripUser = {
  id: string
  joinedAt: string
  realmMemberId: string
  username: string
  displayName: string
  imageUrl: string
  about: string
  alias: string
  balances: {
    balance: number
    currencyId: string
    currencyName: string
    currencyEmoji: string
  }[]
}

type DripUserResponse = {
  data: DripUser[]
}

/**
 * Find a Drip user by their Discord ID
 */
export async function getDripUserByDiscordId(discordId: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const dripUserResponse = await fetch(`https://api.drip.re/api/v1/realms/${REALM_ID}/members/search?type=discord-id&values=${discordId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.DRIP_API_KEY}`,
      },
    })

    if (!dripUserResponse.ok) {
      logger.warn(`Failed to search for Drip user ${discordId}: ${dripUserResponse.status} ${dripUserResponse.statusText}`)
      return { success: false, error: `API request failed: ${dripUserResponse.status}` }
    }

    const dripUser = (await dripUserResponse.json()) as DripUserResponse
    const user = dripUser.data[0]

    if (!user) {
      logger.warn(`User ${discordId} not found in Drip`)
      return { success: false, error: 'User not found in Drip system' }
    }

    return { success: true, userId: user.id }
  } catch (error) {
    logger.error('Error searching for Drip user:', error)
    return { success: false, error: 'Network or API error' }
  }
}

/**
 * Update a user's candy balance in Drip
 * @param dripUserId - The Drip user ID (not Discord ID)
 * @param amount - Amount to add (positive) or subtract (negative)
 */
export async function updateCandyBalance(dripUserId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  try {
    const dripResponse = await fetch(`https://api.drip.re/api/v1/realms/${REALM_ID}/members/${dripUserId}/balance`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.DRIP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currencyId: CURRENCY_ID,
      }),
    })

    if (!dripResponse.ok) {
      logger.warn(`Failed to update Drip balance for user ${dripUserId}: ${dripResponse.status} ${dripResponse.statusText}`)
      return { success: false, error: `Balance update failed: ${dripResponse.status}` }
    }

    logger.info(`[drip][update-balance][ok][drip-id-${dripUserId}][amount-${amount}]`)
    return { success: true }
  } catch (error) {
    logger.error(`[drip][update-balance][error][drip-id-${dripUserId}][amount-${amount}][error-${error}]`)
    return { success: false, error: 'Network or API error' }
  }
}

/**
 * Complete transaction: find user and update their balance
 * @param discordId - Discord user ID
 * @param amount - Amount to add (positive) or subtract (negative)
 */
export async function processPayment(discordId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  // First, find the user
  const userResult = await getDripUserByDiscordId(discordId)
  if (!userResult.success || !userResult.userId) {
    return { success: false, error: userResult.error || 'User not found' }
  }

  // Then update their balance
  const balanceResult = await updateCandyBalance(userResult.userId, amount)
  if (!balanceResult.success) {
    return { success: false, error: balanceResult.error || 'Balance update failed' }
  }

  logger.info(`[drip][process-payment][ok][discord-id-${discordId}][amount-${amount}]`)
  return { success: true }
}

/**
 * Get user's candy balance
 */
export async function getCandyBalance(discordId: string): Promise<number> {
  try {
    const dripUserResponse = await fetch(`https://api.drip.re/api/v1/realms/${REALM_ID}/members/search?type=discord-id&values=${discordId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.DRIP_API_KEY}`,
      },
    })

    const dripUser = (await dripUserResponse.json()) as DripUserResponse
    const user = dripUser.data[0]
    if (!user) {
      logger.warn(`[drip][get-balance][error][discord-id-${discordId}][error-user-not-found]`)
      return 0
    }

    const candyBalance = user.balances.find((balance) => balance.currencyId === CURRENCY_ID)?.balance
    return candyBalance || 0
  } catch (dripError) {
    logger.error(`[drip][get-balance][error][discord-id-${discordId}][error-${dripError}]`)
    // Don't fail the main operation if Drip API fails
  }
  return 0
}
