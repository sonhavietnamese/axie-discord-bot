import { ActivityType } from 'discord.js'
import { client, logger } from 'robo.js'

export default () => {
  logger.info('Discord bot is ready!')

  client.user?.setActivity({
    name: '🔥 Chimera',
    type: ActivityType.Custom,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
}
