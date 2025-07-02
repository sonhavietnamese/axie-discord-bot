import { ActivityType } from 'discord.js'
import { client } from 'robo.js'

export default () => {
  client.user?.setActivity({
    name: 'Who is this axie?',
    type: ActivityType.Custom,
  })
}
