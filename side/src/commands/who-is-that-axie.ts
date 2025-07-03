import { type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { GAME_READY_DURATION, GAME_REMIDER_DURATION } from '../configs/game'
import { AXIE_LOOKUP } from '../constants/axies'
import { pickAxie } from '../libs/utils'
import { gameService } from '../services/game.service'
import { imageService } from '../services/image.service'
import { userService } from '../services/user.service'
import { formatGameResult, formatStreakReward } from '../utils/message.utils'

export const config = createCommandConfig({
  description: 'Who is this axie?',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply()

  const axie = await pickAxie()
  if (!axie) {
    await interaction.editReply({ content: 'All axies have been revealed!' })
    return
  }

  // Create a round
  const round = await gameService.createRound(axie.id)

  // Generate game image
  const gameImage = await imageService.generateGameImage(axie)

  await interaction.editReply({
    content: `**WHO IS THAT AXIE? <:hmm:1390240741111890010>**\n**[ROUND #${
      round.id
    }]**\n\n Guess the axie by using command \`/it-is <axie-name>\`\n\nCorrect guess will share the 🍬 pot\nGet **3 streaks** to claim the won candies 🍬\n\n_Result reveal <t:${Math.floor(
      Date.now() / 1000 + GAME_READY_DURATION,
    )}:R>_`,
    files: [{ attachment: gameImage }],
  })

  // Set up auto-reminder interval (every 5 seconds)
  const reminderInterval = setInterval(async () => {
    try {
      const stats = await gameService.getLiveGameStats(round.id)
      const reminderMessage = formatReminderMessage(stats.participantCount, stats.potSize)

      await interaction.followUp({
        content: reminderMessage,
        ephemeral: false,
      })
    } catch (error) {
      console.error('Failed to send reminder:', error)
    }
  }, GAME_REMIDER_DURATION)

  // Set up reveal timer
  setTimeout(async () => {
    try {
      // Clear the reminder interval when game ends
      clearInterval(reminderInterval)
      await revealGame(interaction, round, axie)
    } catch (error) {
      console.error('Failed to reveal axie:', error)
      // Make sure to clear interval even if reveal fails
      clearInterval(reminderInterval)
    }
  }, GAME_READY_DURATION)
}

function formatReminderMessage(participantCount: number, potSize: number): string {
  const messages = [`<:hmm:1390240741111890010> **REMINDER:** Time to guess! \n${participantCount} players joined • Pot: ${potSize} 🍬`]

  return messages[Math.floor(Math.random() * messages.length)]
}

async function revealGame(interaction: ChatInputCommandInteraction, round: any, axie: any) {
  // Generate reveal image
  const revealImage = await imageService.generateRevealImage(axie)

  // Calculate rewards
  const { totalGuesses, estimatedReward, candiesPerCorrectGuess } = await gameService.calculateRewards(round.id)
  await gameService.updateRewards(round.id, candiesPerCorrectGuess)

  // Get all guesses for streak calculation
  const allGuesses = await gameService.getGuesses(round.id)
  const userIds = [...new Set(allGuesses.map((guess) => guess.userId))]
  const allUsers = await userService.getUsersByIds(userIds)

  // Get previous round participants
  const previousRoundParticipants = await gameService.getPreviousRoundParticipants(round.id)

  // Calculate streak updates
  const { userUpdates, streakMessages, streakRewardUsers } = userService.calculateStreakUpdates(
    allGuesses,
    allUsers,
    previousRoundParticipants,
    round.id - 1,
  )

  // Update user stats
  await userService.batchUpdateUserStats(userUpdates)

  // Send ephemeral streak reward message
  if (streakRewardUsers.includes(interaction.user.id)) {
    const userUpdate = userUpdates[interaction.user.id]
    if (userUpdate) {
      try {
        await interaction.followUp({
          content: formatStreakReward(userUpdate.currentStreak),
          ephemeral: true,
        })
      } catch (error) {
        console.log('Could not send ephemeral streak reward message:', error)
      }
    }
  }

  // Finish the round
  await gameService.revealAxie(axie.id)
  await gameService.finishRound(round.id)

  // Get correct guesses with streak data
  const correctGuesses = await gameService.getCorrectGuessesWithStreaks(round.id)

  const foundLocalAxie = AXIE_LOOKUP[axie.id]

  // Format and send the result
  const resultContent = formatGameResult(
    axie.name,
    foundLocalAxie.sound,
    foundLocalAxie.emoji,
    totalGuesses,
    estimatedReward,
    correctGuesses,
    streakMessages,
  )

  await interaction.followUp({
    content: resultContent,
    files: [{ attachment: revealImage }],
  })
}
