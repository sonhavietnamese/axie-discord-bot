import { type Player } from '../core/players'
import { ADMINS } from '../core/admin'
import { ChatInputCommandInteraction } from 'discord.js'
import { Flashcore } from 'robo.js'
import { LastHit, Warrior } from '../types'
import { CARD_IMAGE_LOOKUP } from '../constants'

export function matchUpPlayers(players: Player[]): Player[][] {
  const matchUps: Player[][] = []
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5)

  for (let i = 0; i < shuffledPlayers.length; i += 2) {
    if (i + 1 < shuffledPlayers.length) {
      matchUps.push([shuffledPlayers[i], shuffledPlayers[i + 1]])
    } else {
      matchUps.push([shuffledPlayers[i]])
    }
  }

  return matchUps
}

export function computeCDNUrl(asset: string) {
  if (asset.startsWith('/')) {
    return `${process.env.CDN_URL}${asset}`
  }

  return `${process.env.CDN_URL}/${asset}`
}

export function isAdmin(userId: string) {
  return ADMINS.includes(userId)
}

export async function require<T extends ChatInputCommandInteraction>(condition: boolean, message: string, interaction: T) {
  if (!condition) {
    await interaction.reply({
      content: message,
      ephemeral: true,
    })
    return
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

export async function getLastHit(): Promise<LastHit | null> {
  return await Flashcore.get<LastHit>('chimera:last-hit')
}

export function formatLastHit(lastHit: LastHit): string {
  const timeAgo = Math.floor((Date.now() - lastHit.timestamp) / 1000)
  const timeFormat = timeAgo < 60 ? `${timeAgo}s ago` : timeAgo < 3600 ? `${Math.floor(timeAgo / 60)}m ago` : `${Math.floor(timeAgo / 3600)}h ago`

  return `**${lastHit.userName}** dealt **${abbreviateNumber(lastHit.damage, 2)}** ${lastHit.damageType} damage using **${
    lastHit.card
  }** (${timeFormat})`
}

export async function getLeaderboard(): Promise<{ id: string; name: string; totalDamage: number }[]> {
  const warriors = (await Flashcore.get<Warrior[]>('warriors')) || []

  const leaderboard: { id: string; name: string; totalDamage: number }[] = warriors
    .map((warrior) => ({
      id: warrior.id,
      name: warrior.name,
      totalDamage: warrior.damage.reduce((acc, curr) => acc + curr.damage, 0),
    }))
    .sort((a, b) => b.totalDamage - a.totalDamage)

  return leaderboard
}

export function getCardImage(card: string) {
  return `https://storage.googleapis.com/origin-production/assets/card/${CARD_IMAGE_LOOKUP[card]}.png`
}
