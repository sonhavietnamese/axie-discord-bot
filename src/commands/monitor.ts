import { Colors, type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig, Flashcore, logger } from 'robo.js'
import { isAdmin, require } from '../libs/utils'
import { BossHealthMonitor } from '../libs/bossHealthMonitor'

export const config = createCommandConfig({
  description: 'Start or stop automatic health monitoring',
  options: [
    {
      name: 'action',
      description: 'Action to perform',
      type: 'string',
      required: true,
      choices: [
        { name: 'Start monitoring', value: 'start' },
        { name: 'Stop monitoring', value: 'stop' },
        { name: 'Status', value: 'status' },
      ],
    },
  ],
  contexts: ['Guild'],
  integrationTypes: ['GuildInstall', 'UserInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Monitor command used by ${interaction.user}`)
  await require(isAdmin(interaction.user.id), 'You are not authorized to control monitoring', interaction)

  const action = interaction.options.getString('action', true)

  switch (action) {
    case 'start':
      await interaction.deferReply()

      const maxHealth = await Flashcore.get<number>('chimera:max-health')
      if (!maxHealth || maxHealth <= 0) {
        await interaction.editReply({
          embeds: [
            {
              color: Colors.Red,
              title: 'No Active Chimera',
              description: 'There is no active Chimera to monitor. Use `/summon` to summon one first!',
            },
          ],
        })
        return
      }

      const liveStatusMessage = await BossHealthMonitor.startAutoMonitoring(interaction)

      if (liveStatusMessage) {
        await interaction.editReply({
          embeds: [
            {
              color: Colors.Green,
              title: '✅ Auto-monitoring Started',
              description: 'Live health monitoring is now active! The status message will update automatically every 30 seconds.',
            },
          ],
        })
      } else {
        await interaction.editReply({
          embeds: [
            {
              color: Colors.Red,
              title: '❌ Failed to Start Monitoring',
              description: 'Could not start auto-monitoring. Please try again or use `/status` for manual checks.',
            },
          ],
        })
      }
      break

    case 'stop':
      BossHealthMonitor.stopAutoMonitoring()

      await interaction.reply({
        embeds: [
          {
            color: Colors.Orange,
            title: '⏹️ Auto-monitoring Stopped',
            description: 'Live health monitoring has been disabled. Use `/monitor start` to resume or `/status` for manual checks.',
          },
        ],
        ephemeral: true,
      })
      break

    case 'status':
      // Check if monitoring is active
      const isActive = BossHealthMonitor.isMonitoringActive()

      await interaction.reply({
        embeds: [
          {
            color: isActive ? Colors.Green : Colors.Red,
            title: '📊 Monitoring Status',
            description: isActive
              ? '✅ Auto-monitoring is **ACTIVE**\nLive status updates every 3 seconds'
              : '❌ Auto-monitoring is **INACTIVE**\nUse `/monitor start` to enable',
            fields: [
              {
                name: 'Commands',
                value: '• `/monitor start` - Start auto-monitoring\n• `/monitor stop` - Stop auto-monitoring\n• `/status` - Manual health check',
                inline: false,
              },
            ],
          },
        ],
        ephemeral: true,
      })
      break
  }
}
