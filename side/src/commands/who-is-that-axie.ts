import { type ChatInputCommandInteraction } from 'discord.js'
import { and, count, eq, inArray } from 'drizzle-orm'
import nodeHtmlToImage from 'node-html-to-image'
import { createCommandConfig } from 'robo.js'
import sharp from 'sharp'
import { GAME_READY_DURATION } from '../configs/game'
import { axiesImages, backgroundsImages, font } from '../core/preload'
import { db } from '../libs/database'
import { formatReward, pickAxie } from '../libs/utils'
import { axiesTable, roundsTable, roundUsersTable, usersTable } from '../schema'

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

  // create a round
  const [round] = await db.insert(roundsTable).values({ axieId: axie.id, status: 'happening' }).returning()

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
      mask: axiesImages[axie.id],
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
    content: `*Who is this axie?*\n\n Guess the axie in the chat!\n\n Result reveal in 3 minutes.`,
    files: [
      {
        attachment: resizedImage,
      },
    ],
  })

  setTimeout(async () => {
    try {
      const revealHtml = `
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
              position: relative;
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
              position: absolute;
              top: 40%;
              left: 50%;
              transform: translate(-50%, -50%);
              z-index: 2;
            }

            .axie-image {
              width: 875px;
              height: 875px;
              object-fit: contain;
              position: absolute;
              top: 0;
              left: 0;
            }

            .text-container {
              position: absolute;
              top: 90%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
              z-index: 3;
              color: #ffffff;
              font-size: 40px;
            }
          </style>
          <body>
            <div class="background-container">
              <img src="{{{background}}}" class="background-image" />
            </div>
            <div class="axie-container">
              <img src="{{{axie}}}" class="axie-image" />
            </div>

            <div class="text-container">
              <h1 class="text">{{axieName}}</h1>
            </div>
          </body>
        </html>`

      const revealImage = await nodeHtmlToImage({
        html: revealHtml,
        content: {
          font,
          axie: axiesImages[axie.id],
          background: backgroundsImages['reveal'],
          axieName: axie.name,
        },
      })

      const revealBuffer = await sharp(revealImage as Buffer)
        .resize(1920, 1350)
        .jpeg({
          quality: 80,
          progressive: true,
        })
        .toBuffer()

      // get all guesses (both correct and incorrect)
      const allGuesses = await db.select().from(roundUsersTable).where(eq(roundUsersTable.roundId, round.id.toString()))

      //get total of guesses
      const totalGuesses = await db.select({ count: count() }).from(roundUsersTable).where(eq(roundUsersTable.roundId, round.id.toString()))
      const estimatedReward = Math.ceil(totalGuesses[0].count / 2)

      // Calculate candies per correct guess
      const correctGuesses = await db
        .select()
        .from(roundUsersTable)
        .where(and(eq(roundUsersTable.roundId, round.id.toString()), eq(roundUsersTable.isCorrect, true)))
      const candiesPerCorrectGuess = correctGuesses.length > 0 ? estimatedReward / correctGuesses.length : 0

      // Update candies won for correct guesses in batch
      if (correctGuesses.length > 0 && candiesPerCorrectGuess > 0) {
        const correctGuessIds = correctGuesses.map((guess) => guess.id)
        await db
          .update(roundUsersTable)
          .set({ candiesWon: candiesPerCorrectGuess })
          .where(and(eq(roundUsersTable.roundId, round.id.toString()), eq(roundUsersTable.isCorrect, true)))
      }

      // Prepare user updates for efficient batch processing
      const streakMessages: string[] = []
      const userUpdates: Record<string, { currentStreak: number; longestStreak: number; correctGuesses: number }> = {}
      const streakRewardUsers: string[] = []

      // Get all users involved in this round in a single query
      const userIds = [...new Set(allGuesses.map((guess) => guess.userId))]

      // Get all users with a single WHERE IN query
      const allUsers = await db
        .select()
        .from(usersTable)
        .where(userIds.length === 1 ? eq(usersTable.id, userIds[0]) : inArray(usersTable.id, userIds))

      // Get previous round participants to check for consecutive participation
      const previousRoundId = round.id - 1
      let previousRoundParticipants: Set<string> = new Set()

      if (previousRoundId > 0) {
        const previousRoundGuesses = await db
          .select({ userId: roundUsersTable.userId })
          .from(roundUsersTable)
          .where(eq(roundUsersTable.roundId, previousRoundId.toString()))

        previousRoundParticipants = new Set(previousRoundGuesses.map((g) => g.userId))
      }

      // Create a lookup map for efficient user data access
      const userLookup = new Map(allUsers.map((user) => [user.id, user]))

      for (const guess of allGuesses) {
        const user = userLookup.get(guess.userId)

        if (user) {
          let newCurrentStreak = user.currentStreak
          let newLongestStreak = user.longestStreak
          let newCorrectGuesses = user.correctGuesses

          // Check if user participated in previous round (for consecutive streak)
          const participatedInPreviousRound = previousRoundId <= 0 ? true : previousRoundParticipants.has(guess.userId)

          if (guess.isCorrect) {
            if (participatedInPreviousRound) {
              // Consecutive participation - increment streak
              newCurrentStreak = user.currentStreak + 1
            } else {
              // Missed previous round - reset streak to 1
              if (user.currentStreak >= 2) {
                // Add blame message for breaking streak by missing round
                const missedRoundBlames = [
                  `💔 <@${guess.userId}> had a ${user.currentStreak}-streak but missed round ${previousRoundId}! Streak reset! 😢`,
                  `🏃‍♂️ <@${guess.userId}> went AWOL during round ${previousRoundId} and lost their ${user.currentStreak}-streak! 🤦‍♂️`,
                  `😴 <@${guess.userId}> took a nap during round ${previousRoundId} and their ${user.currentStreak}-streak went poof! 💨`,
                  `🎯 <@${guess.userId}> was correct but skipped round ${previousRoundId}! ${user.currentStreak}-streak broken! ⛓️‍💥`,
                ]
                const randomMissedBlame = missedRoundBlames[Math.floor(Math.random() * missedRoundBlames.length)]
                streakMessages.push(randomMissedBlame)
              }
              newCurrentStreak = 1 // Start new streak
            }

            newCorrectGuesses = user.correctGuesses + 1
            newLongestStreak = Math.max(user.longestStreak, newCurrentStreak)

            // Check for streak milestone (3+)
            if (newCurrentStreak >= 3) {
              streakRewardUsers.push(guess.userId)
            }
          } else {
            // Incorrect guess - check if they had a 2-streak and blame them
            if (user.currentStreak === 2) {
              const blameMessages = [
                `💀 RIP <@${guess.userId}>'s streak! Had 2 in a row and fumbled the bag! 🤦‍♂️`,
                `😭 <@${guess.userId}> was SO CLOSE to glory but choked at the finish line! 2-streak gone! 💔`,
                `🤡 <@${guess.userId}> really thought they were the main character with that 2-streak... NOPE! 🎪`,
                `⚰️ Press F for <@${guess.userId}>'s 2-streak. Gone but not forgotten... Actually, we're laughing! 😂`,
                `🎭 <@${guess.userId}> peaked at 2 and said "nah, I'm good" 🤷‍♂️ What a legend!`,
              ]
              const randomBlame = blameMessages[Math.floor(Math.random() * blameMessages.length)]
              streakMessages.push(randomBlame)
            }
            // Reset streak
            newCurrentStreak = 0
          }

          // Store user update data for batch processing
          userUpdates[guess.userId] = {
            currentStreak: newCurrentStreak,
            longestStreak: newLongestStreak,
            correctGuesses: newCorrectGuesses,
          }
        }
      }

      // Batch update user stats using transaction
      await db.transaction(async (tx) => {
        for (const [userId, updates] of Object.entries(userUpdates)) {
          await tx
            .update(usersTable)
            .set({
              currentStreak: updates.currentStreak,
              longestStreak: updates.longestStreak,
              correctGuesses: updates.correctGuesses,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(usersTable.id, userId))
        }
      })

      // Send ephemeral streak message to the interaction user if they achieved a streak
      if (streakRewardUsers.includes(interaction.user.id)) {
        const userUpdate = userUpdates[interaction.user.id]
        if (userUpdate) {
          try {
            await interaction.followUp({
              content: `🔥 **STREAK MASTER!** 🔥\n\nYou're on fire with a **${userUpdate.currentStreak} streak**!\n\n*Special rewards are coming your way... 👀*`,
              ephemeral: true,
            })
          } catch (error) {
            console.log('Could not send ephemeral streak reward message:', error)
          }
        }
      }

      await db.update(axiesTable).set({ isRevealed: true }).where(eq(axiesTable.id, axie.id))
      await db.update(roundsTable).set({ status: 'finished' }).where(eq(roundsTable.id, round.id))

      // Get correct guesses with user streak data in a single JOIN query
      const correctGuessesWithStreaks = await db
        .select({
          id: roundUsersTable.id,
          roundId: roundUsersTable.roundId,
          userId: roundUsersTable.userId,
          guess: roundUsersTable.guess,
          isCorrect: roundUsersTable.isCorrect,
          candiesWon: roundUsersTable.candiesWon,
          currentStreak: usersTable.currentStreak,
          globalName: usersTable.globalName,
        })
        .from(roundUsersTable)
        .innerJoin(usersTable, eq(roundUsersTable.userId, usersTable.id))
        .where(and(eq(roundUsersTable.roundId, round.id.toString()), eq(roundUsersTable.isCorrect, true)))

      let content = `🎉 It's **${axie.name}**!\n\nTotal guesses: ${
        totalGuesses[0].count
      }\nEstimated reward: ${estimatedReward} candy\n\nCorrect guess: ${correctGuessesWithStreaks
        .map((guess, index) => {
          const streakDisplay = guess.currentStreak > 0 ? ` (🔥${guess.currentStreak} streak)` : ''
          return `${index + 1}. <@${guess.userId}> - ${formatReward(guess.candiesWon)} candy${streakDisplay}`
        })
        .join('\n')}`

      // Add streak blame messages if any
      if (streakMessages.length > 0) {
        content += '\n\n**STREAK CASUALTIES:**\n' + streakMessages.join('\n')
      }

      await interaction.followUp({
        content,
        files: [
          {
            attachment: revealBuffer,
          },
        ],
      })
    } catch (error) {
      console.error('Failed to reveal axie:', error)
    }
  }, GAME_READY_DURATION)
}
