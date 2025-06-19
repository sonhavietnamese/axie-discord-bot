export const RANKS = {
  COMMON: {
    id: 'common',
    name: 'Common',
    color: 0x416ec7,
  },
  EPIC: {
    id: 'epic',
    name: 'Epic',
    color: 0x487e9a,
  },
  LEGENDARY: {
    id: 'legendary',
    name: 'Legendary',
    color: 0xcb5223,
  },
  MYTHIC: {
    id: 'mythic',
    name: 'Mythic',
    color: 0xfe1000,
  },
  SUPREME: {
    id: 'supreme',
    name: 'Supreme',
    color: 0xa7bdcb,
  },
  MONSTER: {
    id: 'monster',
    name: '%$#@',
    color: 0x0e1e6e,
  },
  USELESS: {
    id: 'useless',
    name: 'Useless',
    color: 0xb07652,
  },
  NFT: {
    id: 'nft',
    name: 'NFT',
    color: 0x47fddd,
  },
} as const

export type Rank = [keyof typeof RANKS]
