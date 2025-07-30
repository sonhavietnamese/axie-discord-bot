import { ChannelType, ChatInputCommandInteraction, ComponentType } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { createSessionKey, fishingSessions } from '../events/interactionCreate'
import { trackEvent, trackIdentity } from '../libs/tracking'
import { createButtonsWithDistraction, generateRandomNumbers, getRod, getUsableRods, isWhitelisted, require } from '../libs/utils'
import { getOrCreateUser, getUserInventory, getUserRate, handleUserCatch } from '../services/user'

export const config = createCommandConfig({
  description: 'Cast your line and catch a fish',
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  try {
    await require(interaction.channel?.type === ChannelType.GuildText, 'This command can only be used in a text channel', interaction)
    await require(isWhitelisted(interaction.guildId, interaction.channelId), 'This command can only be used in #game-zone', interaction)
  } catch (error) {
    // The require function has already replied to the interaction
    return
  }

  await interaction.deferReply({ ephemeral: true })

  trackIdentity({
    id: interaction.user.id,
    username: interaction.user.username,
    globalName: interaction.user.globalName || interaction.user.username,
  })

  trackEvent({
    id: interaction.user.id,
    event: '/cast',
    action: '/cast',
    action_properties: {
      user_id: interaction.user.id,
      server_id: interaction.guildId,
    },
  })

  // Check if user already has an active fishing session
  const sessionKey = createSessionKey(interaction.user.id, interaction.channelId)
  if (fishingSessions.has(sessionKey)) {
    await interaction.editReply({
      content: '🎣 **You already have an active fishing session!** Complete your current session first.',
    })
    return
  }

  try {
    // Create user if they don't exist
    await getOrCreateUser(interaction.user.id, interaction.user.username || interaction.user.globalName || 'Unknown User')

    // Get user's inventory to check for rods
    const inventory = await getUserInventory(interaction.user.id)

    if (!inventory) {
      await interaction.editReply({
        content: '❌ **Could not load your inventory.** Please try again later.',
      })
      return
    }

    // Get all usable rods (quantity > 0 and usesLeft > 0)
    const usableRods = getUsableRods(inventory)

    if (usableRods.length === 0) {
      await interaction.editReply({
        content:
          '🎣 **No usable rods found!** You need a rod with remaining uses to go fishing.\n\n• Buy a new rod from `/fishing-store rod`\n• Check your rod status with `/rod`',
      })
      return
    }

    // Use the first usable rod
    const selectedRodData = usableRods[0]
    const configuredRod = getRod(selectedRodData.rodId)

    if (!configuredRod) {
      await interaction.editReply({
        content: '❌ **Rod configuration not found.** Please contact an admin.',
      })
      return
    }

    // Get user fishing rates
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

    // Create assignedRod object for compatibility with existing fishing session
    const assignedRod = {
      rod: selectedRodData.rodId,
      uses: selectedRodData.usesLeft, // Track current uses left
    }

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
            content: `⏰ **Time's up!** The fish got away.\n\nThe sequence was: ${targetNumbers.join(' → ')}\n\n🔧 **Rod Status:** ${
              selectedRodData.usesLeft - 1
            } uses left (reduced by 1 for failed attempt)`,
            components: [],
          })
          // Record the failed attempt and reduce rod uses
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
      content: `🎣 **Great throw!** Watch out, fish is naughty, carefully catch it with rhythm!\n\n_Your task is **press the number** shown below in sequence\nFaster press, rarer fish!_\n\n🎣 **Using:** ${configuredRod.emoji} ${configuredRod.name} Rod (${configuredRod.rate}% rate)\n🔧 **Rod Status:** ${selectedRodData.usesLeft} uses left\n\nPress the number: ${targetNumbers[currentIndex]}`,
      components: [
        {
          type: ComponentType.ActionRow,
          components: createButtonsWithDistraction(),
        },
      ],
    })

    logger.info(
      `Started fishing session for ${interaction.user.username} (${interaction.user.id}) in ${interaction.guildId}/${interaction.channelId} with ${configuredRod.name} rod (${selectedRodData.usesLeft} uses left)`,
    )
  } catch (error) {
    logger.error('Error in cast command:', error)
    await interaction.editReply({
      content: '❌ **An error occurred while setting up your fishing session.** Please try again later.',
    })
  }
}
