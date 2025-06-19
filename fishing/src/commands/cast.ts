import { ChannelType, ChatInputCommandInteraction, ComponentType } from 'discord.js'
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
  const isRodBroken = (configuredRod?.uses || 0) - (assignedRod.uses || 0 + 1) <= 0

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
    time: 20_000, // 20 seconds timeout
  })

  collector.on('collect', async (buttonInteraction) => {
    const pressedNumber = parseInt(buttonInteraction.customId.split('_')[1])

    if (pressedNumber === targetNumbers[currentIndex]) {
      currentIndex++

      if (currentIndex >= targetNumbers.length) {
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
            await handleUserCatch(interaction.user.id, caughtStuff.newRates, caughtStuff.id, interaction.guildId, interaction.channelId)

            // User completed all numbers correctly - prepare the message content
            const isTrash = stuff.rank.name.toUpperCase() === 'USELESS'
            const message = isTrash
              ? `🎉 **Not bad!** You caught ${stuff.name}!\n\n**Rarity:** ${stuff.rank.name}\n**Thing:** ${
                  stuff.name
                }\n\nYou successfully pressed all numbers: ${targetNumbers.join(' → ')}\n\n_You can use it to throw at <@852110112264945704>!_`
              : `🎉 **Congratulations!** You caught a ${stuff.name}!\n\n**Rarity:** ${stuff.rank.name}\n**Fish:** ${stuff.name}\n\n**About**: ${
                  stuff.description
                }\n\nYou successfully pressed all numbers: ${targetNumbers.join(' → ')}`

            // FIRST: Acknowledge the button interaction immediately to prevent timeout
            await buttonInteraction.update({
              content: message,
              components: [],
              files: [
                {
                  attachment: computeCDNUrl(stuff.image),
                  name: `${stuff.image}.png`,
                },
              ],
            })

            // THEN: Send public message to channel if it's a rare catch (after button interaction is acknowledged)
            if (
              interaction.channel &&
              'send' in interaction.channel &&
              ['legendary', 'supreme', 'monster', 'mythic', 'nft'].includes(stuff.rank.id)
            ) {
              try {
                const publicMessage = await interaction.channel.send({
                  content: `🎣 **${interaction.user} caught a ${stuff.name}!**\n\n🐟 **Rarity:** ${stuff.rank.name}\n\n**About**: ${stuff.description}\n\n _Reaction to share the luck_ `,
                  files: [
                    {
                      attachment: computeCDNUrl(stuff.image),
                      name: `${stuff.image}.png`,
                    },
                  ],
                })
                await publicMessage.react('🔥')
                await publicMessage.react(stuff.emoji)
              } catch (error) {
                logger.error('Error sending public message:', error)
                // Don't throw here as the main interaction was already handled successfully
              }
            }
          } else {
            // Fallback to old system if no fish in database
            const thing = getStuff('000')
            await buttonInteraction.update({
              content: `🎉 **Congratulations!** You caught a ${thing.name}!\n\nYou successfully pressed all numbers: ${targetNumbers.join(' → ')}`,
              components: [],
            })
          }
        } catch (error) {
          logger.error('Error handling fish catch:', error)
          // Fallback to old system on error
          const thing = getStuff('000')
          await buttonInteraction.update({
            content: `🎉 **Congratulations!** You caught a ${thing.name}!\n\nYou successfully pressed all numbers: ${targetNumbers.join(' → ')}`,
            components: [],
          })
        }
        collector.stop('completed')
      } else {
        // Move to next number
        // const currentTimeRemaining = fishingEventManager.getFormattedTimeRemaining(interaction.guildId!)
        await buttonInteraction.update({
          content: `🎣 Great throw, watch out, fish is naughty, carefully catch it rhytm!\n\n_Your task is **press the number** shown below in sequence\nFaster press, rarer fish!_\n\nProgress: ${currentIndex}/${targetNumbers.length}\nPress the number: ${targetNumbers[currentIndex]}`,
          components: [
            {
              type: ComponentType.ActionRow,
              components: createButtonsWithDistraction(),
            },
          ],
        })
      }
    } else {
      // Wrong number pressed
      await buttonInteraction.update({
        content: `❌❌ **Ehhhh, You missed the rhytm, fish got away!**\n\nYou pressed ${pressedNumber} but needed ${
          targetNumbers[currentIndex]
        }\n\nThe sequence was: ${targetNumbers.join(' → ')}\nTry again!`,
        components: [],
      })
      await handleUserCatch(interaction.user.id, userRate, null, interaction.guildId, interaction.channelId)
      collector.stop('failed')
    }
  })

  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      interaction.editReply({
        content: `⏰ **Time's up!** The fish got away.\n\nThe sequence was: ${targetNumbers.join(' → ')}`,
        components: [],
      })
    }
  })
}
