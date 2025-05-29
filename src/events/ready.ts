import { ActivityType } from 'discord.js'
import { client } from 'robo.js'

/**
 * This event handler will be called when your Robo is logged in and ready.
 * You can get `client` from `robo.js` directly or as a parameter in `ready` events.
 *
 * Learn more about Discord events:
 * https://robojs.dev/discord-bots/events
 */
export default () => {
  client.user?.setActivity({
    name: '🔥 Chimera',
    type: ActivityType.Custom,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
}
