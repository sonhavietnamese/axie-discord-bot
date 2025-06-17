import { Colors } from 'discord.js'
import { METADATA } from './metadata'

export const ADMIN_DISCORD_IDS = ['852110112264945704']

export const CHIMERA_MAX_HEALTH = 10e7

export const DAMAGE = [
  {
    type: 'tiny',
    damage: [0, 10e3],
    color: Colors.Blurple,
  },
  {
    type: 'super',
    damage: [10e3, 10e4],
    color: Colors.Green,
  },
  {
    type: 'critical',
    damage: [10e4, 10e5],
    color: Colors.Red,
  },
]

export const axies = ['bing', 'hope', 'buba', 'machito', 'momo', 'shillin', 'tripp', 'pomodoro', 'venoki', 'xia']

export const positions = [
  {
    x: 10,
    y: 522,
    width: 200,
    height: 200,
    direction: 1,
  },
  {
    x: 318,
    y: 546,
    width: 205,
    height: 205,
    direction: 1,
  },
  {
    x: 228,
    y: 658,
    width: 220,
    height: 220,
    direction: 1,
  },
  {
    x: 472,
    y: 694,
    width: 240,
    height: 240,
    direction: 1,
  },
  {
    x: 28,
    y: 703,
    width: 250,
    height: 250,
    direction: 1,
  },

  {
    x: 1130,
    y: 526,
    width: 200,
    height: 200,
    direction: -1,
  },

  {
    x: 849,
    y: 629,
    width: 220,
    height: 220,
    direction: -1,
  },

  {
    x: 1235,
    y: 642,
    width: 230,
    height: 230,
    direction: -1,
  },

  {
    x: 1010,
    y: 729,
    width: 240,
    height: 240,
    direction: -1,
  },

  {
    x: 1483,
    y: 728,
    width: 250,
    height: 250,
    direction: -1,
  },
]

export const CARDS: Record<string, string[]> = {
  tiny: ['Serious', 'Risky Fish', 'Cute Bunny', 'Casterpillars', 'Buba Brush'],
  super: ['Forest Hero', 'Post Fight', 'Lam', 'Beech', 'Anemone'],
  critical: ['Tiny Fan', 'Koi', 'Shiba', 'Little Branch', 'Sandal'],
}

export const CARD_IMAGE_LOOKUP: Record<string, string> = {
  Serious: 'plant-mouth-02-00',
  'Risky Fish': 'aquatic-mouth-08-00',
  'Cute Bunny': 'bug-mouth-08-00',
  Casterpillars: 'bug-horn-06-00',
  'Buba Brush': 'beast-tail-03-00',
  'Forest Hero': 'plant-back-03-00',
  'Post Fight': 'bird-tail-12-00',
  Lam: 'aquatic-mouth-02-00',
  Beech: 'plant-horn-04-00',
  Anemone: 'aquatic-back-10-00',
  'Tiny Fan': 'aquatic-ears-04-00',
  Koi: 'aquatic-tail-02-00',
  Shiba: 'beast-tail-06-00',
  'Little Branch': 'beast-horn-02-00',
  Sandal: 'bug-back-08-00',
}

export enum STORAGE_KEYS {
  HAPPENING = 'happening',
}

export const EVENT_DURATION = 10 * 60 * 1000 // 10 minutes

// export const RODS = {
//   '001': {
//     name: 'Branch',
//     rate: 50,
//     uses: 5,
//     color: 0xfaabac,
//     image: `${METADATA.CDN}/rod-001.webp`,
//     description: `BALD is not the choice, BALD is in our blood!\n :`,
//   },
//   '002': {
//     name: 'Mavis',
//     rate: 80,
//     uses: 5,
//     color: 0x3f74b5,
//     image: `${METADATA.CDN}/rod-002.webp`,
//     description: `BALD is not the choice, BALD is in our blood!\n :`,
//   },
//   '003': {
//     name: 'BALD',
//     rate: 80,
//     uses: 5,
//     color: 0xfaabac,
//     image: `${METADATA.CDN}/rod-003.webp`,
//     description: `BALD is not the choice, BALD is in our blood!\n :`,
//   },
// }

// export enum RANK {
//   COMMON = 'common',
//   EPIC = 'epic',
//   LEGENDARY = 'legendary',
//   MYTHIC = 'mythic',
//   SUPREME = 'supreme',
//   MONSTER = '%$#@',

//   USELESS = 'useless',
//   NFT = 'nft',
// }

// export const FISHES = [
//   {
//     id: '001',
//     name: 'Anchovy',
//     rank: RANK.COMMON,
//     image: `${METADATA.CDN}/fish-001.webp`,
//     description: `BALD is not the choice, BALD is in our blood!\n :`,
//   },
//   {
//     id: '002',
//     name: 'Puffer',
//     rank: RANK.EPIC,
//     image: `${METADATA.CDN}/fish-002.webp`,
//     description: `BALD is not the choice, BALD is in our blood!\n :`,
//   },
//   {
//     id: '003',
//     name: 'Tootooh',
//     rank: RANK.LEGENDARY,
//     image: `${METADATA.CDN}/fish-003.webp`,
//     description: `BALD is not the choice, BALD is in our blood!\n :`,
//   },
//   {
//     id: '004',
//     name: 'Koi',
//     rank: RANK.MYTHIC,
//     image: `${METADATA.CDN}/fish-004.webp`,
//     description: `BALD is not the choice, BALD is in our blood!\n :`,
//   },
//   {
//     id: '005',
//     name: 'Zebra King',
//     rank: RANK.SUPREME,
//     image: `${METADATA.CDN}/fish-005.webp`,
//     description: `BALD is not the choice, BALD is in our blood!\n :`,
//   },
//   {
//     id: '006',
//     name: 'Monster',
//     rank: RANK.MONSTER,
//     image: `${METADATA.CDN}/fish-006.webp`,
//     description: `BALD is not the choice, BALD is in our blood!\n :`,
//   },
// ]

// export const TRASHES = [
//   {
//     id: '001',
//     name: 'The Rock',
//     rank: RANK.USELESS,
//     image: `${METADATA.CDN}/object-001.webp`,
//     description: `asd`,
//   },
// ]

// export const CANDIES_MAPPING = {
//   '001': 1,
//   '002': 1,
//   '003': 1,
//   '004': 2,
//   '005': 3,
//   '006': 5,
// }

// export const PLAYER_GROUP = {
//   NORMAL: 'NORMAL',
//   COLLECTOR: 'COLLECTOR',
//   BALD: 'BALD',
// }

// export const MAX_ROD_USES = {
//   [PLAYER_GROUP.NORMAL]: 5,
//   [PLAYER_GROUP.COLLECTOR]: 5,
//   [PLAYER_GROUP.BALD]: 5,
// }
