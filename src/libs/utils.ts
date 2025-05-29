import { type Player } from '../core/players'
import { ADMINS } from '../core/admin'
import { ChatInputCommandInteraction } from 'discord.js'

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
