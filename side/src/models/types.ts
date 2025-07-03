// Database model types
export type Axie = {
  id: string
  name: string
  isRevealed: boolean
  updatedAt: string
}

export type User = {
  id: string
  score: number
  globalName: string
  correctGuesses: number
  longestStreak: number
  currentStreak: number
  updatedAt: string
}

export type Round = {
  id: number
  axieId: string
  status: 'happening' | 'finished'
  createdAt: string
}

export type RoundUser = {
  id: string
  roundId: string
  userId: string
  guess: string
  isCorrect: boolean
  candiesWon: number
}

// Game-related types
export type GameResult = {
  totalGuesses: number
  estimatedReward: number
  correctGuesses: RoundUser[]
  streakMessages: string[]
}

export type UserStats = {
  totalRounds: number
  correctGuesses: number
  currentStreak: number
  longestStreak: number
  totalCandies: number
}

export type StreakInfo = {
  roundId: string
  streak: number
  missedRounds?: number[]
}

// Legacy types (keep for backward compatibility)
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

export const UNDERWATER_TYPES = {
  FISH: 'fish',
  TRASH: 'trash',
  NFT: 'nft',
} as const

export const FISH_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const

export const ROD_TYPES = ['normal', 'collector', 'bald'] as const

export const EVENT_STATUS = ['pending', 'active', 'ended'] as const
