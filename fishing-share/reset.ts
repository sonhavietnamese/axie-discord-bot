import { REST } from 'discord.js'
import { Routes } from 'discord-api-types/v10'

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN)

async function clearCommands() {
  try {
    console.log('Deleting global commands...')
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: [] })

    console.log('Deleting guild commands...')
    const guildId = '1346284479391600661'
    await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId), { body: [] })

    console.log('All commands cleared!')
  } catch (error) {
    console.error('Failed to clear commands:', error)
  }
}

clearCommands()
