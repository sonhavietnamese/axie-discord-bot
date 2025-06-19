import { RANKS } from './ranks'
import { UNDERWATER_TYPES } from '../types'

export const TRASHES = [
  {
    id: '001',
    name: 'The Rock',
    rank: RANKS.USELESS,
    image: `object-001`,
    description: `asd`,
    emoji: '<:000:1384888991370706954>',
    price: 0,
  },
].map((trash) => ({
  ...trash,
  type: UNDERWATER_TYPES.TRASH,
}))
