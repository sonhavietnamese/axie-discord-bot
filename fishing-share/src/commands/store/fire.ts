import { MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig, logger } from 'robo.js'
import { ROD_STORE_INTERN_ROLE_ID } from '../../configs/game'
import { fireStoreIntern } from '../../services/rod-store'
import { trackEvent, trackIdentity } from '../../libs/tracking'
import { isAdmin, isWhitelisted, require } from '../../libs/utils'

export const config = createCommandConfig({
  description: 'Fire a store intern',
  integrationTypes: ['GuildInstall'],
  options: [
    {
      name: 'user',
      description: 'The user to fire',
      type: 'user',
      required: true,
    },
  ],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  try {
    await require(isAdmin(interaction.user.id), 'You must be an admin to use this command', interaction)
    await require(isWhitelisted(interaction.guildId, interaction.channelId), 'This command can only be used in whitelisted channels', interaction)
  } catch (error) {
    // The require function has already replied to the interaction
    return
  }

  logger.info(`[command][/store_fire][${interaction.user.id}][${interaction.user.username}]`)

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  trackIdentity({
    id: interaction.user.id,
    username: interaction.user.username,
    globalName: interaction.user.globalName || interaction.user.username,
  })

  trackEvent({
    id: interaction.user.id,
    event: '/store_fire',
    action: '/store_fire',
    action_properties: {
      user_id: interaction.user.id,
      server_id: interaction.guildId,
    },
  })

  const user = interaction.options.getUser('user')

  if (!user) {
    return interaction.editReply({
      content: 'User not found',
    })
  }

  // Check if bot has permission to manage roles
  const botMember = interaction.guild?.members.me
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.editReply({
      content: 'Bot does not have permission to manage roles. Please grant the "Manage Roles" permission to the bot.',
    })
  }

  // Get the role
  const role = interaction.guild?.roles.cache.get(ROD_STORE_INTERN_ROLE_ID)

  if (!role) {
    return interaction.editReply({
      content: 'Store intern role not found. Please make sure the role exists.',
    })
  }

  // Check if bot's role is higher than the target role
  if (botMember.roles.highest.position <= role.position) {
    return interaction.editReply({
      content: "Bot's role is not high enough to manage this role. Please move the bot's role above the store intern role in the server settings.",
    })
  }

  // Get the target member
  const targetMember = interaction.guild?.members.cache.get(user.id)

  if (!targetMember) {
    return interaction.editReply({
      content: 'User is not a member of this server.',
    })
  }

  try {
    // Remove intern from database first
    const [intern] = await fireStoreIntern(user.id)

    if (!intern) {
      return interaction.editReply({
        content: 'User is not a store intern or failed to remove from database.',
      })
    }

    // Remove role from user
    await targetMember.roles.remove(role)

    await interaction.editReply({
      content: `<@${user.id}> (${intern.serverNickname || intern.userName}) has been fired from store intern position! 🔥`,
    })
  } catch (error) {
    console.error('Error removing role:', error)
    await interaction.editReply({
      content: 'Failed to remove role. Please check bot permissions and role hierarchy.',
    })
  }
}
