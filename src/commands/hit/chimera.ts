import { Colors, type ChatInputCommandInteraction } from 'discord.js'
import type { CommandOptions, CommandResult } from 'robo.js'
import { createCommandConfig, Flashcore } from 'robo.js'
import { DAMAGE } from '../../constants'
import { abbreviateNumber } from '../../libs/utils'
import { Warrior } from '../../types'

export const config = createCommandConfig({
  description: 'Unlock the hidden prowess of someone',
  contexts: ['Guild'],
  integrationTypes: ['GuildInstall', 'UserInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction, options: CommandOptions<typeof config>): Promise<CommandResult> => {
  const currentBossHealth = await Flashcore.get<number>(`chimera:current-health`)

  // Check if boss is already dead
  if (currentBossHealth <= 0) {
    return {
      embeds: [
        {
          color: Colors.Gold,
          title: 'Chimera Already Defeated!',
          description: 'The Chimera has already been defeated! Wait for a new one to be summoned.',
        },
      ],
    }
  }

  const damage = DAMAGE[Math.floor(Math.random() * DAMAGE.length)]
  const trueDamage = Math.floor(Math.random() * (damage.damage[1] - damage.damage[0] + 1)) + damage.damage[0]

  const maxBossHealth = await Flashcore.get<number>(`chimera:max-health`)

  // Calculate new health, but don't let it go below 0
  const newHealth = Math.max(0, currentBossHealth - trueDamage)

  // Update health and damage tracking
  await Flashcore.set(`chimera:current-health`, newHealth)

  const warriors = (await Flashcore.get<Warrior[]>('warriors')) || []

  const me = warriors.find((warrior) => warrior.id === interaction.user.id)

  if (!me) {
    warriors.push({ id: interaction.user.id, name: interaction.user.displayName, damage: [{ damage: trueDamage, timestamp: Date.now() }] })
  } else {
    me.damage.push({ damage: trueDamage, timestamp: Date.now() })
  }

  await Flashcore.set('warriors', warriors)

  // Debug logging
  console.log(`Health update: ${currentBossHealth} -> ${newHealth} (damage: ${trueDamage})`)

  // Return simple damage feedback - no images needed here
  const healthPercentage = (newHealth / maxBossHealth) * 100

  return {
    embeds: [
      {
        color: damage.color,
        description: `${interaction.user.displayName} hit the Chimera with ${damage.type} damage!`,
        fields: [
          {
            name: '💥 Damage Dealt',
            value: `${abbreviateNumber(trueDamage, 2)}`,
            inline: true,
          },
          {
            name: '❤️ Remaining Health',
            value: `${healthPercentage.toFixed(1)}%`,
            inline: true,
          },
          {
            name: '📊 Live Updates',
            value: 'Check below for real-time status',
            inline: true,
          },
        ],
        footer: {
          icon_url: interaction.user.displayAvatarURL(),
          text: `Hit by @${interaction.user.tag}`,
        },
        title: `${abbreviateNumber(trueDamage, 2)} damage dealt!`,
      },
    ],
  }
}
