export type RewardType = 'candy' | 'rock' | 'fish'

export interface Reward {
  maxAmount: number
  rate: number
  id: string
}

export const CANDY_MACHINE_REWARDS: Record<RewardType, { rate: number; sub: Record<string, Reward> }> = {
  candy: {
    rate: 40,
    sub: {
      common: {
        maxAmount: 3,
        rate: 74,
        id: '001',
      },
      rare: {
        maxAmount: 8,
        rate: 20,
        id: '003',
      },
      epic: {
        maxAmount: 10,
        rate: 5,
        id: '005',
      },
      legendary: {
        maxAmount: 15,
        rate: 1,
        id: '006',
      },
    },
  },
  rock: {
    rate: 40,
    sub: {
      common: {
        maxAmount: 4,
        rate: 74,
        id: '001',
      },
      rare: {
        maxAmount: 8,
        rate: 20,
        id: '003',
      },
      epic: {
        maxAmount: 20,
        rate: 5,
        id: '005',
      },
      legendary: {
        maxAmount: 50,
        rate: 1,
        id: '006',
      },
    },
  },
  fish: {
    rate: 20,
    sub: {
      common: {
        maxAmount: 1,
        rate: 74,
        id: '001',
      },
      rare: {
        maxAmount: 1,
        rate: 20,
        id: '003',
      },
      epic: {
        maxAmount: 1,
        rate: 5,
        id: '005',
      },
      legendary: {
        maxAmount: 1,
        rate: 1,
        id: '006',
      },
    },
  },
}

// 3
