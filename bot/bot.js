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
const { Confession, GuildSettings } = require('./models');

let client;

/**
 * Khởi tạo bot Discord và đăng ký các event listeners
 * @param {Client} discordClient - Discord client instance
 */
async function initializeBot(discordClient) {
  console.log('🤖 Initializing Discord Confession Bot...');
  client = discordClient;

  // Event: Bot ready
  client.once('ready', async () => {
    console.log(
      `✅ Bot online: ${client.user.tag} | Guilds: ${client.guilds.cache.size}`
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

    console.log(
      `🎯 ${interactionType} from ${interaction.user.tag} in ${
        interaction.guild?.name || 'DM'
      }`
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
      console.error(`❌ Error handling ${interactionType}:`, error.message);

      const errorMessage = 'Có lỗi xảy ra khi xử lý lệnh!';
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
    }
  });
}

/**
 * Đăng ký tất cả slash commands với Discord API
 */
async function registerCommands() {
  const commands = [
    // Admin setup command
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
          // Loại này cho phép hầu hết các channel text-based hiện ra (Forum, Text, etc)
          .addChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
            ChannelType.GuildForum,
            ChannelType.GuildVoice // Nếu bạn muốn cho phép chọn voice cũng được (thường không cần)
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

    // View current config
    new SlashCommandBuilder()
      .setName('config')
      .setDescription('🔧 Xem cấu hình bot hiện tại (admin)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // Create guide thread
    new SlashCommandBuilder()
      .setName('create-guide')
      .setDescription('🧾 Tạo thread hướng dẫn gửi confession (admin)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // View confession lists
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

    // Manual approve/delete/detail commands
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
  ];

  try {
    await client.application.commands.set(commands);
    console.log(`✅ Registered ${commands.length} slash commands`);
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
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
    default:
      console.log(`⚠️ Unknown command: ${commandName}`);
  }

  console.log(
    `⏱️ Command ${commandName} executed in ${Date.now() - startTime}ms`
  );
}

/**
 * Cấu hình bot cho server - lưu thông tin forum channel, admin channel và admin role
 */
async function handleSetup(interaction) {
  const forumChannel = interaction.options.getChannel('forum_channel');
  const adminChannel = interaction.options.getChannel('admin_channel');
  const adminRole = interaction.options.getRole('admin_role');

  try {
    // Lưu cấu hình vào database
    await GuildSettings.findOneAndUpdate(
      { guild_id: interaction.guildId },
      {
        guild_id: interaction.guildId,
        forum_channel_id: forumChannel.id,
        admin_channel_id: adminChannel.id,
        admin_role_id: adminRole.id,
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Setup completed for guild: ${interaction.guild.name}`);

    await interaction.reply({
      content: `✅ Đã cấu hình bot thành công!\nForum: ${forumChannel}\nAdmin Channel: ${adminChannel}\nAdmin Role: ${adminRole}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
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
    console.error('❌ Failed to get config:', error);
    throw error;
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

    // Tạo embed hướng dẫn
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

    // Tạo các nút hành động
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

    // Tạo thread trong forum
    const thread = await forumChannel.threads.create({
      name: '💌 GỬI CONFESSION TẠI ĐÂY! 💌',
      message: {
        content: 'Hãy đọc kỹ hướng dẫn trước khi sử dụng.\n\n',
        embeds: [embed],
        components: [row],
      },
    });

    console.log(`✅ Created guide thread: ${thread.name}`);

    await interaction.reply({
      content: '✅ Đã tạo thread hướng dẫn gửi confession.',
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('❌ Failed to create guide thread:', error);
    throw error;
  }
}

/**
 * Xử lý các button interactions
 */
async function handleButtonInteraction(interaction) {
  const { customId } = interaction;

  // Xử lý nút gửi confession
  if (customId === 'send_named' || customId === 'send_anonymous') {
    await handleConfessionButtons(interaction);
  }
  // Xử lý nút Bình luận ẩn danh
  else if (customId.startsWith('anonymous_reply_')) {
    await handleAnonymousReply(interaction);
  }
  // Xử lý nút duyệt/từ chối confession
  else if (customId.startsWith('approve_') || customId.startsWith('reject_')) {
    await handleApprovalButtons(interaction);
  }
  // Xử lý nút phân trang
  else if (customId.startsWith('page_')) {
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

  console.log(
    `📨 New confession: ${isAnonymous ? 'Anonymous' : 'Named'} from ${
      interaction.user.tag
    }`
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

    // Tìm ID confession tiếp theo
    const lastConfession = await Confession.findOne({
      guild_id: interaction.guildId,
    })
      .sort({ confession_id: -1 })
      .select('confession_id');

    const confessionNumber = lastConfession
      ? lastConfession.confession_id + 1
      : 1;

    // Lưu confession vào database
    const confession = new Confession({
      confession_id: confessionNumber,
      guild_id: interaction.guildId,
      content: content,
      anonymous: isAnonymous,
      user_id: interaction.user.id,
      status: 'pending',
    });

    await confession.save();
    console.log(`✅ Saved confession #${confessionNumber} to database`);

    // Gửi đến admin channel để duyệt
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

    // Thử gửi DM cho người dùng
    try {
      await interaction.user.send(
        `📨 Bạn đã gửi confession #${confessionNumber} thành công! Đang chờ admin duyệt.`
      );

      await interaction.followUp({
        content: `✅ Đã gửi confession #${confessionNumber} thành công!`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      // Không thể gửi DM - có thể user tắt DM
      await interaction.followUp({
        content: `✅ Đã gửi confession #${confessionNumber} thành công! \n\n __Bật DM để nhận thông báo duyệt.__`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    console.error('❌ Failed to handle confession submission:', error);
    throw error;
  }
}

/**
 * Xử lý Bình luận ẩn danh - gửi tin nhắn vào thread confession
 */
async function handleReplyModalSubmit(interaction) {
  const confessionId = interaction.customId.split('_')[2];
  const replyContent = interaction.fields.getTextInputValue('reply_content');

  try {
    // Kiểm tra confession có tồn tại và đã được duyệt không
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

    // Lấy thread và gửi reply
    const thread = await client.channels.fetch(confession.thread_id);
    if (!thread) {
      await interaction.reply({
        content: '❌ Không tìm thấy thread của confession.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Tạo embed cho Bình luận ẩn danh
    const replyEmbed = new EmbedBuilder()
      .setDescription(`**Gửi ẩn danh tới tác giả:**\n${replyContent}`)
      .setColor(0x36393f);

    await thread.send({ embeds: [replyEmbed] });
    console.log(`💬 Anonymous reply sent to confession #${confessionId}`);

    // Đóng modal mà không hiển thị gì
    await interaction.deferUpdate();
  } catch (error) {
    console.error('❌ Failed to send anonymous reply:', error);
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
  await interaction.deferReply({ ephemeral: true });

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
        ephemeral: true,
      });
    }

    if (confession.status !== 'pending') {
      return await interaction.followUp({
        content: '❌ Confession này đã được xử lý!',
        ephemeral: true,
      });
    }

    if (action === 'approve') {
      await approveConfession(interaction, confession);
    } else if (action === 'reject') {
      await rejectConfession(interaction, confession);
    }
  } catch (error) {
    console.error('❌ Error handling approval button:', error);
    await interaction.followUp({
      content: '❌ Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại sau.',
      ephemeral: true,
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
      ephemeral: true,
    });
  }

  const user = await interaction.client.users.fetch(confession.user_id);
  const thread = await createConfessionThread(forumChannel, confession, user);

  // Thêm nút Bình luận ẩn danh
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

  // Cập nhật database
  confession.status = 'approved';
  confession.thread_id = thread.id;
  await confession.save();

  console.log(`✅ Approved confession #${confession.confession_id}`);

  await interaction.followUp({
    content: '✅ Đã duyệt và đăng confession lên forum.',
    ephemeral: true,
  });

  // Thông báo cho người dùng
  try {
    await user.send(
      `📢 Confession #${confession.confession_id} của bạn đã được admin duyệt và đăng công khai.`
    );
  } catch (error) {
    console.log('❌ Cannot send DM to user');
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

  console.log(`🗑️ Rejected confession #${confession.confession_id}`);

  await interaction.followUp({
    content: '🗑️ Confession đã bị từ chối và xóa khỏi hệ thống.',
    ephemeral: true,
  });

  // Thông báo cho người dùng
  try {
    const user = await interaction.client.users.fetch(confession.user_id);
    await user.send(
      `❌ Confession #${confession.confession_id} của bạn đã bị admin từ chối.`
    );
  } catch (error) {
    console.log('❌ Cannot send DM to user');
  }
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

  const isLongContent = fullContent.length > allowedLength;

  if (!isLongContent) {
    // Confession ngắn - tạo embed riêng cho credit
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
  } else {
    // Confession dài - chia thành nhiều tin nhắn
    const firstPart = fullContent.substring(0, allowedLength) + suffix;

    const thread = await forumChannel.threads.create({
      name: `Confession #${confession.confession_id}`,
      message: { content: firstPart },
    });

    // Gửi phần còn lại
    let remaining = fullContent.substring(allowedLength);
    const MAX_CHUNK_SIZE = 2000;

    while (remaining.length > 0) {
      const chunk =
        remaining.length > MAX_CHUNK_SIZE
          ? remaining.substring(0, MAX_CHUNK_SIZE)
          : remaining;

      await thread.send({ content: chunk });
      remaining = remaining.substring(chunk.length);
    }

    // Gửi footer cuối cùng dạng embed
    const creditEmbed = new EmbedBuilder().setColor(0x2b2d31).setFooter({
      text: confession.anonymous
        ? `Confession #${confession.confession_id} • Ẩn danh`
        : `Confession #${confession.confession_id} • Từ @${user.username}`,
    });

    await thread.send({
      embeds: [creditEmbed],
    });

    return thread;
  }
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
    console.error('❌ Error checking admin permission:', error);
    throw error;
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

    // Xác định title và màu sắc
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

    // Tạo nút phân trang
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
    console.error('❌ Error showing confession list:', error);
    throw error;
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
    console.error('❌ Error handling pagination:', error);
    throw error;
  }
}

/**
 * Xử lý lệnh duyệt confession bằng ID
 */
async function handleApprove(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const confessionId = interaction.options.getInteger('confession_id');

  if (!confessionId || isNaN(confessionId)) {
    return await interaction.followUp({
      content: '❌ ID confession không hợp lệ, vui lòng nhập số đúng.',
      ephemeral: true,
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
        ephemeral: true,
      });
    }

    if (confession.status !== 'pending') {
      return await interaction.followUp({
        content: '❌ Confession này đã được xử lý!',
        ephemeral: true,
      });
    }

    // Thực hiện duyệt confession
    await approveConfession(interaction, confession);
  } catch (error) {
    console.error('❌ Error handling approve command:', error);
    await interaction.followUp({
      content: '❌ Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại sau.',
      ephemeral: true,
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

    // Xóa thread nếu confession đã được duyệt
    if (confession.status === 'approved' && confession.thread_id) {
      try {
        const thread = await client.channels.fetch(confession.thread_id);
        if (thread) {
          await thread.delete();
          console.log(`✅ Deleted thread for confession #${confessionId}`);
        }
      } catch (error) {
        console.log('⚠️ Thread already deleted or not found');
      }
    }

    // Xóa confession khỏi database
    await Confession.deleteOne({
      confession_id: confessionId,
      guild_id: interaction.guildId,
    });

    console.log(`🗑️ Deleted confession #${confessionId}`);

    const statusMessage =
      confession.status === 'approved'
        ? `🗑️ Đã xóa confession #${confessionId} khỏi hệ thống và forum!`
        : `🗑️ Đã xóa confession #${confessionId} khỏi hệ thống!`;

    await interaction.reply({
      content: statusMessage,
      flags: MessageFlags.Ephemeral,
    });

    // Thông báo cho người dùng
    try {
      const user = await client.users.fetch(confession.user_id);
      await user.send(
        `🗑️ Confession #${confessionId} của bạn đã bị admin xóa khỏi hệ thống.`
      );
    } catch (error) {
      console.log('❌ Cannot send DM to user');
    }
  } catch (error) {
    console.error('❌ Error handling delete command:', error);
    throw error;
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

    // Chỉ hiển thị người gửi nếu không phải ẩn danh (cho admin xem)
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
    console.error('❌ Error handling detail command:', error);
    throw error;
  }
}

module.exports = { initializeBot };
