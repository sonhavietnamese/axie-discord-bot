import { MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js'
import { createCommandConfig } from 'robo.js'
import { ROD_STORE_INTERN_ROLE_ID } from '../../configs/game'
import { addStoreIntern } from '../../services/rod-store'

export const config = createCommandConfig({
  description: 'Hire a store intern',
  integrationTypes: ['GuildInstall'],
  options: [
    {
      name: 'user',
      description: 'The user to hire',
      type: 'user',
      required: true,
    },
  ],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

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
      content: "Bot's role is not high enough to assign this role. Please move the bot's role above the store intern role in the server settings.",
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
    // Assign role to user
    await targetMember.roles.add(role)

    // Get server nickname
    const serverNickname = targetMember.nickname || ''
    const userName = user.globalName || user.username

    const intern = await addStoreIntern(user.id, serverNickname, userName)

    if (!intern) {
      return interaction.editReply({
        content: 'Failed to hire store intern in database.',
      })
    }

    await interaction.editReply({
      content: `<@${user.id}> is now a store intern! 🎉`,
    })
  } catch (error) {
    console.error('Error assigning role:', error)
    await interaction.editReply({
      content: 'Failed to assign role. Please check bot permissions and role hierarchy.',
    })
  }
}
