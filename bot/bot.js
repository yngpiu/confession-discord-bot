const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require('discord.js');

const { Confession, GuildSettings, ChannelConfig } = require('./models');
const logger = require('./logger');

// THÊM MỚI: Import cho chức năng idol/fan
const axios = require('axios');
const FormData = require('form-data');

let client;

/**
 * Khởi tạo bot Discord và đăng ký các event listeners
 * @param {Client} discordClient - Discord client instance
 */
async function initializeBot(discordClient) {
  logger.init('Initializing Discord Confession Bot...');
  client = discordClient;

  // Event: Bot ready
  client.once('ready', async () => {
    logger.success(
      `Bot online: ${client.user.tag} | Guilds: ${client.guilds.cache.size}`
    );
    await registerCommands();
  });

  // Event: Interaction created (slash commands, buttons, modals)
  client.on('interactionCreate', async (interaction) => {
    const interactionType = interaction.isChatInputCommand()
      ? 'slash command'
      : interaction.isButton()
      ? 'button'
      : interaction.isModalSubmit()
      ? 'modal'
      : 'unknown';

    logger.user(
      `${interactionType}`,
      interaction.user.tag,
      interaction.guild?.name || 'DM'
    );

    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
      } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
      } else if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction);
      }
    } catch (error) {
      logger.error(`Error handling ${interactionType}:`, error);
      const errorMessage = 'Có lỗi xảy ra khi xử lý lệnh!';

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: errorMessage,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: errorMessage,
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (replyError) {
        logger.error(
          `Failed to send error message for ${interactionType}:`,
          replyError
        );
      }
    }
  });

  // THÊM MỚI: Event listener cho tin nhắn thường (cho chức năng idol/fan)
  client.on('messageCreate', async (message) => {
    try {
      await handleRegularMessage(message);
    } catch (error) {
      logger.error('Error handling regular message:', error);
    }
  });
}

/**
 * Đăng ký tất cả slash commands với Discord API
 */
async function registerCommands() {
  const commands = [
    // ===== CÁC LỆNH CONFESSION CŨ (GIỮ NGUYÊN) =====
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

    // ===== CÁC LỆNH IDOL/FAN MỚI =====
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
  ];

  try {
    await client.application.commands.set(commands);
    logger.success(`Registered ${commands.length} slash commands`);
  } catch (error) {
    logger.error('Failed to register commands:', error);
    throw error;
  }
}

/**
 * Xử lý slash commands
 */
async function handleSlashCommand(interaction) {
  const { commandName } = interaction;
  const startTime = Date.now();

  switch (commandName) {
    // ===== CÁC LỆNH CONFESSION CŨ =====
    case 'setup':
      await handleSetup(interaction);
      break;
    case 'config':
      await handleConfig(interaction);
      break;
    case 'create-guide':
      await handleCreateGuide(interaction);
      break;
    case 'pending':
      await handlePending(interaction);
      break;
    case 'approved':
      await handleApproved(interaction);
      break;
    case 'all':
      await handleAll(interaction);
      break;
    case 'approve':
      await handleApprove(interaction);
      break;
    case 'delete':
      await handleDelete(interaction);
      break;
    case 'detail':
      await handleDetail(interaction);
      break;

    // ===== CÁC LỆNH IDOL/FAN MỚI =====
    case 'idol-setup':
      await handleIdolSetup(interaction);
      break;
    case 'idol-config':
      await handleIdolConfig(interaction);
      break;
    case 'idol-remove':
      await handleIdolRemove(interaction);
      break;

    default:
      logger.warn(`Unknown command: ${commandName}`);
  }

  logger.timing(commandName, Date.now() - startTime);
}

// ===== TẤT CẢ FUNCTIONS CONFESSION CŨ (GIỮ NGUYÊN) =====

/**
 * Cấu hình bot cho server - lưu thông tin forum channel, admin channel và admin role
 */
async function handleSetup(interaction) {
  const forumChannel = interaction.options.getChannel('forum_channel');
  const adminChannel = interaction.options.getChannel('admin_channel');
  const adminRole = interaction.options.getRole('admin_role');

  if (!interaction.guildId) {
    await interaction.reply({
      content:
        '❌ Lệnh này chỉ có thể sử dụng trong server, không thể sử dụng trong DM.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  logger.guild(
    'Setting up bot',
    interaction.guild?.name,
    `(${interaction.guildId})`
  );
  logger.config(
    `Channels: Forum=${forumChannel.id}, Admin=${adminChannel.id}, Role=${adminRole.id}`
  );

  try {
    const existingSettings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });

    if (existingSettings) {
      logger.config(
        `Updating existing settings for guild ${interaction.guildId}`
      );
      existingSettings.forum_channel_id = forumChannel.id;
      existingSettings.admin_channel_id = adminChannel.id;
      existingSettings.admin_role_id = adminRole.id;
      await existingSettings.save();
    } else {
      logger.config(`Creating new settings for guild ${interaction.guildId}`);
      const newSettings = new GuildSettings({
        guild_id: interaction.guildId,
        forum_channel_id: forumChannel.id,
        admin_channel_id: adminChannel.id,
        admin_role_id: adminRole.id,
      });
      await newSettings.save();
    }

    logger.success(`Setup completed for guild: ${interaction.guild.name}`);
    await interaction.reply({
      content: `✅ Đã cấu hình bot thành công!\nForum: ${forumChannel}\nAdmin Channel: ${adminChannel}\nAdmin Role: ${adminRole}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error('Setup failed:', error);

    if (error.code === 11000) {
      logger.error('Duplicate key error details:', {
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
        collection: error.collection,
      });
      try {
        await interaction.reply({
          content:
            '❌ Có lỗi xảy ra với cơ sở dữ liệu. Vui lòng thử lại sau hoặc liên hệ admin để khắc phục.',
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
      return;
    }

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      logger.error('MongoDB error during setup:', error);
      try {
        await interaction.reply({
          content: '❌ Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.',
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        logger.error('Failed to send MongoDB error reply:', replyError);
      }
      return;
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      logger.error('Network/Connection error during setup:', error);
      try {
        await interaction.reply({
          content: '❌ Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.',
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        logger.error('Failed to send network error reply:', replyError);
      }
      return;
    }

    logger.error('Unexpected error during setup:', error);
    try {
      await interaction.reply({
        content: '❌ Có lỗi không xác định xảy ra. Vui lòng thử lại sau.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send generic error reply:', replyError);
    }
  }
}

/**
 * Hiển thị cấu hình hiện tại của server
 */
async function handleConfig(interaction) {
  if (!(await checkAdminPermission(interaction))) return;

  try {
    const settings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });

    if (!settings) {
      await interaction.reply({
        content:
          '⚠️ Server chưa được cấu hình. Hãy sử dụng lệnh `/setup` trước.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Cấu hình hiện tại')
      .setColor(0x00ff00)
      .addFields(
        {
          name: 'Forum Channel',
          value: `<#${settings.forum_channel_id}>`,
          inline: false,
        },
        {
          name: 'Admin Channel',
          value: `<#${settings.admin_channel_id}>`,
          inline: false,
        },
        {
          name: 'Admin Role',
          value: `<@&${settings.admin_role_id}>`,
          inline: false,
        }
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } catch (error) {
    logger.error('Failed to get config:', error);
    try {
      await interaction.reply({
        content: '❌ Lỗi khi lấy thông tin cấu hình. Vui lòng thử lại sau.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send config error reply:', replyError);
    }
  }
}

/**
 * Tạo thread hướng dẫn trong forum channel với các nút gửi confession
 */
async function handleCreateGuide(interaction) {
  if (!(await checkAdminPermission(interaction))) return;

  try {
    const settings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });

    if (!settings) {
      await interaction.reply({
        content:
          '⚠️ Server chưa được cấu hình. Hãy sử dụng lệnh `/setup` trước.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const forumChannel = client.channels.cache.get(settings.forum_channel_id);
    if (!forumChannel) {
      await interaction.reply({
        content: '❌ Không tìm thấy forum channel!',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('📝 Hướng dẫn gửi confession')
      .setDescription(
        'Chọn 1 trong 2 nút dưới để gửi confession.\n' +
          'Bot sẽ gửi tin nhắn riêng để thông báo khi confession của bạn được duyệt.\n\n' +
          '👤 **Gửi hiện tên**\n' +
          '• Hiển thị tên của bạn khi confession được duyệt.\n' +
          '• Nội dung sẽ được duyệt và đăng công khai.\n\n' +
          '🔒 **Gửi ẩn danh**\n' +
          '• Không hiển thị tên của bạn.\n' +
          '• Nội dung sẽ được duyệt và đăng công khai.\n\n' +
          '**Lưu ý:** Tất cả confession đều cần được duyệt trước khi hiển thị.'
      )
      .setColor(0x0099ff);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('send_named')
        .setLabel('👤 Gửi Hiện Tên')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('send_anonymous')
        .setLabel('🔒 Gửi Ẩn Danh')
        .setStyle(ButtonStyle.Secondary)
    );

    const thread = await forumChannel.threads.create({
      name: '💌 GỬI CONFESSION TẠI ĐÂY! 💌',
      message: {
        content: 'Hãy đọc kỹ hướng dẫn trước khi sử dụng.\n\n',
        embeds: [embed],
        components: [row],
      },
    });

    logger.thread('Created guide thread', thread.name);
    await interaction.reply({
      content: '✅ Đã tạo thread hướng dẫn gửi confession.',
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error('Failed to create guide thread:', error);
    try {
      await interaction.reply({
        content: '❌ Lỗi khi tạo thread hướng dẫn. Vui lòng thử lại sau.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send guide thread error reply:', replyError);
    }
  }
}

/**
 * Xử lý các button interactions
 */
async function handleButtonInteraction(interaction) {
  const { customId } = interaction;

  if (customId === 'send_named' || customId === 'send_anonymous') {
    await handleConfessionButtons(interaction);
  } else if (customId.startsWith('anonymous_reply_')) {
    await handleAnonymousReply(interaction);
  } else if (
    customId.startsWith('approve_') ||
    customId.startsWith('reject_')
  ) {
    await handleApprovalButtons(interaction);
  } else if (customId.startsWith('page_')) {
    await handlePaginationButtons(interaction);
  }
}

/**
 * Xử lý nút gửi confession - hiển thị modal để người dùng nhập nội dung
 */
async function handleConfessionButtons(interaction) {
  const isAnonymous = interaction.customId === 'send_anonymous';

  const modal = new ModalBuilder()
    .setCustomId(`confession_modal_${isAnonymous ? 'anon' : 'named'}`)
    .setTitle('Gửi Confession');

  const contentInput = new TextInputBuilder()
    .setCustomId('confession_content')
    .setLabel('Nội dung confession')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000)
    .setPlaceholder('Nhập nội dung confession của bạn...');

  const actionRow = new ActionRowBuilder().addComponents(contentInput);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

/**
 * Xử lý nút Bình luận ẩn danh - hiển thị modal để nhập nội dung trả lời
 */
async function handleAnonymousReply(interaction) {
  const confessionId = interaction.customId.split('_')[2];

  const modal = new ModalBuilder()
    .setCustomId(`reply_modal_${confessionId}`)
    .setTitle(`Bình luận ẩn danh`);

  const contentInput = new TextInputBuilder()
    .setCustomId('reply_content')
    .setLabel('Nội dung bình luận')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000)
    .setPlaceholder('Nhập nội dung bình luận của bạn...');

  const actionRow = new ActionRowBuilder().addComponents(contentInput);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

/**
 * Xử lý modal submissions
 */
async function handleModalSubmit(interaction) {
  if (interaction.customId.startsWith('confession_modal_')) {
    await handleConfessionModalSubmit(interaction);
  } else if (interaction.customId.startsWith('reply_modal_')) {
    await handleReplyModalSubmit(interaction);
  }
}

/**
 * Xử lý submission confession - lưu vào database và gửi đến admin channel
 */
async function handleConfessionModalSubmit(interaction) {
  const isAnonymous = interaction.customId.includes('anon');
  const content = interaction.fields.getTextInputValue('confession_content');

  logger.confession(
    `New submission: ${isAnonymous ? 'Anonymous' : 'Named'}`,
    '',
    `from ${interaction.user.tag}`
  );

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const settings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });

    if (!settings) {
      await interaction.followUp({
        content: '⚠️ Server chưa setup. Admin cần chạy lệnh `/setup`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const lastConfession = await Confession.findOne({
      guild_id: interaction.guildId,
    })
      .sort({ confession_id: -1 })
      .select('confession_id');

    const confessionNumber = lastConfession
      ? lastConfession.confession_id + 1
      : 1;

    const confession = new Confession({
      confession_id: confessionNumber,
      guild_id: interaction.guildId,
      content: content,
      anonymous: isAnonymous,
      user_id: interaction.user.id,
      status: 'pending',
    });

    await confession.save();
    logger.database(`Saved confession #${confessionNumber} to database`);

    const adminChannel = client.channels.cache.get(settings.admin_channel_id);
    if (adminChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`📥 Confession Pending #${confessionNumber}`)
        .setDescription(content)
        .setColor(0xff9900)
        .addFields(
          {
            name: 'Ẩn danh',
            value: isAnonymous ? 'Có' : 'Không',
            inline: true,
          },
          {
            name: 'Người gửi',
            value: isAnonymous ? '🔒 Ẩn danh' : `<@${interaction.user.id}>`,
            inline: false,
          }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`approve_${confessionNumber}`)
          .setLabel('Duyệt')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`reject_${confessionNumber}`)
          .setLabel('Từ chối')
          .setStyle(ButtonStyle.Danger)
      );

      await adminChannel.send({
        embeds: [embed],
        components: [row],
      });
    }

    try {
      await interaction.user.send(
        `📨 Bạn đã gửi confession #${confessionNumber} thành công! Đang chờ admin duyệt.`
      );
      await interaction.followUp({
        content: `✅ Đã gửi confession #${confessionNumber} thành công!`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      await interaction.followUp({
        content: `✅ Đã gửi confession #${confessionNumber} thành công! \n\n __Bật DM để nhận thông báo duyệt.__`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    logger.error('Failed to handle confession submission:', error);
    try {
      await interaction.followUp({
        content: '❌ Lỗi khi gửi confession. Vui lòng thử lại sau.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error(
        'Failed to send confession submission error reply:',
        replyError
      );
    }
  }
}

/**
 * Xử lý Bình luận ẩn danh - gửi tin nhắn vào thread confession
 */
async function handleReplyModalSubmit(interaction) {
  const confessionId = interaction.customId.split('_')[2];
  const replyContent = interaction.fields.getTextInputValue('reply_content');

  try {
    const confession = await Confession.findOne({
      confession_id: parseInt(confessionId),
      guild_id: interaction.guildId,
      status: 'approved',
    });

    if (!confession || !confession.thread_id) {
      await interaction.reply({
        content: '❌ Không tìm thấy confession hoặc thread không tồn tại.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const thread = await client.channels.fetch(confession.thread_id);
    if (!thread) {
      await interaction.reply({
        content: '❌ Không tìm thấy thread của confession.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const replyEmbed = new EmbedBuilder()
      .setDescription(`**Gửi ẩn danh tới tác giả:**\n${replyContent}`)
      .setColor(0x36393f);

    await thread.send({ embeds: [replyEmbed] });
    logger.confession(`Anonymous reply sent`, confessionId);

    await interaction.deferUpdate();
  } catch (error) {
    logger.error('Failed to send anonymous reply:', error);
    await interaction.reply({
      content: '❌ Có lỗi xảy ra khi gửi trả lời.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Xử lý nút duyệt/từ chối confession
 */
async function handleApprovalButtons(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!(await checkAdminPermission(interaction))) return;

  const [action, confessionId] = interaction.customId.split('_');

  try {
    const confession = await Confession.findOne({
      confession_id: parseInt(confessionId),
      guild_id: interaction.guildId,
    });

    if (!confession) {
      return await interaction.followUp({
        content: '❌ Confession không tồn tại!',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (confession.status !== 'pending') {
      return await interaction.followUp({
        content: '❌ Confession này đã được xử lý!',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (action === 'approve') {
      await approveConfession(interaction, confession);
    } else if (action === 'reject') {
      await rejectConfession(interaction, confession);
    }
  } catch (error) {
    logger.error('Error handling approval button:', error);
    await interaction.followUp({
      content: '❌ Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại sau.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Duyệt confession - tạo thread trong forum và cập nhật database
 */
async function approveConfession(interaction, confession) {
  const settings = await GuildSettings.findOne({
    guild_id: interaction.guildId,
  });

  const forumChannel = interaction.client.channels.cache.get(
    settings.forum_channel_id
  );

  if (!forumChannel) {
    return await interaction.followUp({
      content: '❌ Không tìm thấy forum channel!',
      flags: MessageFlags.Ephemeral,
    });
  }

  const user = await interaction.client.users.fetch(confession.user_id);
  const thread = await createConfessionThread(forumChannel, confession, user);

  const replyRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`anonymous_reply_${confession.confession_id}`)
      .setLabel('Bình luận ẩn danh')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💬')
  );

  await thread.send({
    content: '',
    components: [replyRow],
  });

  confession.status = 'approved';
  confession.thread_id = thread.id;
  await confession.save();

  logger.confession('Approved', confession.confession_id);

  await interaction.followUp({
    content: '✅ Đã duyệt và đăng confession lên forum.',
    flags: MessageFlags.Ephemeral,
  });

  try {
    await user.send(
      `📢 Confession #${confession.confession_id} của bạn đã được admin duyệt và đăng công khai.`
    );
  } catch (error) {
    logger.warn('Cannot send DM to user');
  }
}

/**
 * Từ chối confession - xóa khỏi database
 */
async function rejectConfession(interaction, confession) {
  await Confession.deleteOne({
    confession_id: confession.confession_id,
    guild_id: interaction.guildId,
  });

  logger.confession('Rejected', confession.confession_id);

  await interaction.followUp({
    content: '🗑️ Confession đã bị từ chối và xóa khỏi hệ thống.',
    flags: MessageFlags.Ephemeral,
  });

  try {
    const user = await interaction.client.users.fetch(confession.user_id);
    await user.send(
      `❌ Confession #${confession.confession_id} của bạn đã bị admin từ chối.`
    );
  } catch (error) {
    logger.warn('Cannot send DM to user');
  }
}

function findCutPosition(text, maxLength) {
  let cut = text.lastIndexOf('\n', maxLength);
  if (cut >= maxLength * 0.75) return cut;

  cut = text.lastIndexOf('.', maxLength);
  if (cut >= maxLength * 0.75) return cut + 1;

  cut = text.lastIndexOf('!', maxLength);
  if (cut >= maxLength * 0.75) return cut + 1;

  cut = text.lastIndexOf('?', maxLength);
  if (cut >= maxLength * 0.75) return cut + 1;

  cut = text.lastIndexOf(' ', maxLength);
  if (cut > 0) return cut;

  return maxLength;
}

/**
 * Tạo thread trong forum cho confession đã được duyệt
 * Xử lý cả confession ngắn và dài (>2000 ký tự)
 */
async function createConfessionThread(forumChannel, confession, user) {
  const fullContent = confession.content;
  const suffix = '\n\n*Đọc tiếp bên dưới...*';
  const maxLength = 2000;
  const buffer = 50;
  const allowedLength = maxLength - suffix.length - buffer;

  if (fullContent.length <= allowedLength) {
    const creditEmbed = new EmbedBuilder().setColor(0x2b2d31).setFooter({
      text: confession.anonymous
        ? `Confession #${confession.confession_id} • Ẩn danh`
        : `Confession #${confession.confession_id} • Từ @${user.username}`,
    });

    return await forumChannel.threads.create({
      name: `Confession #${confession.confession_id}`,
      message: {
        content: fullContent,
        embeds: [creditEmbed],
      },
    });
  }

  const cutPos = findCutPosition(fullContent, allowedLength);
  const firstPart = fullContent.substring(0, cutPos).trim() + suffix;

  const thread = await forumChannel.threads.create({
    name: `Confession #${confession.confession_id}`,
    message: { content: firstPart },
  });

  let remaining = fullContent.substring(cutPos).trim();
  const MAX_CHUNK_SIZE = 2000;

  while (remaining.length > 0) {
    const chunk =
      remaining.length > MAX_CHUNK_SIZE
        ? remaining.substring(0, MAX_CHUNK_SIZE)
        : remaining;

    await thread.send({ content: chunk });
    remaining = remaining.substring(chunk.length);
  }

  const creditEmbed = new EmbedBuilder().setColor(0x2b2d31).setFooter({
    text: confession.anonymous
      ? `Confession #${confession.confession_id} • Ẩn danh`
      : `Confession #${confession.confession_id} • Từ @${user.username}`,
  });

  await thread.send({ embeds: [creditEmbed] });
  return thread;
}

/**
 * Kiểm tra quyền admin của người dùng
 */
async function checkAdminPermission(interaction) {
  try {
    const settings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });

    if (!settings) {
      await interaction.reply({
        content: '⚠️ Server chưa setup. Admin cần chạy lệnh `/setup`.',
        flags: MessageFlags.Ephemeral,
      });
      return false;
    }

    if (!interaction.member.roles.cache.has(settings.admin_role_id)) {
      await interaction.reply({
        content: '⛔ Bạn không có quyền sử dụng lệnh này.',
        flags: MessageFlags.Ephemeral,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error checking admin permission:', error);
    try {
      await interaction.reply({
        content: '❌ Lỗi kiểm tra quyền admin. Vui lòng thử lại sau.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send admin permission error reply:', replyError);
    }
    return false;
  }
}

// Command handlers
async function handlePending(interaction) {
  if (!(await checkAdminPermission(interaction))) return;
  await showConfessionList(interaction, 'pending');
}

async function handleApproved(interaction) {
  if (!(await checkAdminPermission(interaction))) return;
  await showConfessionList(interaction, 'approved');
}

async function handleAll(interaction) {
  if (!(await checkAdminPermission(interaction))) return;
  await showConfessionList(interaction, null);
}

/**
 * Hiển thị danh sách confession với phân trang
 */
async function showConfessionList(interaction, status, page = 0) {
  const perPage = 5;

  try {
    const query = { guild_id: interaction.guildId };
    if (status) query.status = status;

    const confessions = await Confession.find(query)
      .sort({ confession_id: 1 })
      .skip(page * perPage)
      .limit(perPage);

    const totalCount = await Confession.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

    let title, color;
    if (status === 'pending') {
      title = '📋 Confession Đang Chờ Duyệt';
      color = 0xff9900;
    } else if (status === 'approved') {
      title = '✅ Confession Đã Duyệt';
      color = 0x00ff00;
    } else {
      title = '📜 Tất Cả Confession';
      color = 0x0099ff;
    }

    const embed = new EmbedBuilder().setTitle(title).setColor(color);

    if (confessions.length === 0) {
      embed.setDescription(
        status === 'pending'
          ? '✅ Không có confession nào đang chờ duyệt!'
          : status === 'approved'
          ? '📭 Chưa có confession nào được duyệt!'
          : '📭 Chưa có confession nào!'
      );
    } else {
      for (const confession of confessions) {
        const statusIcon = confession.status === 'approved' ? '✅' : '⏳';
        const anonymousStatus = confession.anonymous ? 'Có' : 'Không';
        const userDisplay = confession.anonymous
          ? '🔒 Ẩn danh'
          : `<@${confession.user_id}>`;

        const contentPreview =
          confession.content.length > 100
            ? confession.content.substring(0, 100) + '...'
            : confession.content;

        const formattedTime = new Date(confession.timestamp).toLocaleDateString(
          'vi-VN',
          {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }
        );

        embed.addFields({
          name: `${statusIcon} Confession #${confession.confession_id}`,
          value: `**Ẩn danh:** ${anonymousStatus}\n**Người gửi:** ${userDisplay}\n**Thời gian:** ${formattedTime}\n**Nội dung:** ${contentPreview}`,
          inline: false,
        });
      }
    }

    embed.setFooter({
      text: `Trang ${page + 1}/${totalPages} • Tổng: ${totalCount} confession`,
    });

    const statusPrefix = status || 'all';
    const prevPage = Math.max(0, page - 1);
    const nextPage = Math.min(totalPages - 1, page + 1);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`page_prev_${statusPrefix}_${prevPage}_${Date.now()}`)
        .setLabel('◀️ Trước')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`page_next_${statusPrefix}_${nextPage}_${Date.now() + 1}`)
        .setLabel('▶️ Sau')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1),
      new ButtonBuilder()
        .setCustomId(`page_refresh_${statusPrefix}_${page}_${Date.now() + 2}`)
        .setLabel('🔄 Làm mới')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error('Error showing confession list:', error);
    try {
      await interaction.reply({
        content:
          '❌ Lỗi khi hiển thị danh sách confession. Vui lòng thử lại sau.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send confession list error reply:', replyError);
    }
  }
}

/**
 * Xử lý nút phân trang
 */
async function handlePaginationButtons(interaction) {
  const customIdParts = interaction.customId.split('_');
  const action = customIdParts[1];
  const status = customIdParts[2];
  const page = parseInt(customIdParts[3]);

  await interaction.deferUpdate();

  try {
    const perPage = 5;
    const query = { guild_id: interaction.guildId };
    if (status !== 'all') query.status = status;

    const confessions = await Confession.find(query)
      .sort({ confession_id: 1 })
      .skip(page * perPage)
      .limit(perPage);

    const totalCount = await Confession.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

    let title, color;
    if (status === 'pending') {
      title = '📋 Confession Đang Chờ Duyệt';
      color = 0xff9900;
    } else if (status === 'approved') {
      title = '✅ Confession Đã Duyệt';
      color = 0x00ff00;
    } else {
      title = '📜 Tất Cả Confession';
      color = 0x0099ff;
    }

    const embed = new EmbedBuilder().setTitle(title).setColor(color);

    if (confessions.length === 0) {
      embed.setDescription(
        status === 'pending'
          ? '✅ Không có confession nào đang chờ duyệt!'
          : status === 'approved'
          ? '📭 Chưa có confession nào được duyệt!'
          : '📭 Chưa có confession nào!'
      );
    } else {
      for (const confession of confessions) {
        const statusIcon = confession.status === 'approved' ? '✅' : '⏳';
        const anonymousStatus = confession.anonymous ? 'Có' : 'Không';
        const userTag = `<@${confession.user_id}>`;
        const contentPreview =
          confession.content.length > 100
            ? confession.content.substring(0, 100) + '...'
            : confession.content;

        const formattedTime = new Date(confession.timestamp).toLocaleDateString(
          'vi-VN',
          {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }
        );

        embed.addFields({
          name: `${statusIcon} Confession #${confession.confession_id}`,
          value: `**Ẩn danh:** ${anonymousStatus}\n**Người gửi:** ${userTag}\n**Thời gian:** ${formattedTime}\n**Nội dung:** ${contentPreview}`,
          inline: false,
        });
      }
    }

    embed.setFooter({
      text: `Trang ${page + 1}/${totalPages} • Tổng: ${totalCount} confession`,
    });

    const prevPage = Math.max(0, page - 1);
    const nextPage = Math.min(totalPages - 1, page + 1);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`page_prev_${status}_${prevPage}_${Date.now()}`)
        .setLabel('◀️ Trước')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`page_next_${status}_${nextPage}_${Date.now() + 1}`)
        .setLabel('▶️ Sau')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1),
      new ButtonBuilder()
        .setCustomId(`page_refresh_${status}_${page}_${Date.now() + 2}`)
        .setLabel('🔄 Làm mới')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    logger.error('Error handling pagination:', error);
    try {
      await interaction.editReply({
        content: '❌ Lỗi khi chuyển trang. Vui lòng thử lại sau.',
        components: [],
      });
    } catch (replyError) {
      logger.error('Failed to send pagination error reply:', replyError);
    }
  }
}

/**
 * Xử lý lệnh duyệt confession bằng ID
 */
async function handleApprove(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const confessionId = interaction.options.getInteger('confession_id');

  if (!confessionId || isNaN(confessionId)) {
    return await interaction.followUp({
      content: '❌ ID confession không hợp lệ, vui lòng nhập số đúng.',
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    const confession = await Confession.findOne({
      confession_id: confessionId,
      guild_id: interaction.guildId,
    });

    if (!confession) {
      return await interaction.followUp({
        content: '❌ Confession không tồn tại!',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (confession.status !== 'pending') {
      return await interaction.followUp({
        content: '❌ Confession này đã được xử lý!',
        flags: MessageFlags.Ephemeral,
      });
    }

    await approveConfession(interaction, confession);
  } catch (error) {
    logger.error('Error handling approve command:', error);
    await interaction.followUp({
      content: '❌ Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại sau.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Xử lý lệnh xóa confession bằng ID
 */
async function handleDelete(interaction) {
  if (!(await checkAdminPermission(interaction))) return;

  const confessionId = interaction.options.getInteger('confession_id');

  try {
    const confession = await Confession.findOne({
      confession_id: confessionId,
      guild_id: interaction.guildId,
    });

    if (!confession) {
      await interaction.reply({
        content: '❌ Không tìm thấy confession với ID này.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (confession.status === 'approved' && confession.thread_id) {
      try {
        const thread = await client.channels.fetch(confession.thread_id);
        if (thread) {
          await thread.delete();
          logger.thread(`Deleted thread for confession`, `#${confessionId}`);
        }
      } catch (error) {
        logger.warn('Thread already deleted or not found');
      }
    }

    await Confession.deleteOne({
      confession_id: confessionId,
      guild_id: interaction.guildId,
    });

    logger.confession('Deleted', confessionId);

    const statusMessage =
      confession.status === 'approved'
        ? `🗑️ Đã xóa confession #${confessionId} khỏi hệ thống và forum!`
        : `🗑️ Đã xóa confession #${confessionId} khỏi hệ thống!`;

    await interaction.reply({
      content: statusMessage,
      flags: MessageFlags.Ephemeral,
    });

    try {
      const user = await client.users.fetch(confession.user_id);
      await user.send(
        `🗑️ Confession #${confessionId} của bạn đã bị admin xóa khỏi hệ thống.`
      );
    } catch (error) {
      logger.warn('Cannot send DM to user');
    }
  } catch (error) {
    logger.error('Error handling delete command:', error);
    try {
      await interaction.reply({
        content: '❌ Lỗi khi xóa confession. Vui lòng thử lại sau.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send delete error reply:', replyError);
    }
  }
}

/**
 * Xử lý lệnh xem chi tiết confession bằng ID
 */
async function handleDetail(interaction) {
  if (!(await checkAdminPermission(interaction))) return;

  const confessionId = interaction.options.getInteger('confession_id');

  try {
    const confession = await Confession.findOne({
      confession_id: confessionId,
      guild_id: interaction.guildId,
    });

    if (!confession) {
      await interaction.reply({
        content: '❌ Không tìm thấy confession với ID này.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const statusColor = confession.status === 'approved' ? 0x00ff00 : 0xff9900;
    const statusIcon = confession.status === 'approved' ? '✅' : '⏳';

    const embed = new EmbedBuilder()
      .setTitle(
        `${statusIcon} Chi Tiết Confession #${confession.confession_id}`
      )
      .setDescription(confession.content)
      .setColor(statusColor)
      .addFields(
        {
          name: 'Ẩn danh',
          value: confession.anonymous ? 'Có' : 'Không',
          inline: true,
        },
        {
          name: 'Trạng thái',
          value:
            confession.status === 'approved' ? 'Đã duyệt' : 'Đang chờ duyệt',
          inline: true,
        },
        {
          name: 'Thời gian gửi',
          value: new Date(confession.timestamp).toLocaleString('vi-VN'),
          inline: false,
        }
      );

    if (!confession.anonymous) {
      embed.addFields({
        name: 'Người gửi',
        value: `<@${confession.user_id}>`,
        inline: true,
      });
    }

    if (confession.status === 'approved' && confession.thread_id) {
      embed.addFields({
        name: 'Thread',
        value: `<#${confession.thread_id}>`,
        inline: false,
      });
    }

    embed.setFooter({
      text: `Guild ID: ${interaction.guildId} | User ID: ${confession.user_id}`,
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } catch (error) {
    logger.error('Error handling detail command:', error);
    try {
      await interaction.reply({
        content: '❌ Lỗi khi lấy chi tiết confession. Vui lòng thử lại sau.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send detail error reply:', replyError);
    }
  }
}

// ===== CÁC FUNCTIONS MỚI CHO CHỨC NĂNG IDOL/FAN =====

/**
 * Hàm helper để lấy config kênh
 */
async function getChannelConfig(channelId) {
  try {
    return await ChannelConfig.findOne({ channel_id: channelId });
  } catch (error) {
    logger.error('Error getting channel config:', error);
    return null;
  }
}

/**
 * Hàm helper để set config kênh
 */
async function setChannelConfig(
  channelId,
  webhookUrl,
  idolName,
  idolAvatar,
  fanName,
  fanAvatar
) {
  try {
    await ChannelConfig.updateOne(
      { channel_id: channelId },
      {
        $set: {
          webhook_url: webhookUrl,
          idol_name: idolName,
          idol_avatar: idolAvatar,
          fan_name: fanName,
          fan_avatar: fanAvatar,
        },
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    logger.error('Error setting channel config:', error);
    return false;
  }
}

/**
 * Xử lý setup idol và fan cho kênh
 */
async function handleIdolSetup(interaction) {
  const idolName = interaction.options.getString('idol_name');
  const idolAvatar = interaction.options.getString('idol_avatar');
  const fanName = interaction.options.getString('fan_name');
  const fanAvatar = interaction.options.getString('fan_avatar');
  const channel = interaction.channel;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Tạo hoặc lấy webhook cho kênh
    let webhook;
    const webhooks = await channel.fetchWebhooks();
    const existingWebhook = webhooks.find((wh) =>
      wh.name.includes('idol_webhook')
    );

    if (existingWebhook) {
      webhook = existingWebhook;
    } else {
      webhook = await channel.createWebhook({
        name: `${idolName}_idol_webhook`,
        reason: 'Setup idol/fan webhook',
      });
    }

    // Lưu config vào database
    const success = await setChannelConfig(
      channel.id,
      webhook.url,
      idolName,
      idolAvatar,
      fanName,
      fanAvatar
    );

    if (success) {
      logger.config(`Setup idol/fan for channel: ${channel.name}`);
      await interaction.followUp({
        content: `✅ Đã setup kênh \`${channel.name}\` với idol **${idolName}** và fan **${fanName}**\n\n**Cách sử dụng:**\n• Tin nhắn thường → hiển thị dưới tên **${idolName}**\n• \`!fan [nội dung]\` → hiển thị dưới tên **${fanName}**`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      throw new Error('Failed to save config to database');
    }
  } catch (error) {
    logger.error('Error in idol setup:', error);
    await interaction.followUp({
      content: '❌ Lỗi khi setup idol/fan. Vui lòng thử lại sau.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Xem cấu hình idol/fan hiện tại
 */
async function handleIdolConfig(interaction) {
  const config = await getChannelConfig(interaction.channel.id);

  if (!config) {
    await interaction.reply({
      content:
        '⚠️ Kênh này chưa được cấu hình idol/fan. Sử dụng `/idol-setup` để cấu hình.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎭 Cấu hình Idol/Fan')
    .setColor(0x00ff00)
    .addFields(
      { name: '🌟 Tên Idol', value: config.idol_name, inline: true },
      { name: '💖 Tên Fan', value: config.fan_name, inline: true },
      { name: '📍 Kênh', value: `<#${interaction.channel.id}>`, inline: false },
      {
        name: '📝 Cách sử dụng',
        value: `• Tin nhắn thường → hiển thị dưới tên **${config.idol_name}**\n• \`!fan [nội dung]\` → hiển thị dưới tên **${config.fan_name}**`,
        inline: false,
      }
    )
    .setThumbnail(config.idol_avatar)
    .setFooter({
      text: 'Bot sẽ tự động xóa tin nhắn gốc và gửi lại qua webhook',
    });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Xóa cấu hình idol/fan
 */
async function handleIdolRemove(interaction) {
  try {
    const result = await ChannelConfig.deleteOne({
      channel_id: interaction.channel.id,
    });

    if (result.deletedCount > 0) {
      await interaction.reply({
        content: '🗑️ Đã xóa cấu hình idol/fan khỏi kênh này.',
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: '⚠️ Kênh này không có cấu hình idol/fan nào.',
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    logger.error('Error removing idol config:', error);
    await interaction.reply({
      content: '❌ Lỗi khi xóa cấu hình.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Xử lý tin nhắn thường để chuyển thành webhook (CHỨC NĂNG MỚI)
 */
/**
 * Xử lý tin nhắn thường để chuyển thành webhook (ĐÃ SỬA LỖI)
 */
/**
 * Xử lý tin nhắn thường để chuyển thành webhook (SỬA LỖI MULTIPLE FILES)
 */
/**
 * Xử lý tin nhắn thường để chuyển thành webhook (SỬA LỖI TIMEOUT)
 */
async function handleRegularMessage(message) {
  // Bỏ qua bot, tin nhắn slash command, và tin nhắn trong DM
  if (message.author.bot || message.content.startsWith('/') || !message.guild) {
    return;
  }

  const config = await getChannelConfig(message.channel.id);
  if (!config) {
    return;
  }

  let content = message.content;
  let username, avatarUrl;

  if (content.startsWith('!fan ')) {
    username = config.fan_name;
    avatarUrl = config.fan_avatar;
    content = content.substring(5);
  } else {
    username = config.idol_name;
    avatarUrl = config.idol_avatar;
  }

  if (!content.trim() && message.attachments.size === 0) {
    return;
  }

  try {
    // GIỚI HẠN SỐ FILE TỐI ĐA
    const MAX_FILES = 10; // Discord limit
    const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB per file
    const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB total

    if (message.attachments.size > MAX_FILES) {
      logger.warn(
        `⚠️ Too many files: ${message.attachments.size}. Max: ${MAX_FILES}`
      );
      return;
    }

    let webhookPayload;
    let requestConfig = {};

    if (message.attachments.size > 0) {
      const formData = new FormData();

      const payload = {
        username: username,
        avatar_url: avatarUrl,
        content: content || '',
      };

      formData.append('payload_json', JSON.stringify(payload));

      let fileIndex = 0;
      let totalSize = 0;
      const attachmentArray = Array.from(message.attachments.values());

      for (const attachment of attachmentArray) {
        try {
          // KIỂM TRA DUNG LƯỢNG FILE
          if (attachment.size > MAX_FILE_SIZE) {
            logger.warn(
              `⚠️ File too large: ${attachment.name} (${attachment.size} bytes). Skipping.`
            );
            continue;
          }

          if (totalSize + attachment.size > MAX_TOTAL_SIZE) {
            logger.warn(
              `⚠️ Total size limit reached. Skipping remaining files.`
            );
            break;
          }

          logger.config(
            `📥 Downloading attachment ${fileIndex}: ${attachment.name} (${attachment.size} bytes)`
          );

          const response = await axios.get(attachment.url, {
            responseType: 'arraybuffer',
            timeout: 30000, // Tăng timeout cho download
            maxRedirects: 5,
            maxContentLength: MAX_FILE_SIZE,
          });

          const fieldName = `files[${fileIndex}]`;

          formData.append(fieldName, Buffer.from(response.data), {
            filename: attachment.name,
            contentType: attachment.contentType || 'application/octet-stream',
          });

          totalSize += response.data.byteLength;
          logger.success(
            `✅ Added ${fieldName}: ${attachment.name} (${response.data.byteLength} bytes)`
          );
          fileIndex++;
        } catch (error) {
          logger.error(
            `❌ Error with attachment ${attachment.name}:`,
            error.message
          );
          // Tiếp tục với files khác
        }
      }

      if (fileIndex === 0) {
        // Không có file nào được xử lý thành công, gửi chỉ text
        webhookPayload = {
          username: username,
          avatar_url: avatarUrl,
          content: content || 'File không thể tải lên.',
        };
        requestConfig = {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        };
      } else {
        logger.config(`📎 Total: ${fileIndex} files, ${totalSize} bytes`);

        webhookPayload = formData;

        // TÍNH TIMEOUT DỰA TRÊN SỐ FILE VÀ DUNG LƯỢNG
        const baseTimeout = 15000; // 15s base
        const fileTimeout = fileIndex * 5000; // +5s per file
        const sizeTimeout = Math.ceil(totalSize / (1024 * 1024)) * 3000; // +3s per MB
        const finalTimeout = Math.min(
          baseTimeout + fileTimeout + sizeTimeout,
          120000
        ); // Max 2 minutes

        requestConfig = {
          headers: { ...formData.getHeaders() },
          timeout: finalTimeout,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        };

        logger.config(`⏱️ Upload timeout: ${finalTimeout}ms`);
      }
    } else {
      // Chỉ có text
      webhookPayload = {
        username: username,
        avatar_url: avatarUrl,
        content: content,
      };

      requestConfig = {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      };
    }

    // GỬI WEBHOOK
    logger.config(
      `🚀 Sending webhook as ${username} (${message.attachments.size} files)`
    );

    await axios.post(config.webhook_url, webhookPayload, requestConfig);

    // XÓA TIN NHẮN GỐC
    await message.delete();
    logger.success(`✅ Success: ${username} in ${message.channel.name}`);
  } catch (error) {
    logger.error('❌ Webhook error:', error.message);

    if (error.code === 'ECONNABORTED') {
      logger.error('🕒 Request timeout - consider reducing file size or count');
    }

    if (error.response) {
      logger.error('Discord API Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }

    // GỬI TIN NHẮN LỖI VÀO KÊNH
    try {
      await message.channel.send({
        content: `⚠️ ${message.author}, không thể gửi tin nhắn qua webhook. Lý do: ${error.message}`,
        reply: { messageReference: message.id, failIfNotExists: false },
      });
    } catch (replyError) {
      logger.error('Cannot send error message:', replyError.message);
    }
  }
}

module.exports = { initializeBot };
