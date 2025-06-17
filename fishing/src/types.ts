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

export const UNDERWATER_TYPES = ['fish', 'trash', 'nft'] as const

export const FISH_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const

export const ROD_TYPES = ['normal', 'collector', 'bald'] as const

export const EVENT_STATUS = ['pending', 'active', 'ended'] as const
