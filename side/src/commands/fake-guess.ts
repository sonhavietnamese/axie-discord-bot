import { type ChatInputCommandInteraction } from 'discord.js'
import { and, eq } from 'drizzle-orm'
import { createCommandConfig } from 'robo.js'
import { db } from '../libs/database'
import { axiesTable, roundsTable, roundUsersTable, usersTable } from '../schema'
import { randomUUID } from 'node:crypto'

export const config = createCommandConfig({
  description: 'Generate fake guesses for testing',
  integrationTypes: ['GuildInstall'],
  options: [
    {
      name: 'count',
      description: 'Number of fake guesses to generate (default: 5, max: 100)',
      type: 'number',
      required: false,
    },
    {
      name: 'correct-rate',
      description: 'Percentage of correct guesses (0-100, default: 20)',
      type: 'number',
      required: false,
    },
  ],
} as const)

// Realistic fake names for better testing
const FAKE_NAMES = [
  'Alex Hunter',
  'Sam Wilson',
  'Jordan Lee',
  'Casey Brown',
  'Riley Smith',
  'Avery Johnson',
  'Taylor Davis',
  'Morgan Garcia',
  'Cameron Miller',
  'Quinn Anderson',
  'Sage Martinez',
  'River Thompson',
  'Skylar White',
  'Phoenix Jackson',
  'Rowan Harris',
  'Blake Clark',
  'Drew Lewis',
  'Emery Robinson',
  'Finley Walker',
  'Gray Hall',
  'Hayden Allen',
  'Indigo Young',
  'Jasper King',
  'Kennedy Wright',
  'Lennox Lopez',
  'Max Hill',
  'Nova Scott',
  'Ocean Green',
  'Parker Adams',
  'Quinlan Baker',
]

// Common wrong guesses for more realistic testing
const COMMON_WRONG_GUESSES = ['pikachu', 'charmander']

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply()

  try {
    // Get current round
    const [round] = await db.select().from(roundsTable).where(eq(roundsTable.status, 'happening')).limit(1)

    if (!round) {
      await interaction.editReply({
        content: 'No active round found!',
      })
      return
    }

    // Get the axie for this round
    const [axie] = await db.select().from(axiesTable).where(eq(axiesTable.id, round.axieId))

    if (!axie) {
      await interaction.editReply({
        content: 'Could not find axie for current round!',
      })
      return
    }

    const count = Math.min(interaction.options.getNumber('count') || 10, 100) // Cap at 100
    const correctRate = 0.8

    // Generate fake user data
    const fakeUsers: Array<{ id: string; globalName: string; isCorrect: boolean; guess: string }> = []

    for (let i = 0; i < count; i++) {
      const fakeUserId = `fake_${i}`
      const fakeName = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)]
      const isCorrect = Math.random() < correctRate

      let guess: string
      if (isCorrect) {
        guess = axie.name.toLowerCase()
      } else {
        guess = COMMON_WRONG_GUESSES[Math.floor(Math.random() * COMMON_WRONG_GUESSES.length)]
      }

      fakeUsers.push({
        id: fakeUserId,
        globalName: `${fakeName} (Bot)`,
        isCorrect,
        guess,
      })
    }

    // Batch insert users using INSERT OR IGNORE to handle duplicates
    const userInsertValues = fakeUsers.map((user) => ({
      id: user.id,
      globalName: user.globalName,
      score: 0,
      correctGuesses: 0,
      longestStreak: 0,
      currentStreak: 0,
    }))

    // Use transaction for atomic operations
    await db.transaction(async (tx) => {
      // Batch insert users
      if (userInsertValues.length > 0) {
        // Insert users in chunks to avoid SQL limits
        const chunkSize = 20
        for (let i = 0; i < userInsertValues.length; i += chunkSize) {
          const chunk = userInsertValues.slice(i, i + chunkSize)
          try {
            await tx
              .insert(usersTable)
              .values(chunk)
              .onConflictDoUpdate({
                target: [usersTable.id],
                set: {
                  globalName: chunk[0].globalName,
                },
              })
          } catch (error) {
            console.log('Some users already exist, continuing...')
          }
        }
      }

      // Batch insert round guesses
      const roundGuessValues = fakeUsers.map((user) => ({
        id: randomUUID(),
        roundId: round.id.toString(),
        userId: user.id,
        guess: user.guess,
        isCorrect: user.isCorrect,
        candiesWon: 0, // Will be updated when round finishes
      }))

      // Insert guesses in chunks
      const chunkSize = 20
      for (let i = 0; i < roundGuessValues.length; i += chunkSize) {
        const chunk = roundGuessValues.slice(i, i + chunkSize)
        await tx.insert(roundUsersTable).values(chunk)
      }
    })

    const correctCount = fakeUsers.filter((u) => u.isCorrect).length
    const incorrectCount = count - correctCount

    await interaction.editReply({
      content:
        `✅ Generated **${count}** fake guesses for testing!\n\n` +
        `📊 **Stats:**\n` +
        `✅ Correct: ${correctCount} (${Math.round((correctCount / count) * 100)}%)\n` +
        `❌ Incorrect: ${incorrectCount} (${Math.round((incorrectCount / count) * 100)}%)\n` +
        `🎯 Target: **${axie.name}**\n\n` +
        `*All fake users are labeled with "(Bot)" suffix*`,
    })
  } catch (error) {
    console.error('Error generating fake guesses:', error)
    await interaction.editReply({
      content: `❌ Failed to generate fake guesses: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}
