import { UNDERWATER_TYPES } from '../types'
import { RANKS } from './ranks'

export const NFTs = [
  {
    id: '12114085',
    name: 'Axie #12114085',
    rank: RANKS.NFT,
    image: `axie-12114085`,
    description: `https://app.axieinfinity.com/marketplace/axies/12114085/`,
    emoji: '💦',
  },
].map((nft) => ({
  ...nft,
  type: UNDERWATER_TYPES.NFT,
}))
