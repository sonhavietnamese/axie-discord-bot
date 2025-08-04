import type { Interaction } from 'discord.js'
import { ComponentType } from 'discord.js'
import { logger } from 'robo.js'
import { eq, sql } from 'drizzle-orm'
import { db } from '../libs/database'
import { rodStore } from '../schema'
import { NFTs } from '../configs/nfts'
import { RODS } from '../configs/rods'
import { specialPlayer } from '../libs/nft'
import {
  addToInventory,
  catchUnderwaterStuff,
  computeCDNUrl,
  createButtonsWithDistraction,
  getRandomReward,
  getStuff,
  getTotalRodCount,
} from '../libs/utils'
import { getCandyBalance, processPayment } from '../services/drip'
import {
  addRodPurchaseHistory,
  attemptRodPurchase,
  getCurrentRodStoreInterns,
  getRodStoreStock,
  getRodStoreStockByRodId,
  reduceRodStore,
  restockRodStore,
} from '../services/rod-store'
import { getOrCreateUser, getUserInventory, handleUserCatch, sellAllItems, updateUserInventory } from '../services/user'
import { trackEvent } from '../libs/tracking'
import { addRockStoreHistory } from '../services/rock-store'

// Fishing session management
interface FishingSession {
  userId: string
  channelId: string
  guildId: string
  targetNumbers: number[]
  currentIndex: number
  userRate: number[]
  configuredRod: any
  assignedRod: { rod: string; uses: number }
  originalInteraction: any
  startTime: number
  timeout?: NodeJS.Timeout
}

const fishingSessions = new Map<string, FishingSession>()

// Helper function to create session key
function createSessionKey(userId: string, channelId: string): string {
  return `${userId}-${channelId}`
}

// Helper function to clean up expired sessions
function cleanupExpiredSessions() {
  const now = Date.now()
  const expiredSessions: string[] = []

  fishingSessions.forEach((session, key) => {
    // Remove sessions older than 5 minutes
    if (now - session.startTime > 5 * 60 * 1000) {
      expiredSessions.push(key)
      if (session.timeout) {
        clearTimeout(session.timeout)
      }
    }
  })

  expiredSessions.forEach((key) => {
    fishingSessions.delete(key)
    logger.info(`Cleaned up expired fishing session: ${key}`)
  })
}

// Run cleanup every minute
setInterval(cleanupExpiredSessions, 60000)

export { createSessionKey, fishingSessions }

export default async (interaction: Interaction) => {
  // Only handle button interactions
  if (!interaction.isButton()) return

  // Handle fishing game buttons
  if (interaction.customId.startsWith('button_')) {
    const sessionKey = createSessionKey(interaction.user.id, interaction.channelId)
    const session = fishingSessions.get(sessionKey)

    if (!session) {
      await interaction.reply({
        content: '❌ **Fishing session expired or not found.** Please start a new fishing session.',
        ephemeral: true,
      })
      return
    }

    // Import fishing logic functions

    // Immediately disable all buttons to prevent double-clicks
    try {
      await interaction.update({
        content: `🎣 **Great throw!** Watch out, fish is naughty, carefully catch it with rhythm!\n\n_Your task is **press the number** shown below in sequence\nFaster press, rarer fish!_\n\n🎣 **Using:** ${session.configuredRod.emoji} ${session.configuredRod.name} Rod (${session.configuredRod.rate}% rate)\n🔧 **Rod Status:** ${session.assignedRod.uses} uses left\n\nHold tight!!!!`,
        components: [], // Remove all buttons immediately
      })
    } catch (updateError) {
      logger.error(`[fishing][error][user-${interaction.user.id}][error-${updateError}]`)
      return
    }

    const pressedNumber = parseInt(interaction.customId.split('_')[1])

    if (pressedNumber === session.targetNumbers[session.currentIndex]) {
      session.currentIndex++

      if (session.currentIndex >= session.targetNumbers.length) {
        // Game completed - handle the catch
        let updateData: any = null
        let publicMessageData: any = null

        let caughtStuff: { id: string; newRates: number[] } | undefined = undefined

        if (specialPlayer.enabled && specialPlayer.id === interaction.user.id && specialPlayer.turn === session.assignedRod.uses) {
          caughtStuff = {
            id: NFTs[0].id,
            newRates: session.userRate,
          }
        }

        if (!caughtStuff) {
          caughtStuff = catchUnderwaterStuff(session.userRate, session.configuredRod?.multiplier || [])
        }

        try {
          // Clear the session timeout
          if (session.timeout) {
            clearTimeout(session.timeout)
          }

          if (caughtStuff) {
            const stuff = getStuff(caughtStuff.id)

            // Do database operations
            await handleUserCatch(interaction.user.id, caughtStuff.newRates, caughtStuff.id, session.guildId, session.channelId)
            trackEvent({
              id: interaction.user.id,
              event: 'fish_caught',
              action: `fish_${stuff.rank.id}`,
              action_properties: {
                guildId: session.guildId,
                channelId: session.channelId,
                stuffId: caughtStuff.id,
                stuffName: stuff.name,
              },
            })

            // Prepare the message content
            const isTrash = stuff.rank.name.toUpperCase() === 'USELESS'
            const rodUsesLeft = Math.max(0, session.assignedRod.uses - 1) // Rod uses were reduced by 1
            const rodStatusMessage =
              rodUsesLeft > 0
                ? `🔧 **Rod Status:** ${rodUsesLeft} uses left`
                : `🔧 **Rod Status:** 🔴 Broken! Buy a new rod from \`/fishing-store rod\``

            const message = isTrash
              ? `🎉 **Not bad!** You caught ${stuff.name}!\n\n**Rarity:** ${stuff.rank.name}\n**Thing:** ${
                  stuff.name
                }\n\nYou successfully pressed all numbers: ${session.targetNumbers.join(' → ')}\n\n${rodStatusMessage}\n\n`
              : `🎉 **Congratulations!** You caught a ${stuff.name}!\n\n**Rarity:** ${stuff.rank.name}\n**Fish:** ${stuff.name}\n\n**About**: ${
                  stuff.description
                }\n\nYou successfully pressed all numbers: ${session.targetNumbers.join(' → ')}\n\n${rodStatusMessage}`

            updateData = {
              content: message,
              components: [],
              files: [
                {
                  attachment: computeCDNUrl(stuff.image),
                  name: `${stuff.image}.webp`,
                },
              ],
            }

            // Prepare public message for rare catches
            if (interaction.channel && 'send' in interaction.channel && ['monster', 'nft'].includes(stuff.rank.id)) {
              const prefix =
                session.configuredRod.id === '001'
                  ? '# WTFish <a:ooooooooooooo:1385193747268112455> <a:ooooooooooooo:1385193747268112455> <a:ooooooooooooo:1385193747268112455> \n'
                  : ''
              publicMessageData = {
                content: ` ${prefix} **${interaction.user} used ${session.configuredRod.emoji} ${session.configuredRod.name} Rod caught a ${stuff.name}!**\n\n🐟 **Rarity:** ${stuff.rank.name}\n\n**About**: ${stuff.description}\n\n`,
                files: [
                  {
                    attachment: computeCDNUrl(stuff.image),
                    name: `${stuff.image}.webp`,
                  },
                ],
              }
            }
          } else {
            const rodUsesLeft = Math.max(0, session.assignedRod.uses - 1) // Rod uses were reduced by 1
            const rodStatusMessage =
              rodUsesLeft > 0
                ? `🔧 **Rod Status:** ${rodUsesLeft} uses left`
                : `🔧 **Rod Status:** 🔴 Broken! Buy a new rod from \`/fishing-store rod\``

            updateData = {
              content: `🎉 **Congratulations!** You caught a thing!\n\nYou successfully pressed all numbers: ${session.targetNumbers.join(
                ' → ',
              )}\n\n${rodStatusMessage}`,
              components: [],
            }
          }
        } catch (error) {
          logger.error(`[fishing][error][user-${interaction.user.id}][error-${error}]`)
          const thing = getStuff(caughtStuff?.id || '000')
          const rodUsesLeft = Math.max(0, session.assignedRod.uses - 1) // Rod uses were reduced by 1
          const rodStatusMessage =
            rodUsesLeft > 0
              ? `🔧 **Rod Status:** ${rodUsesLeft} uses left`
              : `🔧 **Rod Status:** 🔴 Broken! Buy a new rod from \`/fishing-store rod\``

          updateData = {
            content: `🎉 **Something went wrong, but you still caught a ${
              thing.name
            }!**\n\nYou successfully pressed all numbers: ${session.targetNumbers.join(' → ')}\n\n${rodStatusMessage}`,
            components: [],
          }
        }

        // Clean up session immediately to prevent double-clicks
        fishingSessions.delete(sessionKey)

        // Update the message
        try {
          await session.originalInteraction.editReply(updateData)
        } catch (updateError) {
          logger.error(`[fishing][error][user-${interaction.user.id}][error-update-data]`)
          console.log(updateError)
          try {
            await session.originalInteraction.followUp({
              ...updateData,
              ephemeral: true,
            })
          } catch (followUpError) {
            logger.error(`[fishing][error][user-${interaction.user.id}][error-follow-up]`)
            console.log(followUpError)
          }
        }

        // Send public message if prepared
        if (publicMessageData && interaction.channel && 'send' in interaction.channel) {
          try {
            await interaction.channel.send({
              content: publicMessageData.content,
              files: publicMessageData.files,
            })
          } catch (error) {
            logger.error(`[fishing][error][user-${interaction.user.id}][error-send-public-message]`)
            console.log(error)
          }
        }
      } else {
        // Move to next number
        const nextUpdateData = {
          content: `🎣 Great throw, watch out, fish is naughty, carefully catch it rhytm!\n\n_Your task is **press the number** shown below in sequence\nFaster press, rarer fish!_ \n\n **Using:** ${
            session.configuredRod.emoji
          } ${session.configuredRod.name} Rod (${session.configuredRod.rate}% rate)\n🔧 **Rod Status:** ${
            session.assignedRod.uses
          } uses left\n\nProgress: ${session.currentIndex}/${session.targetNumbers.length}\nPress the number: ${
            session.targetNumbers[session.currentIndex]
          }`,
          components: [
            {
              type: ComponentType.ActionRow,
              components: createButtonsWithDistraction(),
            },
          ],
        }

        try {
          await session.originalInteraction.editReply(nextUpdateData)
        } catch (updateError) {
          logger.error(`[fishing][error][user-${interaction.user.id}][error-update-next-number]`)
          console.log(updateError)
          fishingSessions.delete(sessionKey)
        }
      }
    } else {
      // Wrong number pressed - immediately remove session to prevent further clicks
      if (session.timeout) {
        clearTimeout(session.timeout)
      }
      fishingSessions.delete(sessionKey)

      const rodUsesLeft = Math.max(0, session.assignedRod.uses - 1) // Rod uses were reduced by 1
      const rodStatusMessage =
        rodUsesLeft > 0 ? `🔧 **Rod Status:** ${rodUsesLeft} uses left` : `🔧 **Rod Status:** 🔴 Broken! Buy a new rod from \`/fishing-store rod\``

      const wrongNumberData = {
        content: `❌❌ **Ehhhh, You missed the rhytm, fish got away!**\n\nYou pressed ${pressedNumber} but needed ${
          session.targetNumbers[session.currentIndex]
        }\n\nThe sequence was: ${session.targetNumbers.join(' → ')}\n\n${rodStatusMessage}\n\nTry again!`,
        components: [],
      }

      try {
        await session.originalInteraction.editReply(wrongNumberData)
        await handleUserCatch(interaction.user.id, session.userRate, null, session.guildId, session.channelId)
      } catch (updateError) {
        logger.error('Error updating fishing for wrong number:', updateError)
      }
    }

    return
  }

  // Handle sell-all button
  if (interaction.customId === 'sell-all') {
    try {
      await interaction.deferReply({ flags: 64 })

      const result = await sellAllItems(interaction.user.id)

      if (!result.success) {
        return interaction.editReply({
          content: `❌ **Unable to sell items:** ${result.error || 'Unknown error'}`,
        })
      }

      // Update balance via Drip API
      const paymentResult = await processPayment(interaction.user.id, result.candiesEarned)

      if (!paymentResult.success) {
        logger.warn(`[drip][process-payment][error][user-${interaction.user.id}][error-payment-failed]`)
        console.log(paymentResult)
        // Don't fail the main operation if Drip API fails, but log the issue
      }

      // Create a detailed summary of sold items (only fish can be sold)
      const soldItemsDetails = Object.entries(result.itemsSold.fishes)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => {
          const stuff = getStuff(itemId)
          const candiesForItem = Math.floor(stuff.price * quantity)
          return `${stuff.emoji} ${stuff.name} x${quantity} = ${candiesForItem} 🍬`
        })
        .join('\n')

      const totalItemCount = Object.values(result.itemsSold.fishes).reduce((sum, qty) => sum + qty, 0)

      await interaction.editReply({
        embeds: [
          {
            color: 0x00ff00,
            title: '🎉 Sale Completed Successfully!',
            description: `You sold all your items and earned **${result.candiesEarned} 🍬 candies**!\n\n**Items Sold:**\n${soldItemsDetails}`,
            fields: [
              {
                name: '💰 Total Candies Earned',
                value: `${result.candiesEarned} 🍬`,
                inline: true,
              },
              {
                name: '📦 Total Items Sold',
                value: totalItemCount.toString(),
                inline: true,
              },
              {
                name: '🗓️ Transaction Status',
                value: 'Completed ✅',
                inline: true,
              },
            ],
            footer: {
              icon_url: interaction.user.displayAvatarURL(),
              text: `${interaction.user.globalName || interaction.user.username} • ${new Date().toLocaleString()}`,
            },
          },
        ],
        files: [
          {
            attachment: computeCDNUrl('store-et'),
            name: 'store-et.png',
            contentType: 'image/png',
          },
        ],
      })

      logger.info(`[sell-all][ok][user-${interaction.user.id}][candies-${result.candiesEarned}]`)
    } catch (error) {
      logger.error(`[sell-all][error][user-${interaction.user.id}][error-sell-all]`)
      console.log(error)

      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ **An error occurred while processing your sale.** Please try again later.',
        })
      } else {
        await interaction.reply({
          content: '❌ **An error occurred while processing your sale.** Please try again later.',
          ephemeral: true,
        })
      }
    }
  }

  // Handle buy rod buttons
  if (interaction.customId.startsWith('buy-rod-')) {
    const rodType = interaction.customId.split('-')[2] // 'branch', 'mavis', or 'bald'

    let selectedRod
    switch (rodType) {
      case 'branch':
        selectedRod = RODS[0] // Branch rod
        break
      case 'mavis':
        selectedRod = RODS[1] // Mavis rod
        break
      case 'bald':
        selectedRod = RODS[2] // BALD rod
        break
      default:
        await interaction.editReply({
          content: '❌ **Invalid rod type selected.**',
        })
        return
    }

    try {
      await interaction.deferReply({ ephemeral: true })

      // Find the rod configuration

      // Check if rod is in stock
      const rodStock = await getRodStoreStockByRodId(selectedRod.id)
      const interns = await getCurrentRodStoreInterns()

      if (!interns.length) {
        await interaction.editReply({
          content: `❌ Rod Store Intern not found!`,
        })
        return
      }

      if (!rodStock || rodStock.stock === 0 || interns[0].isHiring === 0) {
        await interaction.editReply({
          content: `❌ **${selectedRod.name} Rod is out of stock!** Ask Rod Store Intern <@${interns[0].userId || 'unknown'}> to restock!`,
        })
        return
      }

      logger.info(`[rod-store][buy-rod][ok][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}]`)

      // Create or get user first to check rod inventory
      const userData = await getOrCreateUser(interaction.user.id, interaction.user.username || interaction.user.globalName || 'Unknown User')

      // Get current inventory to check rod count before payment
      let currentInventory = await getUserInventory(interaction.user.id)
      if (!currentInventory) {
        currentInventory = { fishes: {}, rods: {} }
      }

      // Check if user already has any rods (enforce 1 rod limit) BEFORE payment
      const totalRods = getTotalRodCount(currentInventory)

      if (totalRods >= 1) {
        await interaction.editReply({
          content: `❌ **Rod limit reached!** You can only own 1 rod at a time. You currently have ${totalRods} rod(s).\nUse \`/inventory\` to see your rod.\n\n_Please use your current rod or wait for a rod trading feature._`,
        })
        logger.error(
          `[rod-store][buy-rod][error][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}][error-rod-limit-reached]`,
        )
        return
      }

      // Double check user balance
      const currentBalance = await getCandyBalance(interaction.user.id)

      if (currentBalance < selectedRod.price) {
        await interaction.editReply({
          content: `❌ **Insufficient candies!** You need ${selectedRod.price} 🍬 candies but only have ${currentBalance} 🍬.`,
        })
        logger.error(
          `[rod-store][buy-rod][error][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}][error-insufficient-balance][balance-${currentBalance}]`,
        )
        return
      }

      // Attempt atomic rod purchase (this handles stock reduction atomically)
      const purchaseAttempt = await attemptRodPurchase(selectedRod.id)

      if (!purchaseAttempt.success) {
        await interaction.editReply({
          content: `❌ **${selectedRod.name} Rod is out of stock!** Someone else purchased the last one. Ask Rod Store Intern <@${
            interns[0].userId || 'unknown'
          }> to restock!`,
        })
        logger.info(`[rod-store][buy-rod][race-condition-prevented][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}]`)
        return
      }

      // Stock successfully reserved, now process payment
      const paymentResult = await processPayment(interaction.user.id, -selectedRod.price) // Negative amount to subtract

      if (!paymentResult.success) {
        // Payment failed, we need to refund the stock
        await db
          .update(rodStore)
          .set({ stock: sql`stock + 1` })
          .where(eq(rodStore.rodId, selectedRod.id))

        await interaction.editReply({
          content: `❌ **Payment processing failed:** ${paymentResult.error || 'Unknown error'}. Please try again later.`,
        })
        logger.error(
          `[rod-store][buy-rod][error][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}][error-payment-failed][error-${paymentResult.error}][stock-refunded]`,
        )
        return
      }

      logger.info(`[rod-store][buy-rod][ok][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}]`)

      // Add rod to user's inventory (user and inventory already verified above)
      try {
        // Add rod to rods section (user has 0 rods, so this will be their first)
        const updatedInventory = addToInventory(currentInventory, selectedRod.id, 1, 'rod')

        // Update user inventory in database
        await updateUserInventory(interaction.user.id, updatedInventory)
        // Stock already reduced by attemptRodPurchase above

        await addRodPurchaseHistory(interaction.user.id, selectedRod.id)
        logger.info(
          `[rod-store][buy-rod][ok][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}][inventory-updated][inventory-${updatedInventory}]`,
        )

        // Send success message
        await interaction.editReply({
          embeds: [
            {
              color: selectedRod.color,
              title: '🎉 Rod Purchase Successful!',
              description: `You have successfully purchased your **${selectedRod.name} Rod**!\n\n${selectedRod.description}\n\n⚠️ **Note:** You can only own 1 rod at a time.`,
              fields: [
                {
                  name: '🎣 Rod Purchased',
                  value: selectedRod.name,
                  inline: true,
                },
                {
                  name: '💰 Candies Spent',
                  value: `${selectedRod.price} 🍬`,
                  inline: true,
                },
                {
                  name: '📊 Transaction Status',
                  value: 'Completed ✅',
                  inline: true,
                },
                {
                  name: '⚡ Rod Stats',
                  value: `Rate: ${selectedRod.rate}%\nUses: ${selectedRod.uses}`,
                  inline: true,
                },
                {
                  name: '💳 Remaining Balance',
                  value: `${currentBalance - selectedRod.price} 🍬`,
                  inline: true,
                },
                {
                  name: '🎯 Rod Count',
                  value: '1/1 (Max)',
                  inline: true,
                },
              ],
              footer: {
                icon_url: interaction.user.displayAvatarURL(),
                text: `${interaction.user.globalName || interaction.user.username} • ${new Date().toLocaleString()}`,
              },
            },
          ],
          files: [
            {
              attachment: computeCDNUrl(selectedRod.image),
              name: `${selectedRod.image}.webp`,
            },
          ],
        })

        logger.info(
          `[rod-store][buy-rod][ok][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}][inventory-updated][inventory-${updatedInventory}]`,
        )
      } catch (inventoryError) {
        logger.error('Error updating user inventory after rod purchase:', inventoryError)
        logger.error(
          `[rod-store][buy-rod][error][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}][error-inventory-update-failed][error-${inventoryError}]`,
        )

        // If inventory update fails but payment succeeded, we should refund both payment and stock
        const refundResult = await processPayment(interaction.user.id, selectedRod.price) // Positive amount to refund

        // Also refund the stock
        await db
          .update(rodStore)
          .set({ stock: sql`stock + 1` })
          .where(eq(rodStore.rodId, selectedRod.id))

        if (refundResult.success) {
          logger.info(
            `[rod-store][buy-rod][refund-complete][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}][payment-and-stock-refunded]`,
          )
        } else {
          logger.error(
            `[rod-store][buy-rod][error][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}][error-payment-refund-failed][stock-refunded][error-${refundResult.error}]`,
          )
        }

        await interaction.editReply({
          content: '❌ **Inventory update failed.** Your payment has been refunded. Please try again or contact an admin.',
        })
      }
    } catch (error) {
      logger.error(`[rod-store][buy-rod][error][user-${interaction.user.id}][rod-${selectedRod.id}][price-${selectedRod.price}][error-${error}]`)

      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ **An error occurred while processing your rod purchase.** Please try again later.',
        })
      } else {
        await interaction.reply({
          content: '❌ **An error occurred while processing your rod purchase.** Please try again later.',
          ephemeral: true,
        })
      }
    }

    return
  }

  // Handle restock all rods button
  if (interaction.customId === 'restock-rods') {
    await interaction.deferReply({ ephemeral: true })

    logger.info(`[rod-store][restock-rods][request][user-${interaction.user.id}]`)

    const intern = await getCurrentRodStoreInterns()
    if (!intern.length) {
      await interaction.editReply({
        content: `❌ Rod Store Intern not found!`,
      })

      return
    }

    await interaction.editReply({
      content: `🔄 Refilling all rods...`,
    })

    // Need to check if all the rods need to be back to 0 to be able to restock
    const allRods = await getRodStoreStock()
    if (allRods.some((rod) => rod.stock > 0)) {
      await interaction.editReply({
        content: `❌ All rods must be out of stock to restock!`,
      })
      return
    }

    // Create restock data using the actual database IDs
    const rodStoreToRestock = RODS.map((item) => ({
      id: item.id,
      rodId: item.id,
      stock: 7,
    }))

    await restockRodStore(rodStoreToRestock)

    logger.info(`[rod-store][restock-rods][ok][user-${interaction.user.id}]`)

    await interaction.editReply({
      content: `✅ Refilled all rods!`,
    })

    return
  }

  // Handle roll rock button
  if (interaction.customId === 'roll-rock') {
    await interaction.deferReply({ ephemeral: true })

    const inventory = await getUserInventory(interaction.user.id)
    if (!inventory) {
      return interaction.editReply({
        content: 'You do not have an inventory!',
      })
    }

    const rockBalance = inventory.fishes['000'] || 0

    if (rockBalance < 2) {
      return interaction.editReply({
        content: 'You do not have enough rocks to roll!',
      })
    }

    const candyBalance = await getCandyBalance(interaction.user.id)

    if (candyBalance < 2) {
      return interaction.editReply({
        content: 'You do not have enough candies to roll!',
      })
    }

    const reward = getRandomReward()

    // TODO: reduce the rock balance
    await updateUserInventory(interaction.user.id, addToInventory(inventory, '000', -2, 'fish'))
    // TODO: reduce the candy balance
    await processPayment(interaction.user.id, -2)

    if (reward.type === 'candy') {
      try {
        const response = await processPayment(interaction.user.id, reward.amount)
        await addRockStoreHistory(interaction.user.id, 'candy', reward.amount)
        if (!response.success) {
          throw new Error('Failed to send candies')
        }
      } catch (error) {
        return interaction.editReply({
          content: 'Failed to send candies',
        })
      }

      await interaction.editReply({
        content: `You rolled ${reward.amount} 🍬 candies!`,
        files: [
          {
            attachment: computeCDNUrl('store-rock-candy'),
            name: 'store-rock-candy.png',
            contentType: 'image/png',
          },
        ],
      })
    }

    if (reward.type === 'rock') {
      try {
        await updateUserInventory(interaction.user.id, addToInventory(inventory, '000', reward.amount, 'fish'))
        await addRockStoreHistory(interaction.user.id, 'rock', reward.amount)
      } catch (error) {
        return interaction.editReply({
          content: 'Failed to update inventory',
        })
      }
      await interaction.editReply({
        content: `You rolled ${reward.amount} 🪨 rocks!`,
        files: [
          {
            attachment: computeCDNUrl('store-rock-object-001'),
            name: 'store-rock-object-001.png',
            contentType: 'image/png',
          },
        ],
      })
    }

    if (reward.type === 'fish') {
      try {
        await updateUserInventory(interaction.user.id, addToInventory(inventory, reward.id, reward.amount, 'fish'))
        await addRockStoreHistory(interaction.user.id, `fish-${reward.id}`, reward.amount)
      } catch (error) {
        return interaction.editReply({
          content: 'Failed to update inventory',
        })
      }
      const stuff = getStuff(reward.id)
      await interaction.editReply({
        content: `## 🎉 You rolled ${reward.amount} ${stuff.name}!`,
        files: [
          {
            attachment: computeCDNUrl(`store-rock-fish-${reward.id}`),
            name: `store-rock-fish-${reward.id}.png`,
            contentType: 'image/png',
          },
        ],
      })
    }

    return
  }
}
