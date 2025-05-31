import { ButtonStyle, ChatInputCommandInteraction, ComponentType } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { fishingEventManager } from '../core/fishingEvent'

export const config = createCommandConfig({
  description: 'Cast your line and catch a fish',
} as const)

// Function to generate random numbers array
const generateRandomNumbers = (length: number = 3): number[] => {
  const numbers: number[] = []
  for (let i = 0; i < length; i++) {
    numbers.push(Math.floor(Math.random() * 5) + 1) // Random number 1-5
  }
  return numbers
}

// Function to create buttons with random distraction
const createButtonsWithDistraction = () => {
  const buttons = []
  const distractionIndex = Math.floor(Math.random() * 5) // Random button to distract
  const distractionStyles = [ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary]
  const distractionStyle = distractionStyles[Math.floor(Math.random() * distractionStyles.length)]

  for (let i = 1; i <= 5; i++) {
    buttons.push({
      type: ComponentType.Button,
      label: i.toString(),
      style: i - 1 === distractionIndex ? distractionStyle : ButtonStyle.Primary,
      custom_id: `button_${i}`,
    })
  }

  return buttons
}

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Cast command used by ${interaction.user}`)

  if (!interaction.guildId) {
    await interaction.reply({
      content: '🚫 This command can only be used in a server!',
      ephemeral: true,
    })
    return
  }

  // Check if there's an active fishing event
  if (!fishingEventManager.isEventActive(interaction.guildId)) {
    await interaction.reply({
      content: '🚫 **No active fishing event!**\n\n' + 'Wait for someone to start a fishing event with `/start fishing` or start one yourself!',
      ephemeral: true,
    })
    return
  }

  // Check if the user can fish (is a participant)
  if (!fishingEventManager.canUserFish(interaction.guildId, interaction.user.id)) {
    const timeRemaining = fishingEventManager.getFormattedTimeRemaining(interaction.guildId)
    await interaction.reply({
      content:
        "🚫 **You haven't joined the fishing event!**\n\n" +
        'React with 🎣 on the event announcement message to join the fishing event.\n' +
        `⏰ Time remaining: ${timeRemaining}`,
      ephemeral: true,
    })
    return
  }

  // Generate random numbers for this game
  const targetNumbers = generateRandomNumbers(3)
  let currentIndex = 0

  const timeRemaining = fishingEventManager.getFormattedTimeRemaining(interaction.guildId)

  // Create the fishing message
  const fishingMessage = await interaction.reply({
    content: `🎣 Cast your line and catch a fish!\n\n**Press the number:** ${targetNumbers[currentIndex]}\n⏰ Event time remaining: ${timeRemaining}`,
    components: [
      {
        type: ComponentType.ActionRow,
        components: createButtonsWithDistraction(),
      },
    ],
    ephemeral: true,
    fetchReply: true,
  })

  // Create a button collector
  const collector = fishingMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000, // 30 seconds timeout
  })

  collector.on('collect', async (buttonInteraction) => {
    // Check if the fishing event is still active during the game
    if (!fishingEventManager.canUserFish(interaction.guildId!, interaction.user.id)) {
      await buttonInteraction.update({
        content: '🚫 **Fishing event has ended!** Your fishing attempt was cancelled.',
        components: [],
      })
      collector.stop('event_ended')
      return
    }

    // Extract the number from the button custom_id
    const pressedNumber = parseInt(buttonInteraction.customId.split('_')[1])

    if (pressedNumber === targetNumbers[currentIndex]) {
      currentIndex++

      if (currentIndex >= targetNumbers.length) {
        const thing = randomThing()

        // Send public message to channel automatically
        if (interaction.channel && 'send' in interaction.channel) {
          await interaction.channel.send({
            content: `🎣 **${interaction.user} caught a ${thing.name}!**\n\n*${thing.description}*\n\n${thing.type === 'fish' ? '🐟' : '👢'} Type: ${
              thing.type.charAt(0).toUpperCase() + thing.type.slice(1)
            }\n⚖️ Weight: ${thing.weight}${thing.type === 'fish' ? ' lbs' : ' kg'}`,
          })
        }

        // User completed all numbers correctly
        await buttonInteraction.update({
          content: `🎉 **Congratulations!** You caught a ${thing.name}!\n\nYou successfully pressed all numbers: ${targetNumbers.join(' → ')}`,
          components: [],
        })
        collector.stop('completed')
      } else {
        // Move to next number
        const currentTimeRemaining = fishingEventManager.getFormattedTimeRemaining(interaction.guildId!)
        await buttonInteraction.update({
          content: `🎣 Cast your line and catch a fish!\n\n✅ Progress: ${currentIndex}/${targetNumbers.length}\n**Press the number:** ${targetNumbers[currentIndex]}\n⏰ Event time remaining: ${currentTimeRemaining}`,
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
        content: `❌ **Wrong number!** You pressed ${pressedNumber} but needed ${
          targetNumbers[currentIndex]
        }\n\nThe sequence was: ${targetNumbers.join(' → ')}`,
        components: [],
      })
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

const getObjects = () => [
  {
    type: 'object',
    name: 'Boots',
    description: 'Who threw the boots?',
    weight: 1,
  },
  {
    type: 'object',
    name: 'Pan',
    description: "Is that Pomodoro's pan?",
    weight: 1,
  },
  {
    type: 'object',
    name: 'Moss',
    description: 'Can I eat that?',
    weight: 1,
  },
]

const getFish = () => [
  {
    type: 'fish',
    name: 'Salmon',
    description: 'A delicious fish that is a great source of protein.',
    weight: 10,
  },
  {
    type: 'fish',
    name: 'Tuna',
    description: 'A delicious fish that is a great source of protein.',
    weight: 20,
  },
  {
    type: 'fish',
    name: 'Shrimp',
    description: 'A delicious fish that is a great source of protein.',
    weight: 30,
  },
  {
    type: 'fish',
    name: 'Crab',
    description: 'A delicious fish that is a great source of protein.',
    weight: 40,
  },
]

const randomThing = () => {
  const things = [...getObjects(), ...getFish()]
  return things[Math.floor(Math.random() * things.length)]
}
