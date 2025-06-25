import { ChannelType, ChatInputCommandInteraction, ComponentType } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { RODS } from '../configs/rods'
import { createSessionKey, fishingSessions } from '../events/interactionCreate'
import { createButtonsWithDistraction, generateRandomNumbers, isWhitelisted, require } from '../libs/utils'
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

  // Check if user already has an active fishing session
  const sessionKey = createSessionKey(interaction.user.id, interaction.channelId)
  if (fishingSessions.has(sessionKey)) {
    await interaction.editReply({
      content: '🎣 **You already have an active fishing session!** Complete your current session first.',
    })
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
  const targetNumbers = generateRandomNumbers(3)
  let currentIndex = 0

  // Create fishing session
  const fishingSession = {
    userId: interaction.user.id,
    channelId: interaction.channelId,
    guildId: interaction.guildId!,
    targetNumbers,
    currentIndex,
    userRate,
    configuredRod,
    assignedRod,
    originalInteraction: interaction,
    startTime: Date.now(),
    timeout: setTimeout(async () => {
      // Handle timeout
      try {
        await interaction.editReply({
          content: `⏰ **Time's up!** The fish got away.\n\nThe sequence was: ${targetNumbers.join(' → ')}`,
          components: [],
        })
        // Record the failed attempt
        await handleUserCatch(interaction.user.id, userRate, null, interaction.guildId, interaction.channelId)
      } catch (timeoutError) {
        logger.error('Error handling fishing timeout:', timeoutError)
      }
      // Clean up session
      fishingSessions.delete(sessionKey)
    }, 60000),
  }

  fishingSessions.set(sessionKey, fishingSession)

  await interaction.editReply({
    content: `🎣 Great throw, watch out, fish is naughty, carefully catch it rhytm!\n\n_Your task is **press the number** shown below in sequence\nFaster press, rarer fish!_\n\nPress the number: ${targetNumbers[currentIndex]}`,
    components: [
      {
        type: ComponentType.ActionRow,
        components: createButtonsWithDistraction(),
      },
    ],
  })

  logger.info(`Started fishing session for ${interaction.user.username} (${interaction.user.id}) in ${interaction.guildId}/${interaction.channelId}`)
}
