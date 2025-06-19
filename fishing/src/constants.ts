import { FISHES } from './configs/fishes'
import { TRASHES } from './configs/trashes'

export const ADMIN_DISCORD_IDS = ['852110112264945704', '127009604335828992']

export enum STORAGE_KEYS {
  HAPPENING = 'happening',
}

export const EVENT_DURATION = 10 * 60 * 1000 // 10 minutes

export const CANDIES_MAPPING = {
  '001': 1,
  '002': 1,
  '003': 1,
  '004': 2,
  '005': 3,
  '006': 5,
}

export const PLAYER_GROUP = {
  NORMAL: 'NORMAL',
  COLLECTOR: 'COLLECTOR',
  BALD: 'BALD',
}

export const MAX_ROD_USES = {
  [PLAYER_GROUP.NORMAL]: 5,
  [PLAYER_GROUP.COLLECTOR]: 5,
  [PLAYER_GROUP.BALD]: 5,
}

export const UNDERWATER_STUFFS_COUNT = FISHES.length + TRASHES.length
