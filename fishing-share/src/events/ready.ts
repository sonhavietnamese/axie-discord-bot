import { ActivityType } from 'discord.js'
import { client } from 'robo.js'

export default () => {
  client.user?.setActivity({
    name: 'Releasing the fishes',
    type: ActivityType.Custom,
  })
}
