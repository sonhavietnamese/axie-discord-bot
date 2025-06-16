import { ActivityType } from 'discord.js'
import { client } from 'robo.js'
// import { preload } from '../libs/preload'

export default () => {
  client.user?.setActivity({
    name: 'Releasing the fishes',
    type: ActivityType.Custom,
  })

  // preload()
}
