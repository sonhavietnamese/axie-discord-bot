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

export enum FishingEventStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  ENDED = 'ended',
}

export type FishingEventHappening = {
  channelId: string
  startTime: number
  endTime: number
  status: FishingEventStatus
}
