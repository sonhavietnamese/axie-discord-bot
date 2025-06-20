import { ChannelType, ChatInputCommandInteraction, ComponentType, MessageFlags } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { NFTs } from '../configs/nfts'
import { RODS } from '../configs/rods'
import { specialPlayer } from '../libs/nft'
import {
  catchUnderwaterStuff,
  computeCDNUrl,
  createButtonsWithDistraction,
  generateRandomNumbers,
  getStuff,
  isWhitelisted,
  randomInRange,
  require,
} from '../libs/utils'
import { getUserRod } from '../services/hanana'
import { getUserRate, handleUserCatch } from '../services/user'

export const config = createCommandConfig({
  description: 'Cast your line and catch a fish',
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Cast command used by ${interaction.user}`)

  await interaction.deferReply({ ephemeral: true })

  try {
    await require(interaction.channel?.type === ChannelType.GuildText, 'This command can only be used in a text channel', interaction)
    await require(isWhitelisted(interaction.guildId, interaction.channelId), 'This command can only be used in whitelisted channels', interaction)
  } catch (error) {
    // The require function has already replied to the interaction
    return
  }

  // TODO: Check if user has joined the fishing event and has a rod
  let assignedRod: { rod: string; uses: number } | undefined = undefined

  try {
    assignedRod = await getUserRod(interaction.guildId!, interaction.channelId, interaction.user.id)
  } catch (error) {
    if (error instanceof Error) {
      await interaction.editReply({
        content: error.message,
      })

      return
    }
  }

  if (!assignedRod) {
    await interaction.editReply({
      content: 'You do not have any rods yet.',
    })
    return
  }

  const configuredRod = RODS.find((rod) => rod.id === assignedRod.rod)
  const isRodBroken = (configuredRod?.uses || 0) - (assignedRod.uses || 0) <= 0

  if (isRodBroken) {
    await interaction.editReply({
      content: 'Your rod is broken.',
    })
    return
  }

  if (!configuredRod) {
    await interaction.editReply({
      content: 'Your rod is not configured correctly. Please contact an admin.',
    })
    return
  }

  const userRate = await getUserRate(interaction.user.id)

  if (!userRate) {
    await interaction.editReply({
      content: 'Fishing string is broken. What a bad luck! Try again later.',
    })
    return
  }

  // Generate random numbers for this game
  const targetNumbers = generateRandomNumbers(randomInRange(3, 7))
  let currentIndex = 0

  // Create the fishing message
  const fishingMessage = await interaction.editReply({
    content: `🎣 Great throw, watch out, fish is naughty, carefully catch it rhytm!\n\n_Your task is **press the number** shown below in sequence\nFaster press, rarer fish!_\n\nPress the number: ${targetNumbers[currentIndex]}`,
    components: [
      {
        type: ComponentType.ActionRow,
        components: createButtonsWithDistraction(),
      },
    ],

    // ephemeral: true,
    // fetchReply: true,
  })

  // Create a button collector
  const collector = fishingMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30_000, // 20 seconds timeout
  })

  collector.on('collect', async (buttonInteraction) => {
    const pressedNumber = parseInt(buttonInteraction.customId.split('_')[1])

    if (pressedNumber === targetNumbers[currentIndex]) {
      currentIndex++

      if (currentIndex >= targetNumbers.length) {
        // Player completed all numbers - handle the completion
        let updateData: any = null
        let publicMessageData: any = null

        try {
          // Get a random fish from database
          let caughtStuff: { id: string; newRates: number[] } | undefined = undefined

          if (specialPlayer.enabled && specialPlayer.id === interaction.user.id && specialPlayer.turn === assignedRod.uses) {
            caughtStuff = {
              id: NFTs[0].id,
              newRates: userRate,
            }
          }

          if (!caughtStuff) {
            caughtStuff = catchUnderwaterStuff(userRate, configuredRod?.multiplier || [])
          }

          if (caughtStuff) {
            const stuff = getStuff(caughtStuff.id)

            // Do database operations BEFORE preparing the interaction update
            await handleUserCatch(interaction.user.id, caughtStuff.newRates, caughtStuff.id, interaction.guildId, interaction.channelId)

            // Prepare the message content
            const isTrash = stuff.rank.name.toUpperCase() === 'USELESS'
            const message = isTrash
              ? `🎉 **Not bad!** You caught ${stuff.name}!\n\n**Rarity:** ${stuff.rank.name}\n**Thing:** ${
                  stuff.name
                }\n\nYou successfully pressed all numbers: ${targetNumbers.join(' → ')}\n\n_You can use it to throw at <@852110112264945704>!_`
              : `🎉 **Congratulations!** You caught a ${stuff.name}!\n\n**Rarity:** ${stuff.rank.name}\n**Fish:** ${stuff.name}\n\n**About**: ${
                  stuff.description
                }\n\nYou successfully pressed all numbers: ${targetNumbers.join(' → ')}`

            // Prepare update data
            updateData = {
              content: message,
              components: [],
              files: [
                {
                  attachment: computeCDNUrl(stuff.image),
                  name: `${stuff.image}.png`,
                },
              ],
            }

            // Prepare public message data if it's a rare catch
            if (interaction.channel && 'send' in interaction.channel && ['supreme', 'monster', 'mythic', 'nft'].includes(stuff.rank.id)) {
              publicMessageData = {
                content: `🎣 **${interaction.user} caught a ${stuff.name}!**\n\n🐟 **Rarity:** ${stuff.rank.name}\n\n**About**: ${stuff.description}\n\n _Reaction to share the luck_ `,
                files: [
                  {
                    attachment: computeCDNUrl(stuff.image),
                    name: `${stuff.image}.png`,
                  },
                ],
                emoji: stuff.emoji,
              }
            }
          } else {
            // Fallback if no fish in database
            const thing = getStuff('000')
            updateData = {
              content: `🎉 **Congratulations!** You caught a ${thing.name}!\n\nYou successfully pressed all numbers: ${targetNumbers.join(' → ')}`,
              components: [],
            }
          }
        } catch (error) {
          logger.error('Error handling fish catch:', error)
          // Prepare fallback update data
          const thing = getStuff('000')
          updateData = {
            content: `🎉 **Something went wrong, but you still caught a ${
              thing.name
            }!**\n\nYou successfully pressed all numbers: ${targetNumbers.join(' → ')}`,
            components: [],
          }
        }

        // Now update the interaction ONCE with the prepared data
        try {
          await buttonInteraction.update(updateData)
        } catch (updateError) {
          logger.error('Error updating button interaction:', updateError)
          // If update fails, the interaction might have expired - don't try again
        }

        // Send public message if prepared (this happens after interaction is updated)
        if (publicMessageData && interaction.channel && 'send' in interaction.channel) {
          try {
            const publicMessage = await interaction.channel.send({
              content: publicMessageData.content,
              files: publicMessageData.files,
            })
            await publicMessage.react('🔥')
            await publicMessage.react(publicMessageData.emoji)
          } catch (error) {
            logger.error('Error sending public message:', error)
            // This is non-critical, don't throw
          }
        }
        collector.stop('completed')
      } else {
        // Move to next number
        try {
          await buttonInteraction.update({
            content: `🎣 Great throw, watch out, fish is naughty, carefully catch it rhytm!\n\n_Your task is **press the number** shown below in sequence\nFaster press, rarer fish!_\n\nProgress: ${currentIndex}/${targetNumbers.length}\nPress the number: ${targetNumbers[currentIndex]}`,
            components: [
              {
                type: ComponentType.ActionRow,
                components: createButtonsWithDistraction(),
              },
            ],
          })
        } catch (updateError) {
          logger.error('Error updating interaction for next number:', updateError)
          collector.stop('error')
        }
      }
    } else {
      // Wrong number pressed
      try {
        await buttonInteraction.update({
          content: `❌❌ **Ehhhh, You missed the rhytm, fish got away!**\n\nYou pressed ${pressedNumber} but needed ${
            targetNumbers[currentIndex]
          }\n\nThe sequence was: ${targetNumbers.join(' → ')}\nTry again!`,
          components: [],
        })
        await handleUserCatch(interaction.user.id, userRate, null, interaction.guildId, interaction.channelId)
        collector.stop('failed')
      } catch (updateError) {
        logger.error('Error updating interaction for wrong number:', updateError)
        collector.stop('error')
      }
    }
  })

  // collector.on('end', (collected, reason) => {
  //   if (reason === 'time') {
  //     interaction.editReply({
  //       content: `⏰ **Time's up!** The fish got away.\n\nThe sequence was: ${targetNumbers.join(' → ')}`,
  //       components: [],
  //     })
  //   }
  // })
}
