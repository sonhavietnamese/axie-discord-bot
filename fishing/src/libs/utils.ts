import { ButtonStyle, ChatInputCommandInteraction, ComponentType, Guild } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { FISHES } from '../configs/fishes'
import { BASE_FISHING_RATES } from '../configs/game'
import { NFTs } from '../configs/nfts'
import type { Reward } from '../configs/rewards'
import { CANDY_MACHINE_REWARDS } from '../configs/rewards'
import { RODS } from '../configs/rods'
import { TRASHES } from '../configs/trashes'
import { CHANNELS, GUILDS } from '../configs/whitelist'
import { ADMINS } from '../core/admin'
import type { Inventory } from '../schema'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function computeCDNUrl(asset: string) {
  if (asset.startsWith('/')) {
    return fs.readFileSync(path.join(__dirname, '..', 'assets', 'png', `${asset}.png`))
  }

  return fs.readFileSync(path.join(__dirname, '..', 'assets', 'png', `${asset}.png`))
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
        const serverNickname = member.nickname
        const globalName = member.user.globalName || member.user.username
        const hasBALDInName =
          serverNickname?.toLowerCase().includes('bald') ||
          globalName.toLowerCase().includes('bald') ||
          serverNickname?.toLowerCase().includes('ᵇᵃˡᵈ') ||
          globalName.toLowerCase().includes('ᵇᵃˡᵈ') ||
          false

        const allowRolesCount = member.roles.cache.filter((role) => role.name.toLowerCase().includes('axie owner')).size

        let assignedRod
        if (hasBALDInName) {
          assignedRod = RODS[2] // BALD rod (id: '003')
        } else if (allowRolesCount > 3) {
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
  if (stuffId === '000') {
    return getTrash(stuffId)
  }

  if (['001', '002', '003', '004', '005', '006'].includes(stuffId)) {
    return getFish(stuffId)
  }

  if (['12114085'].includes(stuffId)) {
    return getNFT(stuffId)
  }

  return TRASHES[0]
}

// ===== INVENTORY UTILITY FUNCTIONS =====

/**
 * Get the count of a specific item in inventory
 */
export function getInventoryItemCount(inventory: Inventory, itemId: string, itemType?: 'fish' | 'rod'): number {
  // Auto-detect item type if not specified
  if (!itemType) {
    if (itemId === '000' || (itemId >= '001' && itemId <= '006')) {
      itemType = 'fish'
    } else {
      itemType = 'rod'
    }
  }

  if (itemType === 'fish') {
    return inventory.fishes[itemId] || 0
  } else {
    const rodData = inventory.rods[itemId]
    return rodData ? rodData.quantity : 0
  }
}

/**
 * Get rod uses left for a specific rod
 */
export function getRodUsesLeft(inventory: Inventory, rodId: string): number {
  const rodData = inventory.rods[rodId]
  return rodData ? rodData.usesLeft : 0
}

/**
 * Check if a rod is broken (no uses left)
 */
export function isRodBroken(inventory: Inventory, rodId: string): boolean {
  return getRodUsesLeft(inventory, rodId) <= 0
}

/**
 * Add items to inventory
 */
export function addToInventory(inventory: Inventory, itemId: string, quantity: number = 1, itemType?: 'fish' | 'rod'): Inventory {
  // Auto-detect item type if not specified
  if (!itemType) {
    if (itemId === '000' || (itemId >= '001' && itemId <= '006')) {
      itemType = 'fish'
    } else {
      itemType = 'rod'
    }
  }

  if (itemType === 'fish') {
    return {
      ...inventory,
      fishes: {
        ...inventory.fishes,
        [itemId]: (inventory.fishes[itemId] || 0) + quantity,
      },
    }
  } else {
    // For rods, if adding a new rod, initialize with max uses
    const existingRod = inventory.rods[itemId]
    if (existingRod) {
      return {
        ...inventory,
        rods: {
          ...inventory.rods,
          [itemId]: {
            quantity: existingRod.quantity + quantity,
            usesLeft: existingRod.usesLeft, // Keep existing uses
          },
        },
      }
    } else {
      // New rod - get max uses from configuration
      const rodConfig = getRod(itemId)
      const maxUses = rodConfig?.uses || 10

      return {
        ...inventory,
        rods: {
          ...inventory.rods,
          [itemId]: {
            quantity: quantity,
            usesLeft: maxUses,
          },
        },
      }
    }
  }
}

/**
 * Remove items from inventory (won't go below 0)
 */
export function removeFromInventory(inventory: Inventory, itemId: string, quantity: number = 1, itemType?: 'fish' | 'rod'): Inventory {
  // Auto-detect item type if not specified
  if (!itemType) {
    if (itemId === '000' || (itemId >= '001' && itemId <= '006')) {
      itemType = 'fish'
    } else {
      itemType = 'rod'
    }
  }

  if (itemType === 'fish') {
    const currentCount = inventory.fishes[itemId] || 0
    const newCount = Math.max(0, currentCount - quantity)

    if (newCount === 0) {
      // Remove the key entirely if count reaches 0
      const { [itemId]: _, ...restFishes } = inventory.fishes
      return {
        ...inventory,
        fishes: restFishes,
      }
    }

    return {
      ...inventory,
      fishes: {
        ...inventory.fishes,
        [itemId]: newCount,
      },
    }
  } else {
    const existingRod = inventory.rods[itemId]
    if (!existingRod) {
      return inventory // No rod to remove
    }

    const newQuantity = Math.max(0, existingRod.quantity - quantity)

    if (newQuantity === 0) {
      // Remove the rod entirely if quantity reaches 0
      const { [itemId]: _, ...restRods } = inventory.rods
      return {
        ...inventory,
        rods: restRods,
      }
    }

    return {
      ...inventory,
      rods: {
        ...inventory.rods,
        [itemId]: {
          quantity: newQuantity,
          usesLeft: existingRod.usesLeft, // Keep existing uses
        },
      },
    }
  }
}

/**
 * Reduce rod uses (for fishing)
 */
export function useRod(inventory: Inventory, rodId: string, usesToReduce: number = 1): Inventory {
  const existingRod = inventory.rods[rodId]
  if (!existingRod) {
    return inventory // No rod found
  }

  const newUsesLeft = Math.max(0, existingRod.usesLeft - usesToReduce)

  if (newUsesLeft === 0) {
    // Rod is broken - remove it from inventory
    const { [rodId]: _, ...restRods } = inventory.rods
    return {
      ...inventory,
      rods: restRods,
    }
  }

  return {
    ...inventory,
    rods: {
      ...inventory.rods,
      [rodId]: {
        quantity: existingRod.quantity,
        usesLeft: newUsesLeft,
      },
    },
  }
}

/**
 * Check if user has enough of a specific item
 */
export function hasEnoughItems(inventory: Inventory, itemId: string, requiredQuantity: number, itemType?: 'fish' | 'rod'): boolean {
  return getInventoryItemCount(inventory, itemId, itemType) >= requiredQuantity
}

/**
 * Get total count of all fish in inventory (items 001-006)
 */
export function getTotalFishCount(inventory: Inventory): number {
  const fishIds = ['001', '002', '003', '004', '005', '006']
  return fishIds.reduce((total, fishId) => total + (inventory.fishes[fishId] || 0), 0)
}

/**
 * Get total count of all trash in inventory (item 000)
 */
export function getTotalTrashCount(inventory: Inventory): number {
  return inventory.fishes['000'] || 0
}

/**
 * Get total count of all NFTs in inventory (items 007+)
 */
export function getTotalNFTCount(inventory: Inventory): number {
  return Object.entries(inventory.fishes)
    .filter(([itemId]) => parseInt(itemId) >= 7)
    .reduce((total, [, count]) => total + count, 0)
}

/**
 * Get total count of all rods in inventory
 */
export function getTotalRodCount(inventory: Inventory): number {
  return Object.values(inventory.rods).reduce((total, rodData) => total + rodData.quantity, 0)
}

/**
 * Get all usable rods (quantity > 0 and usesLeft > 0)
 */
export function getUsableRods(inventory: Inventory): Array<{ rodId: string; quantity: number; usesLeft: number }> {
  return Object.entries(inventory.rods)
    .filter(([, rodData]) => rodData.quantity > 0 && rodData.usesLeft > 0)
    .map(([rodId, rodData]) => ({ rodId, ...rodData }))
}

/**
 * Get all items of a specific type from inventory
 */
export function getItemsByType(inventory: Inventory, type: 'fish' | 'trash' | 'nft' | 'rods'): Record<string, number> {
  switch (type) {
    case 'fish':
      return Object.fromEntries(
        Object.entries(inventory.fishes).filter(([itemId]) => {
          const id = parseInt(itemId)
          return id >= 1 && id <= 6
        }),
      )
    case 'trash':
      return Object.fromEntries(Object.entries(inventory.fishes).filter(([itemId]) => itemId === '000'))
    case 'nft':
      return Object.fromEntries(Object.entries(inventory.fishes).filter(([itemId]) => parseInt(itemId) >= 7))
    case 'rods':
      // Convert rod data to simple quantity format for backward compatibility
      return Object.fromEntries(Object.entries(inventory.rods).map(([rodId, rodData]) => [rodId, rodData.quantity]))
    default:
      return {}
  }
}

export function randomInRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function getRandomReward() {
  const rd = randomInRange(0, 100)
  const candyRate = CANDY_MACHINE_REWARDS.candy.rate
  const rockRate = CANDY_MACHINE_REWARDS.rock.rate
  const fishRate = CANDY_MACHINE_REWARDS.fish.rate

  const rewardType = rd <= candyRate ? 'candy' : rd <= candyRate + rockRate ? 'rock' : 'fish'

  const rewards = CANDY_MACHINE_REWARDS[rewardType].sub
  const rdSub = randomInRange(0, 100)

  // Select sub-reward based on rates
  let cumulativeRate = 0
  let selectedSubReward: Reward | null = null

  for (const [rarity, reward] of Object.entries(rewards)) {
    const previousRate = cumulativeRate
    cumulativeRate += reward.rate
    if (rdSub > previousRate && rdSub <= cumulativeRate) {
      selectedSubReward = reward
      break
    }
  }

  if (!selectedSubReward) {
    selectedSubReward = rewards.common
  }

  const amount = randomInRange(1, selectedSubReward.maxAmount)

  return {
    id: selectedSubReward.id,
    type: rewardType,
    amount: amount,
  }
}
