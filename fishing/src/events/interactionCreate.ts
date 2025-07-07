import type { Interaction } from 'discord.js'
import { ComponentType } from 'discord.js'
import { logger } from 'robo.js'
import { NFTs } from '../configs/nfts'
import { specialPlayer } from '../libs/nft'
import { addToInventory, catchUnderwaterStuff, computeCDNUrl, createButtonsWithDistraction, getStuff } from '../libs/utils'
import { handleUserCatch, sellAllItems } from '../services/user'
import { processPayment } from '../services/drip'
import { RODS } from '../configs/rods'
import { getCandyBalance } from '../services/drip'
import { getUser, updateUserInventory, getUserInventory } from '../services/user'

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
        content: `🎣 Great throw, watch out, fish is naughty, carefully catch it rhytm!\n\n_Your task is **press the number** shown below in sequence\nFaster press, rarer fish!_\n\n⏳ **Processing your choice...** Please hold on, calculating results!\n🔄 Working on your catch...`,
        components: [], // Remove all buttons immediately
      })
    } catch (updateError) {
      logger.error('Error immediately disabling buttons:', updateError)
      return
    }

    const pressedNumber = parseInt(interaction.customId.split('_')[1])

    if (pressedNumber === session.targetNumbers[session.currentIndex]) {
      session.currentIndex++

      if (session.currentIndex >= session.targetNumbers.length) {
        // Game completed - handle the catch
        let updateData: any = null
        let publicMessageData: any = null

        try {
          // Clear the session timeout
          if (session.timeout) {
            clearTimeout(session.timeout)
          }

          // Get a random fish from database
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

          if (caughtStuff) {
            const stuff = getStuff(caughtStuff.id)

            // Do database operations
            await handleUserCatch(interaction.user.id, caughtStuff.newRates, caughtStuff.id, session.guildId, session.channelId)

            // Prepare the message content
            const isTrash = stuff.rank.name.toUpperCase() === 'USELESS'
            const message = isTrash
              ? `🎉 **Not bad!** You caught ${stuff.name}!\n\n**Rarity:** ${stuff.rank.name}\n**Thing:** ${
                  stuff.name
                }\n\nYou successfully pressed all numbers: ${session.targetNumbers.join(
                  ' → ',
                )}\n\n_You can use it to throw at <@852110112264945704>!_`
              : `🎉 **Congratulations!** You caught a ${stuff.name}!\n\n**Rarity:** ${stuff.rank.name}\n**Fish:** ${stuff.name}\n\n**About**: ${
                  stuff.description
                }\n\nYou successfully pressed all numbers: ${session.targetNumbers.join(' → ')}`

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
            if (interaction.channel && 'send' in interaction.channel && ['supreme', 'monster', 'nft'].includes(stuff.rank.id)) {
              publicMessageData = {
                content: `🎣 **${interaction.user} caught a ${stuff.name}!**\n\n🐟 **Rarity:** ${stuff.rank.name}\n\n**About**: ${stuff.description}\n\n _Reaction to share the luck_ `,
                files: [
                  {
                    attachment: computeCDNUrl(stuff.image),
                    name: `${stuff.image}.webp`,
                  },
                ],
              }
            }
          } else {
            const thing = getStuff('000')
            updateData = {
              content: `🎉 **Congratulations!** You caught a ${thing.name}!\n\nYou successfully pressed all numbers: ${session.targetNumbers.join(
                ' → ',
              )}`,
              components: [],
            }
          }
        } catch (error) {
          logger.error('Error handling fish catch:', error)
          const thing = getStuff('000')
          updateData = {
            content: `🎉 **Something went wrong, but you still caught a ${
              thing.name
            }!**\n\nYou successfully pressed all numbers: ${session.targetNumbers.join(' → ')}`,
            components: [],
          }
        }

        // Clean up session immediately to prevent double-clicks
        fishingSessions.delete(sessionKey)

        // Update the message
        try {
          await session.originalInteraction.editReply(updateData)
        } catch (updateError) {
          logger.error('Error updating fishing completion:', updateError)
          try {
            await session.originalInteraction.followUp({
              ...updateData,
              ephemeral: true,
            })
          } catch (followUpError) {
            logger.error('Error with follow-up for fishing completion:', followUpError)
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
            logger.error('Error sending public message:', error)
          }
        }
      } else {
        // Move to next number
        const nextUpdateData = {
          content: `🎣 Great throw, watch out, fish is naughty, carefully catch it rhytm!\n\n_Your task is **press the number** shown below in sequence\nFaster press, rarer fish!_\n\nProgress: ${
            session.currentIndex
          }/${session.targetNumbers.length}\nPress the number: ${session.targetNumbers[session.currentIndex]}`,
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
          logger.error('Error updating fishing for next number:', updateError)
          fishingSessions.delete(sessionKey)
        }
      }
    } else {
      // Wrong number pressed - immediately remove session to prevent further clicks
      if (session.timeout) {
        clearTimeout(session.timeout)
      }
      fishingSessions.delete(sessionKey)

      const wrongNumberData = {
        content: `❌❌ **Ehhhh, You missed the rhytm, fish got away!**\n\nYou pressed ${pressedNumber} but needed ${
          session.targetNumbers[session.currentIndex]
        }\n\nThe sequence was: ${session.targetNumbers.join(' → ')}\nTry again!`,
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
        logger.warn(`Failed to process payment for user ${interaction.user.id}: ${paymentResult.error}`)
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
            attachment: computeCDNUrl('store-001'),
            name: 'store-001.webp',
            contentType: 'image/webp',
          },
        ],
      })

      logger.info(`User ${interaction.user.username} (${interaction.user.id}) sold all items for ${result.candiesEarned} candies`)
    } catch (error) {
      logger.error('Error handling sell-all button:', error)

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

    try {
      await interaction.deferReply({ ephemeral: true })

      // Import required dependencies for rod buying

      // Find the rod configuration
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

      console.log(
        `🎣 User ${interaction.user.username} (${interaction.user.id}) attempting to buy ${selectedRod.name} rod for ${selectedRod.price} candies`,
      )

      // Double check user balance
      const currentBalance = await getCandyBalance(interaction.user.id)

      if (currentBalance < selectedRod.price) {
        await interaction.editReply({
          content: `❌ **Insufficient candies!** You need ${selectedRod.price} 🍬 candies but only have ${currentBalance} 🍬.`,
        })
        console.log(`❌ Purchase failed: User ${interaction.user.id} has insufficient balance (${currentBalance}/${selectedRod.price})`)
        return
      }

      // Process payment via Drip API (subtract candies)
      const paymentResult = await processPayment(interaction.user.id, -selectedRod.price) // Negative amount to subtract

      if (!paymentResult.success) {
        await interaction.editReply({
          content: `❌ **Payment processing failed:** ${paymentResult.error || 'Unknown error'}. Please try again later.`,
        })
        console.log(`❌ Payment failed: ${paymentResult.error}`)
        return
      }

      console.log(`✅ Payment success: Deducted ${selectedRod.price} candies from user ${interaction.user.id}`)

      // Add rod to user's inventory
      try {
        const userData = await getUser(interaction.user.id)
        if (!userData) {
          await interaction.editReply({
            content: '❌ **User data not found.** Please contact an admin.',
          })
          return
        }

        // Get current inventory and add the rod
        const currentInventory = await getUserInventory(interaction.user.id)

        if (!currentInventory) {
          await interaction.editReply({
            content: '❌ **Could not load user inventory.** Please contact an admin.',
          })
          return
        }

        // Add rod to rods section using utility function
        const updatedInventory = addToInventory(currentInventory, selectedRod.id, 1, 'rod')

        // Update user inventory in database
        await updateUserInventory(interaction.user.id, updatedInventory)

        console.log(`🎣 Rod purchase successful: User ${interaction.user.id} bought ${selectedRod.name} rod`)
        console.log(`📦 Inventory updated: Added 1x ${selectedRod.name} rod (ID: ${selectedRod.id})`)

        // Send success message
        await interaction.editReply({
          embeds: [
            {
              color: selectedRod.color,
              title: '🎉 Rod Purchase Successful!',
              description: `You have successfully purchased a **${selectedRod.name} Rod**!\n\n${selectedRod.description}`,
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
          `User ${interaction.user.username} (${interaction.user.id}) successfully purchased ${selectedRod.name} rod for ${selectedRod.price} candies`,
        )
      } catch (inventoryError) {
        logger.error('Error updating user inventory after rod purchase:', inventoryError)
        console.log(`❌ Inventory update failed: ${inventoryError}`)

        // If inventory update fails but payment succeeded, we should inform user
        await interaction.editReply({
          content: '⚠️ **Payment processed but inventory update failed.** Please contact an admin with this message for assistance.',
        })
      }
    } catch (error) {
      logger.error('Error handling rod purchase:', error)
      console.log(`❌ Rod purchase error: ${error}`)

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
}
