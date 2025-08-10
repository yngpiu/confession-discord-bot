const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const logger = require('../logger');

async function registerCommands(client) {
  const commands = [
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('⚙️ Cấu hình bot cho server (admin)')
      .addChannelOption((option) =>
        option
          .setName('forum_channel')
          .setDescription(
            'Channel để đăng confession (forum hoặc text hoặc voice nếu muốn)'
          )
          .setRequired(true)
          .addChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
            ChannelType.GuildForum,
            ChannelType.GuildVoice
          )
      )
      .addChannelOption((option) =>
        option
          .setName('admin_channel')
          .setDescription('Channel để admin xem confession pending')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addRoleOption((option) =>
        option
          .setName('admin_role')
          .setDescription('Role admin để quản lý confession')
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('config')
      .setDescription('🔧 Xem cấu hình bot hiện tại (admin)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('create-guide')
      .setDescription('🧾 Tạo thread hướng dẫn gửi confession (admin)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('pending')
      .setDescription('📋 Xem danh sách confession đang chờ duyệt (admin)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('approved')
      .setDescription('✅ Xem danh sách confession đã được duyệt (admin)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('all')
      .setDescription('📜 Xem toàn bộ danh sách confession (admin)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('approve')
      .setDescription('✅ Duyệt confession bằng ID (admin)')
      .addIntegerOption((option) =>
        option
          .setName('confession_id')
          .setDescription('ID của confession cần duyệt')
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('delete')
      .setDescription('🗑️ Xóa confession bằng ID (admin)')
      .addIntegerOption((option) =>
        option
          .setName('confession_id')
          .setDescription('ID của confession cần xóa')
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('detail')
      .setDescription('🔍 Xem chi tiết confession bằng ID (admin)')
      .addIntegerOption((option) =>
        option
          .setName('confession_id')
          .setDescription('ID của confession cần xem')
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('idol-setup')
      .setDescription('🎭 Cấu hình idol và fan cho kênh này')
      .addStringOption((option) =>
        option.setName('idol_name').setDescription('Tên idol').setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('idol_avatar')
          .setDescription('Link avatar idol')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('fan_name').setDescription('Tên fan').setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('fan_avatar')
          .setDescription('Link avatar fan')
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
      .setName('idol-config')
      .setDescription('🔧 Xem cấu hình idol/fan của kênh này')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
      .setName('idol-remove')
      .setDescription('🗑️ Xóa cấu hình idol/fan khỏi kênh này')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
      .setName('character-config')
      .setDescription('🎭 Cấu hình hệ thống multi-character cho kênh')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
      .setName('character-manage')
      .setDescription('⚙️ Quản lý nhân vật (thêm/xóa/xem danh sách)')
      .addStringOption((option) =>
        option
          .setName('action')
          .setDescription('Hành động cần thực hiện')
          .setRequired(true)
          .addChoices(
            { name: '➕ Thêm nhân vật', value: 'add' },
            { name: '📋 Xem danh sách', value: 'list' },
            { name: '🗑️ Xóa nhân vật', value: 'remove' },
            { name: '⭐ Đặt mặc định', value: 'default' }
          )
      )
      .addStringOption((option) =>
        option
          .setName('name')
          .setDescription('Tên nhân vật (cho add)')
          .setRequired(false)
      )
      .addStringOption((option) =>
        option
          .setName('avatar')
          .setDescription('Avatar nhân vật (cho add)')
          .setRequired(false)
      )
      .addStringOption((option) =>
        option
          .setName('id')
          .setDescription('ID nhân vật (cho remove/default)')
          .setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
      .setName('send')
      .setDescription('📤 Gửi tin nhắn dưới tên nhân vật')
      .addStringOption((option) =>
        option
          .setName('character')
          .setDescription('Chọn nhân vật')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption((option) =>
        option
          .setName('message')
          .setDescription('Nội dung tin nhắn')
          .setRequired(true)
      )
      .addAttachmentOption((option) =>
        option
          .setName('attachment')
          .setDescription('File đính kèm (tùy chọn)')
          .setRequired(false)
      ),
  ];

  try {
    await client.application.commands.set(commands);
    logger.success(`Registered ${commands.length} slash commands`);
  } catch (error) {
    logger.error('Failed to register commands:', error);
    throw error;
  }
}

module.exports = { registerCommands };
