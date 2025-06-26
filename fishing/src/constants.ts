import { FISHES } from './configs/fishes'
import { TRASHES } from './configs/trashes'

export const ADMIN_DISCORD_IDS = ['852110112264945704', '127009604335828992']

export enum STORAGE_KEYS {
  HAPPENING = 'happening',
}

export const EVENT_DURATION = 15 * 60 * 1000 // 15 minutes

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

export const CURRENCY_ID = '67fdf1b4af7ae841a3175105'
export const REALM_ID = '67fdf1b4a21c1d9e7b14a451'

export const MODS = [
  '645018768807821343', // antimarc
  '651937799897088032', // saiko
  '150804682850304000', // juspu
  '245976998621609984', // buddy
  '127009604335828992', // et
  '895534222666792972', // emi
]
