import { ButtonStyle, ChatInputCommandInteraction, ComponentType, Guild } from 'discord.js'
import { FISHES } from '../configs/fishes'
import { BASE_FISHING_RATES } from '../configs/game'
import { RODS } from '../configs/rods'
import { TRASHES } from '../configs/trashes'
import { CHANNELS, GUILDS } from '../configs/whitelist'
import { ADMINS } from '../core/admin'
import { METADATA } from '../metadata'
import type { Inventory } from '../schema'
import { NFTs } from '~/configs/nfts'

export function computeCDNUrl(asset: string) {
  if (asset.startsWith('/')) {
    return `${METADATA.CDN}${asset}.png`
  }

  return `${METADATA.CDN}/${asset}.png`
}

export function isAdmin(userId: string) {
  return ADMINS.includes(userId)
}

export function isWhitelisted(guildId: string | null, channelId: string) {
  if (!guildId || !GUILDS.includes(guildId) || !CHANNELS.includes(channelId)) {
    return false
  }

  return true
}

export async function require<T extends ChatInputCommandInteraction>(condition: boolean, message: string, interaction: T) {
  if (!condition) {
    await interaction.reply({
      content: message,
      ephemeral: true,
    })

    throw new Error(message)
  }
}

export function abbreviateNumber(n: number, decPlaces = 0, units: string[] = ['k', 'm', 'b', 't']): string | number {
  const isNegative = n < 0
  const abbreviatedNumber = _abbreviate(Math.abs(n), decPlaces, units)
  return isNegative ? `-${abbreviatedNumber}` : abbreviatedNumber
}

function _abbreviate(num: number, decimalPlaces: number, units: string[]): string | number {
  const factor = 10 ** decimalPlaces

  for (let i = units.length - 1; i >= 0; i--) {
    const size = 10 ** ((i + 1) * 3)

    if (size <= num) {
      let result = Math.round((num * factor) / size) / factor

      if (result === 1000 && i < units.length - 1) {
        result = 1
        i++
      }

      return `${result}${units[i]}`
    }
  }

  return num
}

export function hashCode(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    const character = name.charCodeAt(i)
    hash = (hash << 5) - hash + character
    hash = hash & hash
  }

  return Math.abs(hash)
}

export async function assignRod(users: Array<{ id: string; name: string }>, guild: Guild) {
  const result = []

  try {
    // Bulk fetch all members at once - much more efficient!
    const userIds = users.map((user) => user.id)
    const members = await guild.members.fetch({ user: userIds })

    for (const user of users) {
      const member = members.get(user.id)

      if (member) {
        // Check if user has BALD in their global name
        const hasBALDInName = member.user.globalName?.toLowerCase().includes('bald') || false

        // Count roles that contain "Allow-" in their name
        const allowRolesCount = member.roles.cache.filter((role) => role.name.toLowerCase().includes('allow-')).size

        let assignedRod
        if (hasBALDInName) {
          assignedRod = RODS[2] // BALD rod (id: '003')
        } else if (allowRolesCount > 2) {
          assignedRod = RODS[1] // Mavis rod (id: '002')
        } else {
          assignedRod = RODS[0] // Branch rod (id: '001') - default
        }

        result.push({
          ...user,
          rod: assignedRod,
          hasRoles: member.roles.cache.size > 1, // More than @everyone role
        })
      } else {
        // Fallback when member not found - only check name for BALD
        const hasBALDInName = user.name.toLowerCase().includes('bald')

        let assignedRod
        if (hasBALDInName) {
          assignedRod = RODS[2] // BALD rod
        } else {
          assignedRod = RODS[0] // Branch rod - default (can't check roles)
        }

        result.push({
          ...user,
          rod: assignedRod,
          hasRoles: false,
          roleCount: 0,
        })
      }
    }
  } catch (error) {
    console.warn('Could not bulk fetch members:', error)
    // Fallback to username-based assignment for all users
    for (const user of users) {
      const hasBALDInName = user.name.toLowerCase().includes('bald')

      let assignedRod
      if (hasBALDInName) {
        assignedRod = RODS[2] // BALD rod
      } else {
        assignedRod = RODS[1] // Mavis rod
      }

      result.push({
        ...user,
        rod: assignedRod,
      })
    }
  }

  return result
}

export function getRod(rodId: string) {
  return RODS.find((rod) => rod.id === rodId)
}

export const generateRandomNumbers = (length: number = 3): number[] => {
  const numbers: number[] = []
  for (let i = 0; i < length; i++) {
    numbers.push(Math.floor(Math.random() * 5) + 1) // Random number 1-5
  }
  return numbers
}

// Function to create buttons with random distraction
export const createButtonsWithDistraction = () => {
  const buttons = []
  const distractionIndex = Math.floor(Math.random() * 5) // Random button to distract
  const distractionStyles = [ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary]
  const distractionStyle = distractionStyles[Math.floor(Math.random() * distractionStyles.length)]

  for (let i = 1; i <= 5; i++) {
    buttons.push({
      type: ComponentType.Button,
      label: i.toString(),
      style: i - 1 === distractionIndex ? distractionStyle : ButtonStyle.Primary,
      custom_id: `button_${i}`,
    })
  }

  return buttons
}

export function getFish(id: string) {
  const f = FISHES.find((fish) => fish.id === id)
  return f ? f : FISHES[0] // TODO: default fish
}

export function catchUnderwaterStuff(userRate: number[], multiplier: number[]) {
  const baseRates = userRate.length >= 7 ? userRate.slice(0, 7) : [...userRate, ...Array(7 - userRate.length).fill(1)]

  const totalWeight = baseRates.reduce((sum, rate) => sum + rate, 0)

  if (totalWeight <= 0) {
    return {
      id: '000',
      newRates: baseRates,
    }
  }

  let random = Math.random() * totalWeight
  let caughtIndex = 0

  for (let i = 0; i < baseRates.length; i++) {
    random -= baseRates[i]
    if (random <= 0) {
      caughtIndex = i
      break
    }
  }

  const caughtId = String(caughtIndex).padStart(3, '0')

  let newRates = [...baseRates]

  for (let i = 0; i < multiplier.length; i++) {
    if (i === caughtIndex) {
      newRates[i] = BASE_FISHING_RATES[i]
    } else {
      newRates[i] = baseRates[i] + multiplier[i]
    }
  }

  return {
    id: caughtId,
    newRates: newRates,
  }
}

export function getTrash(id: string) {
  const t = TRASHES.find((trash) => trash.id === id)
  return t ? t : TRASHES[0] // TODO: default trash
}

export function getNFT(id: string) {
  const nft = NFTs.find((nft) => nft.id === id)
  return nft ? nft : NFTs[0] // TODO: default nft
}

export function getStuff(stuffId: string) {
  console.log('getStuff', stuffId)
  if (stuffId === '000') {
    return getTrash(stuffId)
  }

  if (['001', '002', '003', '004', '005', '006'].includes(stuffId)) {
    return getFish(stuffId)
  }

  if (['12114085'].includes(stuffId)) {
    console.log('getNFT', stuffId)
    return getNFT(stuffId)
  }

  return TRASHES[0]
}

// ===== INVENTORY UTILITY FUNCTIONS =====

/**
 * Get the count of a specific item in inventory
 */
export function getInventoryItemCount(inventory: Inventory, itemId: string): number {
  return inventory[itemId] || 0
}

/**
 * Add items to inventory
 */
export function addToInventory(inventory: Inventory, itemId: string, quantity: number = 1): Inventory {
  return {
    ...inventory,
    [itemId]: getInventoryItemCount(inventory, itemId) + quantity,
  }
}

/**
 * Remove items from inventory (won't go below 0)
 */
export function removeFromInventory(inventory: Inventory, itemId: string, quantity: number = 1): Inventory {
  const currentCount = getInventoryItemCount(inventory, itemId)
  const newCount = Math.max(0, currentCount - quantity)

  if (newCount === 0) {
    // Remove the key entirely if count reaches 0
    const { [itemId]: _, ...rest } = inventory
    return rest
  }

  return {
    ...inventory,
    [itemId]: newCount,
  }
}

/**
 * Check if user has enough of a specific item
 */
export function hasEnoughItems(inventory: Inventory, itemId: string, requiredQuantity: number): boolean {
  return getInventoryItemCount(inventory, itemId) >= requiredQuantity
}

/**
 * Get total count of all fish in inventory (items 001-006)
 */
export function getTotalFishCount(inventory: Inventory): number {
  const fishIds = ['001', '002', '003', '004', '005', '006']
  return fishIds.reduce((total, fishId) => total + getInventoryItemCount(inventory, fishId), 0)
}

/**
 * Get total count of all trash in inventory (item 000)
 */
export function getTotalTrashCount(inventory: Inventory): number {
  return getInventoryItemCount(inventory, '000')
}

/**
 * Get total count of all NFTs in inventory (items 007+)
 */
export function getTotalNFTCount(inventory: Inventory): number {
  return Object.entries(inventory)
    .filter(([itemId]) => parseInt(itemId) >= 7)
    .reduce((total, [, count]) => total + count, 0)
}

/**
 * Get all items of a specific type from inventory
 */
export function getItemsByType(inventory: Inventory, type: 'fish' | 'trash' | 'nft'): Record<string, number> {
  switch (type) {
    case 'fish':
      return Object.fromEntries(
        Object.entries(inventory).filter(([itemId]) => {
          const id = parseInt(itemId)
          return id >= 1 && id <= 6
        }),
      )
    case 'trash':
      return Object.fromEntries(Object.entries(inventory).filter(([itemId]) => itemId === '000'))
    case 'nft':
      return Object.fromEntries(Object.entries(inventory).filter(([itemId]) => parseInt(itemId) >= 7))
    default:
      return {}
  }
}

export function randomInRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/*
INVENTORY USAGE EXAMPLES:

// Example inventory JSON format:
const exampleInventory: Inventory = {
  "000": 5,   // 5 trash items
  "001": 10,  // 10 fish type 1
  "002": 3,   // 3 fish type 2
  "007": 1    // 1 NFT
}

// Get count of specific item:
const trashCount = getInventoryItemCount(exampleInventory, "000") // Returns 5

// Add items:
const updatedInventory = addToInventory(exampleInventory, "001", 2) // Adds 2 fish type 1

// Remove items:
const afterRemoval = removeFromInventory(updatedInventory, "000", 3) // Removes 3 trash

// Check if user has enough:
const hasEnough = hasEnoughItems(exampleInventory, "001", 5) // Returns true (has 10, needs 5)

// Get totals by type:
const totalFish = getTotalFishCount(exampleInventory) // Returns 13 (10 + 3)
const totalTrash = getTotalTrashCount(exampleInventory) // Returns 5
const totalNFTs = getTotalNFTCount(exampleInventory) // Returns 1

// Get items by type:
const fishItems = getItemsByType(exampleInventory, 'fish') // Returns { "001": 10, "002": 3 }
*/
