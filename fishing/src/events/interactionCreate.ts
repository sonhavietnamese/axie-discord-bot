import type { Interaction } from 'discord.js'
import { ComponentType, ButtonStyle } from 'discord.js'
import { logger } from 'robo.js'
import { sellAllItems } from '../services/user'
import { computeCDNUrl, getStuff } from '../libs/utils'
import { CURRENCY_ID, REALM_ID } from '../constants'

export default async (interaction: Interaction) => {
  // Only handle button interactions
  if (!interaction.isButton()) return

  // Handle sell-all button
  if (interaction.customId === 'sell-all') {
    try {
      await interaction.deferReply({ ephemeral: true })

      const result = await sellAllItems(interaction.user.id)

      if (!result.success) {
        return interaction.editReply({
          content: `❌ **Unable to sell items:** ${result.error || 'Unknown error'}`,
        })
      }

      // Update balance via Drip API
      try {
        const dripUserResponse = await fetch(
          `https://api.drip.re/api/v1/realms/${REALM_ID}/members/search?type=discord-id&values=${interaction.user.id}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${process.env.DRIP_API_KEY}`,
            },
          },
        )

        const dripUser = (await dripUserResponse.json()) as { data: { id: string }[] }
        const user = dripUser.data[0]
        if (!user) {
          logger.warn(`User ${interaction.user.id} not found in Drip`)
          return
        }

        const dripResponse = await fetch(`https://api.drip.re/api/v1/realms/${REALM_ID}/members/${user.id}/balance`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${process.env.DRIP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: result.candiesEarned,
            currencyId: CURRENCY_ID,
          }),
        })

        if (!dripResponse.ok) {
          logger.warn(`Failed to update Drip balance for user ${interaction.user.id}: ${dripResponse.status} ${dripResponse.statusText}`)
        } else {
          logger.info(`Successfully updated Drip balance for user ${interaction.user.id} with ${result.candiesEarned} candies`)
        }
      } catch (dripError) {
        logger.error('Error updating Drip balance:', dripError)
        // Don't fail the main operation if Drip API fails
      }

      // Create a detailed summary of sold items
      const soldItemsDetails = Object.entries(result.itemsSold)
        .map(([itemId, quantity]) => {
          const stuff = getStuff(itemId)
          const candiesForItem = Math.floor(stuff.price * quantity)
          return `${stuff.emoji} ${stuff.name} x${quantity} = ${candiesForItem} 🍬`
        })
        .join('\n')

      const totalItemCount = Object.values(result.itemsSold).reduce((sum, qty) => sum + qty, 0)

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
}
