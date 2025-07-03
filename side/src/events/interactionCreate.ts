import type { Interaction } from 'discord.js'
import nodeHtmlToImage from 'node-html-to-image'
import sharp from 'sharp'
import { desc, eq } from 'drizzle-orm'
import { apiService } from '../services/api.service'
import { formatReward } from '../libs/utils'
import { checkStreakRewardQualification } from '../utils/streak.utils'
import { db } from '../libs/database'
import { roundsTable, roundUsersTable } from '../schema'

import { axiesImages, backgroundsImages, font } from '../core/preload'

// Axie metadata – keep it in sync with the command definition
const axies = [
  { id: '001', name: 'Krio' },
  { id: '002', name: 'Machito' },
  { id: '003', name: 'Olek' },
  { id: '004', name: 'Puff' },
  { id: '005', name: 'Buba' },
  { id: '006', name: 'Hope' },
  { id: '007', name: 'Rouge' },
  { id: '008', name: 'Noir' },
  { id: '009', name: 'Ena' },
  { id: '010', name: 'Xia' },
  { id: '011', name: 'Tripp' },
  { id: '012', name: 'Momo' },
]

export default async (interaction: Interaction) => {
  // Handle button interactions
  if (interaction.isButton()) {
    // Handle streak reward claim button
    if (interaction.customId.startsWith('claim_streak_reward:')) {
      const parts = interaction.customId.split(':')
      const [, userId, candiesStr, streakRoundsStr, startRoundIdStr, endRoundIdStr] = parts

      const candies = parseFloat(candiesStr)
      const streakRounds = parseInt(streakRoundsStr)
      const startRoundId = parseInt(startRoundIdStr)
      const endRoundId = parseInt(endRoundIdStr)

      // Verify the user clicking is the same user who can claim
      if (interaction.user.id !== userId) {
        await interaction.reply({
          content: '❌ You can only claim your own streak rewards!',
          ephemeral: true,
        })
        return
      }

      // Acknowledge the interaction
      await interaction.deferReply({ flags: 64 })

      try {
        // CRITICAL: Re-validate the streak before allowing the claim
        // Get current round ID
        const [latestRound] = await db.select({ id: roundsTable.id }).from(roundsTable).orderBy(desc(roundsTable.id)).limit(1)

        const currentRoundId = latestRound?.id

        // Get user's current guess history
        const userGuesses = await db
          .select({
            roundId: roundUsersTable.roundId,
            isCorrect: roundUsersTable.isCorrect,
            candiesWon: roundUsersTable.candiesWon,
          })
          .from(roundUsersTable)
          .innerJoin(roundsTable, eq(roundUsersTable.roundId, roundsTable.id))
          .where(eq(roundUsersTable.userId, userId))
          .orderBy(desc(roundsTable.id))

        // Re-check if the user still qualifies for this specific streak
        const streakRevalidation = await checkStreakRewardQualification(userId, userGuesses, currentRoundId)

        // Check if the streak is still valid and matches the button's parameters
        const isStreakStillValid =
          streakRevalidation.qualified &&
          streakRevalidation.startRoundId === startRoundId &&
          streakRevalidation.endRoundId === endRoundId &&
          streakRevalidation.streakRounds === streakRounds

        if (!isStreakStillValid) {
          // Streak is no longer valid, show error and disable button
          let errorMessage = '❌ **Streak No Longer Valid!**\n\n'

          if (streakRevalidation.currentRoundSkipped) {
            errorMessage += `You skipped round ${currentRoundId} after this button was created, which broke your streak.\n\n`
          } else if (streakRevalidation.alreadyClaimed) {
            errorMessage += `This streak has already been claimed.\n\n`
          } else if (!streakRevalidation.qualified) {
            errorMessage += `Your streak is no longer valid due to: ${streakRevalidation.details}\n\n`
          } else {
            errorMessage += `The streak parameters have changed since this button was created.\n\n`
          }

          errorMessage += `🎯 **Use /guess-history to see your current streak status!**`

          await interaction.editReply({
            content: errorMessage,
          })

          // Try to disable the button in the original message
          try {
            const originalMessage = await interaction.message.fetch()
            const updatedComponents = originalMessage.components.map((row) => {
              const actionRow = row.toJSON()
              if (actionRow.type === 1 && actionRow.components) {
                actionRow.components = actionRow.components.map((component: any) => {
                  if (component.type === 2 && component.custom_id?.startsWith('claim_streak_reward:')) {
                    return {
                      ...component,
                      disabled: true,
                      label: 'Streak Expired ❌',
                      style: 4, // Danger style (red)
                    }
                  }
                  return component
                })
              }
              return actionRow
            })

            await interaction.message.edit({
              content: originalMessage.content + `\n\n❌ **Streak Expired!** This reward is no longer available.`,
              components: updatedComponents as any,
            })
          } catch (messageError) {
            // If we can't update the original message (e.g., it was deleted), just log it
            console.warn('Could not update original message after streak expiry:', messageError)
          }
          return
        }

        // Streak is still valid, proceed with the claim
        const result = await apiService.claimStreakReward(userId, candies, streakRounds, startRoundId, endRoundId)

        if (result.success) {
          await interaction.editReply({
            content: `✅ ${result.message}\n\n🎯 **Keep playing to build a new streak!** Your next streak will start fresh from round ${
              endRoundId + 1
            }.`,
          })

          // Try to disable the button after successful claim
          try {
            const originalMessage = await interaction.message.fetch()
            const updatedComponents = originalMessage.components.map((row) => {
              const actionRow = row.toJSON()
              if (actionRow.type === 1 && actionRow.components) {
                // ActionRow type
                actionRow.components = actionRow.components.map((component: any) => {
                  if (component.type === 2 && component.custom_id?.startsWith('claim_streak_reward:')) {
                    return {
                      ...component,
                      disabled: true,
                      label: 'Reward Claimed ✅',
                    }
                  }
                  return component
                })
              }
              return actionRow
            })

            await interaction.message.edit({
              content: originalMessage.content + `\n\n💰 **Reward Claimed!** Next streak starts from Round ${endRoundId + 1}`,
              components: updatedComponents as any,
            })
          } catch (messageError) {
            // If we can't update the original message (e.g., it was deleted), just log it
            // The reward claim was successful, so we don't want to fail the entire operation
            console.warn('Could not update original message after successful reward claim:', messageError)
          }
        } else {
          await interaction.editReply({
            content: result.message,
          })
        }
      } catch (error) {
        console.error('Error claiming streak reward:', error)
        await interaction.editReply({
          content: '❌ An error occurred while claiming your reward. Please try again later.',
        })
      }
      return
    }
  }

  // Handle select menu interactions (existing code)
  if (!interaction.isStringSelectMenu()) return

  // Only handle the select menu from our command
  if (interaction.customId !== 'axie_select') return

  const selectedId = interaction.values[0]
  const axie = axies.find((a) => a.id === selectedId)

  if (!axie) {
    await interaction.reply({ content: '❌ Unknown Axie selected.', ephemeral: true })
    return
  }

  // Acknowledge the interaction early to avoid the 3-second timeout
  await interaction.deferReply({ ephemeral: true })

  // Generate the reveal image
  const image = await nodeHtmlToImage({
    html: `
      <html>
     <style> 
      @font-face {
        font-family: 'Rowdies';
        src: url('{{{font}}}') format('truetype');
      }
      body {
        width: 1920px;
        height: 1350px;
        background-color: #ffffff;
        font-family: 'Rowdies';

      }

      .background-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
      }

      .axie-container {
        width: 875px;
        height: 875px;
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -35%);
        z-index: 2;
      }

      .axie-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .axie-mask {
        width: 875px;
        height: 875px;
        background-color: #603E1C;
        position: absolute;
        top: 273px;
        left: 523px;
        -webkit-mask: url('{{{mask}}}') no-repeat center;
        mask: url('{{{mask}}}') no-repeat center;
        -webkit-mask-size: contain;
        mask-size: contain;
      }


      </style> 
        <body>
          <div class="background-container"> 
            <img src="{{{background}}}" class="background-image" />
          </div>
          <div class="axie-container"> 
            <div class="axie-mask"></div>
          </div>
        </body>
      </html>`,
    content: {
      font,
      mask: axiesImages[selectedId],
      background: backgroundsImages['question'],
    },
  })

  const resizedImage = await sharp(image as Buffer)
    .resize(1920, 1350)
    .jpeg({
      quality: 80,
      progressive: true,
    })
    .toBuffer()

  await interaction.editReply({
    content: `🎉 You revealed **${axie.name}**!`,
    files: [
      {
        attachment: resizedImage,
        name: `axie-${selectedId}.jpeg`,
        contentType: 'image/jpeg',
      },
    ],
  })
}
