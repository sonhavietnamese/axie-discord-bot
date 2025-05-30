export type Warrior = {
  id: string
  name: string
  damage: {
    damage: number
    timestamp: number
  }[]
}

export type LastHit = {
  userId: string
  userName: string
  damage: number
  damageType: string
  card: string
  timestamp: number
  healthBefore: number
  healthAfter: number
}
