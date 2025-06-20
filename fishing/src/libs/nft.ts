import { MODS } from '../constants'

type SpecialPlayer = {
  id: string | null
  turn: number
  enabled: boolean
}

export const specialPlayer: SpecialPlayer = {
  id: null,
  turn: 2,
  enabled: false,
}

export function reset() {
  specialPlayer.id = null
  specialPlayer.turn = 2
  specialPlayer.enabled = false
}

export function randomPlayer(players: string[]) {
  let randomIndex
  do {
    randomIndex = Math.floor(Math.random() * players.length)
  } while (MODS.includes(players[randomIndex]))

  specialPlayer.id = players[randomIndex]
  specialPlayer.turn = 4
  specialPlayer.enabled = true
  console.log('specialPlayer', specialPlayer)
}
