import { RANKS } from './ranks'
import { UNDERWATER_TYPES } from '../types'

export const FISHES = [
  {
    id: '001',
    name: 'Anchovy',
    rank: RANKS.COMMON,
    image: 'fish-001',
    description: 'Anchovy is a small fish that is often found in the ocean. It is a good source of protein and omega-3 fatty acids.',
    price: 1 / 3,
    emoji: '<:001:1384889012141031484>',
  },
  {
    id: '002',
    name: 'Puffer',
    rank: RANKS.EPIC,
    image: 'fish-002',
    description: 'Puffer is a Dopamine Ball of the ocean. Dont make it mad, he will explode!',
    price: 1 / 3,
    emoji: '<:002:1384889024941916210>',
  },
  {
    id: '003',
    name: 'Medis',
    rank: RANKS.LEGENDARY,
    image: 'fish-003',
    description: 'Who hit him hard?',
    price: 1 / 2,
    emoji: '<:003:1384889045674492048>',
  },
  {
    id: '004',
    name: 'Koi',
    rank: RANKS.MYTHIC,
    image: 'fish-004',
    description: 'Koi fish are vibrant, graceful swimmers that bring good fortune and serenity.',
    price: 2,
    emoji: '<:004:1384889035155181772>',
  },
  {
    id: '005',
    name: 'Zebra King',
    rank: RANKS.SUPREME,
    image: 'fish-005',
    description: '👑👑👑👑👑👑👑',
    price: 3,
    emoji: '<:005:1384889057430999130>',
  },
  {
    id: '006',
    name: 'Monster',
    rank: RANKS.MONSTER,
    image: 'fish-006',
    description: 'Grrrr^%$@!#)(* GRRR)(*!@&@@@#)(@*',
    price: 5,
    emoji: '<:006:1384889069091295273>',
  },
].map((fish) => ({
  ...fish,
  type: UNDERWATER_TYPES.FISH,
}))
