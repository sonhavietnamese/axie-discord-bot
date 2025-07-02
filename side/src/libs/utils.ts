import { ChatInputCommandInteraction } from 'discord.js'
import { eq } from 'drizzle-orm'
import { CHANNELS, GUILDS } from '../configs/whitelist'
import { ADMINS } from '../configs/whitelist'
import { axiesTable } from '../schema'
import { db } from './database'

export function isAdmin(userId: string) {
  return ADMINS.includes(userId)
}

export function isWhitelisted(guildId: string | null, channelId: string) {
  if (!guildId || !GUILDS.includes(guildId) || !CHANNELS.includes(channelId)) {
    return false
  }

  return true
}

export async function require<T extends ChatInputCommandInteraction>(condition: boolean, message: string, interaction: T) {
  if (!condition) {
    await interaction.reply({
      content: message,
      ephemeral: true,
    })

    throw new Error(message)
  }
}

export function abbreviateNumber(n: number, decPlaces = 0, units: string[] = ['k', 'm', 'b', 't']): string | number {
  const isNegative = n < 0
  const abbreviatedNumber = _abbreviate(Math.abs(n), decPlaces, units)
  return isNegative ? `-${abbreviatedNumber}` : abbreviatedNumber
}

function _abbreviate(num: number, decimalPlaces: number, units: string[]): string | number {
  const factor = 10 ** decimalPlaces

  for (let i = units.length - 1; i >= 0; i--) {
    const size = 10 ** ((i + 1) * 3)

    if (size <= num) {
      let result = Math.round((num * factor) / size) / factor

      if (result === 1000 && i < units.length - 1) {
        result = 1
        i++
      }

      return `${result}${units[i]}`
    }
  }

  return num
}

export function hashCode(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    const character = name.charCodeAt(i)
    hash = (hash << 5) - hash + character
    hash = hash & hash
  }

  return Math.abs(hash)
}

export const generateRandomNumbers = (length: number = 3): number[] => {
  const numbers: number[] = []
  for (let i = 0; i < length; i++) {
    numbers.push(Math.floor(Math.random() * 5) + 1) // Random number 1-5
  }
  return numbers
}

export const pickAxie = async () => {
  let available = await db.select().from(axiesTable).where(eq(axiesTable.isRevealed, false))

  if (available.length === 0) return null

  const random = available[Math.floor(Math.random() * available.length)]

  return random
}

// format the reward to 2 decimal places
export const formatReward = (reward: number) => {
  return reward.toFixed(2)
}
