import { Colors, type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig, Flashcore, logger } from 'robo.js'
import { abbreviateNumber } from '../libs/utils'
import { BossHealthMonitor } from '../libs/bossHealthMonitor'

export const config = createCommandConfig({
  description: 'Check the current status of the Chimera',
  contexts: ['Guild'],
  integrationTypes: ['GuildInstall', 'UserInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Status command used by ${interaction.user}`)

  // Defer the reply since image generation might take some time
  await interaction.deferReply()

  const currentBossHealth = await Flashcore.get<number>(`chimera:current-health`)
  const maxBossHealth = await Flashcore.get<number>(`chimera:max-health`)

  // Check if there's no active boss
  if (!maxBossHealth || maxBossHealth <= 0) {
    await interaction.editReply({
      embeds: [
        {
          color: Colors.Red,
          title: 'No Active Chimera',
          description: 'There is no active Chimera. Use `/summon` to summon one!',
        },
      ],
    })
    return
  }

  const healthPercentage = (currentBossHealth / maxBossHealth) * 100

  // Generate current boss image
  const imageBuffer = await BossHealthMonitor.generateBossImage(currentBossHealth, maxBossHealth)

  let statusColor = 0x00ff00 // Green
  let statusText = 'Healthy'

  if (currentBossHealth <= 0) {
    statusColor = 0xffd700 // Gold
    statusText = 'Defeated'
  } else if (healthPercentage <= 10) {
    statusColor = 0x8b0000 // Dark red
    statusText = 'Critical'
  } else if (healthPercentage <= 25) {
    statusColor = 0xff0000 // Red
    statusText = 'Severely Wounded'
  } else if (healthPercentage <= 50) {
    statusColor = 0xffa500 // Orange
    statusText = 'Wounded'
  } else if (healthPercentage <= 75) {
    statusColor = 0xffff00 // Yellow
    statusText = 'Slightly Wounded'
  }

  await interaction.editReply({
    embeds: [
      {
        color: statusColor,
        title: `Chimera Status: ${statusText}`,
        description: `Health: ${abbreviateNumber(currentBossHealth, 2)} / ${abbreviateNumber(maxBossHealth, 2)} (${healthPercentage.toFixed(1)}%)`,
        fields: [
          {
            name: 'Health Percentage',
            value: `${healthPercentage.toFixed(1)}%`,
            inline: true,
          },
          {
            name: 'Status',
            value: statusText,
            inline: true,
          },
        ],
      },
    ],
    files: [
      {
        attachment: Buffer.from(imageBuffer as Buffer),
        contentType: 'image/png',
        name: 'chimera-status.png',
      },
    ],
  })
}
