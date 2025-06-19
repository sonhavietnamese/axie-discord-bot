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
  const randomIndex = Math.floor(Math.random() * players.length)
  specialPlayer.id = players[randomIndex]
  specialPlayer.turn = 4
  specialPlayer.enabled = true
  console.log('specialPlayer', specialPlayer)
}
