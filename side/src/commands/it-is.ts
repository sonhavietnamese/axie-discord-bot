import { type ChatInputCommandInteraction } from 'discord.js'
import { and, eq } from 'drizzle-orm'
import { createCommandConfig } from 'robo.js'
import { db } from '../libs/database'
import { axiesTable, roundsTable, roundUsersTable, usersTable } from '../schema'
import { randomUUID } from 'node:crypto'

export const config = createCommandConfig({
  description: 'Who is this axie?',
  integrationTypes: ['GuildInstall'],
  options: [
    {
      name: 'axie',
      description: 'Guess the axie',
      type: 'string',
      required: true,
    },
  ],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({
    flags: 64,
  })

  // get the round is happening
  const [round] = await db.select().from(roundsTable).where(eq(roundsTable.status, 'happening')).limit(1)

  if (!round) {
    await interaction.editReply({
      content: 'No round is happening!',
    })
    return
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, interaction.user.id))

  if (!user) {
    await db.insert(usersTable).values({
      id: interaction.user.id,
      globalName: interaction.user.globalName ?? interaction.user.username,
    })
  }

  // get the axie
  const [axie] = await db.select().from(axiesTable).where(eq(axiesTable.id, round.axieId))

  // store the guess
  // check if the user has already guessed
  const [existingGuess] = await db
    .select()
    .from(roundUsersTable)
    .where(and(eq(roundUsersTable.roundId, round.id.toString()), eq(roundUsersTable.userId, interaction.user.id)))

  if (existingGuess) {
    await interaction.editReply({
      content: 'You have already guessed!',
    })
    return
  }

  // save the guess
  // check if the guess is correct and store the result
  await db.insert(roundUsersTable).values({
    id: randomUUID(),
    roundId: round.id.toString(),
    userId: interaction.user.id,
    guess: interaction.options.getString('axie')!.toLowerCase().trim(),
    isCorrect: interaction.options.getString('axie')!.toLowerCase().trim() === axie.name.toLowerCase().trim(),
  })

  await interaction.editReply({
    content: 'Nice try! Wait for the result.\n\nLet distract others, less win pepo, more candy you get',
  })
}
