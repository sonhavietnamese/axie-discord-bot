import { Colors, type ChatInputCommandInteraction } from 'discord.js'
import type { CommandOptions, CommandResult } from 'robo.js'
import { createCommandConfig, Flashcore } from 'robo.js'
import { CARDS, DAMAGE } from '../../constants'
import { abbreviateNumber, getCardImage } from '../../libs/utils'
import { LastHit, Warrior } from '../../types'

export const config = createCommandConfig({
  description: 'Deal random damage to the Chimera',
  contexts: ['Guild'],
  integrationTypes: ['GuildInstall', 'UserInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction, options: CommandOptions<typeof config>): Promise<CommandResult> => {
  const currentBossHealth = await Flashcore.get<number>(`chimera:current-health`)

  if (currentBossHealth <= 0) {
    return {
      embeds: [
        {
          color: Colors.Gold,
          title: 'Chimera Already Defeated!',
          description: 'The Chimera has already been defeated! Wait for a new one to be summoned.',
        },
      ],
      ephemeral: true,
    }
  }

  const damage = DAMAGE[Math.floor(Math.random() * DAMAGE.length)]
  const trueDamage = Math.floor(Math.random() * (damage.damage[1] - damage.damage[0] + 1)) + damage.damage[0]
  const card = CARDS[damage.type][Math.floor(Math.random() * CARDS[damage.type].length)]

  const newHealth = Math.max(0, currentBossHealth - trueDamage)

  await Flashcore.set(`chimera:current-health`, newHealth)

  // Store last hit information
  const lastHit: LastHit = {
    userId: interaction.user.id,
    userName: interaction.user.displayName,
    damage: trueDamage,
    damageType: damage.type,
    card: card,
    timestamp: Date.now(),
    healthBefore: currentBossHealth,
    healthAfter: newHealth,
  }

  await Flashcore.set('chimera:last-hit', lastHit)

  const warriors = (await Flashcore.get<Warrior[]>('warriors')) || []

  const me = warriors.find((warrior) => warrior.id === interaction.user.id)

  if (!me) {
    warriors.push({ id: interaction.user.id, name: interaction.user.displayName, damage: [{ damage: trueDamage, timestamp: Date.now() }] })
  } else {
    me.damage.push({ damage: trueDamage, timestamp: Date.now() })
  }

  await Flashcore.set('warriors', warriors)

  console.log(`Health update: ${currentBossHealth} -> ${newHealth} (damage: ${trueDamage})`)

  const leaderboard = warriors.sort(
    (a, b) => b.damage.reduce((acc, curr) => acc + curr.damage, 0) - a.damage.reduce((acc, curr) => acc + curr.damage, 0),
  )

  const myRank = leaderboard.findIndex((warrior) => warrior.id === interaction.user.id)

  const chimeraHealth = await Flashcore.get<number>(`chimera:current-health`)
  const chimeraMaxHealth = await Flashcore.get<number>(`chimera:max-health`)
  const chimeraHealthPercentage = (chimeraHealth / chimeraMaxHealth) * 100

  return {
    embeds: [
      {
        color: damage.color,
        description: `${interaction.user.displayName} used \`${card}\` card hit the Chimera with ${damage.type} damage!`,
        thumbnail: {
          url: getCardImage(card),
        },
        fields: [
          {
            name: '🏆 Rank',
            value: `${myRank + 1}`,
          },

          {
            name: '💥 Damage Dealt',
            value: `${abbreviateNumber(trueDamage, 2)}`,
            inline: true,
          },
          {
            name: '💥 Total Damage',
            value: `${abbreviateNumber(me?.damage.reduce((acc, curr) => acc + curr.damage, 0) || trueDamage, 2)}`,
            inline: true,
          },
          {
            name: '❤️‍🩹 Chimera Health Remaining',
            value: `${chimeraHealthPercentage.toFixed(2)}%`,
          },
        ],
        footer: {
          icon_url: interaction.user.displayAvatarURL(),
          text: ``,
        },
        title: `${abbreviateNumber(trueDamage, 2)} damage dealt!`,
      },
    ],
  }
}
