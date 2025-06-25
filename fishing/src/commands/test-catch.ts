import { ChannelType, ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { NFTs } from '../configs/nfts'
import { RODS } from '../configs/rods'
import { specialPlayer } from '../libs/nft'
import { catchUnderwaterStuff, computeCDNUrl, getStuff, isWhitelisted, require } from '../libs/utils'
import { getUserRate, handleUserCatch } from '../services/user'

export const config = createCommandConfig({
  description: 'Test command to randomly catch fish/stuff for testing',
  options: [
    {
      name: 'type',
      description: 'Type of catch to test',
      type: 'string',
      choices: [
        { name: 'Random', value: 'random' },
        { name: 'Force NFT', value: 'nft' },
        { name: 'Force Trash', value: 'trash' },
        { name: 'Force Common Fish', value: 'common' },
        { name: 'Force Rare Fish', value: 'rare' },
      ],
      required: false,
    },
  ],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Test-catch command used by ${interaction.user}`)

  await interaction.deferReply({ ephemeral: true })

  try {
    await require(interaction.channel?.type === ChannelType.GuildText, 'This command can only be used in a text channel', interaction)
    await require(isWhitelisted(interaction.guildId, interaction.channelId), 'This command can only be used in whitelisted channels', interaction)
  } catch (error) {
    return
  }

  const testType = interaction.options.getString('type') || 'random'

  // Get user rate for realistic testing
  const userRate = await getUserRate(interaction.user.id)
  if (!userRate) {
    await interaction.editReply({
      content: '❌ Could not get user fishing rates for testing.',
    })
    return
  }

  // Use a default rod for testing
  const configuredRod = RODS[0] // Branch rod for testing

  let caughtStuff: { id: string; newRates: number[] } | undefined = undefined

  // Handle different test types
  switch (testType) {
    case 'nft':
      caughtStuff = {
        id: NFTs[0].id,
        newRates: userRate,
      }
      break

    case 'trash':
      caughtStuff = {
        id: '000',
        newRates: userRate,
      }
      break

    case 'common':
      caughtStuff = {
        id: '001', // Common fish
        newRates: userRate,
      }
      break

    case 'rare':
      caughtStuff = {
        id: '005', // Supreme fish
        newRates: userRate,
      }
      break

    case 'random':
    default:
      // Use normal catch mechanics
      caughtStuff = catchUnderwaterStuff(userRate, configuredRod?.multiplier || [])
      break
  }

  if (!caughtStuff) {
    await interaction.editReply({
      content: '❌ Test failed - could not generate catch.',
    })
    return
  }

  try {
    const stuff = getStuff(caughtStuff.id)

    // Update database
    await handleUserCatch(interaction.user.id, caughtStuff.newRates, caughtStuff.id, interaction.guildId, interaction.channelId)

    // Prepare the message content
    const isTrash = stuff.rank.name.toUpperCase() === 'USELESS'
    const testSequence = ['🧪', '🔬', '⚗️', '🎲'].join(' → ')

    const message = isTrash
      ? `🧪 **TEST CATCH!** You got ${stuff.name}!\n\n**Rarity:** ${stuff.rank.name}\n**Thing:** ${stuff.name}\n\nTest sequence: ${testSequence}\n\n_This was a test catch!_`
      : `🧪 **TEST CATCH!** You caught a ${stuff.name}!\n\n**Rarity:** ${stuff.rank.name}\n**Fish:** ${stuff.name}\n\n**About**: ${
          stuff.description
        }\n\nTest sequence: ${testSequence}\n\n**Test Type**: ${testType.toUpperCase()}`

    const updateData = {
      content: message,
      files: [
        {
          attachment: computeCDNUrl(stuff.image),
          name: `${stuff.image}.png`,
        },
      ],
    }

    await interaction.editReply(updateData)

    // Send public message for rare catches (like real fishing)
    if (interaction.channel && 'send' in interaction.channel && ['supreme', 'monster', 'mythic', 'nft'].includes(stuff.rank.id)) {
      try {
        await interaction.channel.send({
          content: `🧪 **${interaction.user} caught a ${stuff.name} in TEST MODE!**\n\n🐟 **Rarity:** ${stuff.rank.name}\n\n**About**: ${stuff.description}\n\n _This was a test catch!_ `,
          files: [
            {
              attachment: computeCDNUrl(stuff.image),
              name: `${stuff.image}.png`,
            },
          ],
        })
      } catch (error) {
        logger.error('Error sending test public message:', error)
      }
    }

    logger.info(`Test catch completed for ${interaction.user.username}: ${stuff.name} (${stuff.rank.name})`)
  } catch (error) {
    logger.error('Error in test-catch command:', error)
    await interaction.editReply({
      content: '🧪 **Test completed but with errors!** Check logs for details.',
    })
  }
}
