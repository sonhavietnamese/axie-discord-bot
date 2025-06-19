import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { computeCDNUrl, getRod } from '../libs/utils'
import { getUserRod } from '../services/hanana'

export const config = createCommandConfig({
  description: 'View your rod',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  let assignedRod: { rod: string; uses: number } | undefined = undefined
  try {
    assignedRod = await getUserRod(interaction.guildId!, interaction.channelId, interaction.user.id)
  } catch (error) {
    if (error instanceof Error) {
      await interaction.editReply({
        content: `Rod is automatically assigned to you when event start.\n${error.message}`,
      })

      return
    }
  }

  if (!assignedRod) {
    return interaction.editReply({
      content: 'You have not joined any fishing events yet.',
    })
  }

  const rod = getRod(assignedRod.rod)

  if (!rod) {
    return interaction.editReply({
      content: 'You have not been assigned a rod yet.',
    })
  }

  await interaction.editReply({
    embeds: [
      {
        color: rod.color,
        title: `Your get a ${rod.name} Rod!`,
        description: rod.description,
        fields: [
          {
            name: '🎣 Rod',
            value: rod.name,
            inline: true,
          },
          {
            name: '% Rate',
            value: `${rod.rate}%`,
            inline: true,
          },
          {
            name: '⌛ Uses left',
            value: `${rod.uses - assignedRod.uses}/${rod.uses}`,
            inline: true,
          },
        ],
        footer: {
          icon_url: interaction.user.displayAvatarURL(),
          text: interaction.user.globalName || interaction.user.username,
        },
      },
    ],
    files: [
      {
        attachment: computeCDNUrl(rod.image),
        name: `${rod.image}.png`,
      },
    ],
  })
}
