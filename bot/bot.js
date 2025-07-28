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

async function initializeBot(discordClient) {
  client = discordClient;

  client.once('ready', async () => {
    console.log(`🤖 Bot is online: ${client.user.tag}`);
    await registerCommands();
    console.log('✅ Slash commands registered');
  });

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
  });
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('⚙️ Cấu hình bot cho server (admin)')
      .addChannelOption((option) =>
        option
          .setName('forum_channel')
          .setDescription('Forum channel để đăng confession')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildForum)
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
      .setName('tao-huong-dan')
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
  ];

  await client.application.commands.set(commands);
}

async function handleSlashCommand(interaction) {
  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'setup':
        await handleSetup(interaction);
        break;
      case 'config':
        await handleConfig(interaction);
        break;
      case 'tao-huong-dan':
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
    }
  } catch (error) {
    console.error('Error handling slash command:', error);
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
}

async function handleSetup(interaction) {
  const forumChannel = interaction.options.getChannel('forum_channel');
  const adminChannel = interaction.options.getChannel('admin_channel');
  const adminRole = interaction.options.getRole('admin_role');

  await GuildSettings.findOneAndUpdate(
    { guild_id: interaction.guildId },
    {
      guild_id: interaction.guildId,
      forum_channel_id: forumChannel.id,
      admin_channel_id: adminChannel.id,
      admin_role_id: adminRole.id,
    },
    { upsert: true }
  );

  await interaction.reply({
    content: `✅ Đã cấu hình bot thành công!\nForum: ${forumChannel}\nAdmin Channel: ${adminChannel}\nAdmin Role: ${adminRole}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleConfig(interaction) {
  if (!(await checkAdminPermission(interaction))) return;

  const settings = await GuildSettings.findOne({
    guild_id: interaction.guildId,
  });

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
}

async function handleCreateGuide(interaction) {
  if (!(await checkAdminPermission(interaction))) return;

  const settings = await GuildSettings.findOne({
    guild_id: interaction.guildId,
  });
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
      content:
        'Chọn 1 trong 2 nút dưới để gửi confession nha. Bot sẽ gửi tin nhắn riêng thông báo cho bạn khi confession được duyệt.',
      embeds: [embed],
      components: [row],
    },
  });

  await interaction.reply({
    content: '✅ Đã tạo thread hướng dẫn gửi confession.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleButtonInteraction(interaction) {
  const { customId } = interaction;

  if (customId === 'send_named' || customId === 'send_anonymous') {
    const modal = new ModalBuilder()
      .setCustomId(
        `confession_modal_${customId === 'send_anonymous' ? 'anon' : 'named'}`
      )
      .setTitle('📨 Gửi Confession');

    const contentInput = new TextInputBuilder()
      .setCustomId('confession_content')
      .setLabel('Nội dung confession')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(4000);

    const actionRow = new ActionRowBuilder().addComponents(contentInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
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

async function handleAnonymousReply(interaction) {
  const confessionId = interaction.customId.split('_')[2];

  const modal = new ModalBuilder()
    .setCustomId(`reply_modal_${confessionId}`)
    .setTitle(`💬 Trả lời ẩn danh cho Confession #${confessionId}`);

  const contentInput = new TextInputBuilder()
    .setCustomId('reply_content')
    .setLabel('Nội Dung Trả Lời')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000)
    .setPlaceholder('Nhập nội dung trả lời của bạn...');

  const actionRow = new ActionRowBuilder().addComponents(contentInput);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
  if (interaction.customId.startsWith('confession_modal_')) {
    await handleConfessionModalSubmit(interaction);
  } else if (interaction.customId.startsWith('reply_modal_')) {
    await handleReplyModalSubmit(interaction);
  }
}

async function handleConfessionModalSubmit(interaction) {
  const isAnonymous = interaction.customId.includes('anon');
  const content = interaction.fields.getTextInputValue('confession_content');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

  // FIX: Tìm ID lớn nhất và +1 thay vì dùng count
  const lastConfession = await Confession.findOne({
    guild_id: interaction.guildId,
  })
    .sort({ confession_id: -1 })
    .select('confession_id');

  const confessionNumber = lastConfession
    ? lastConfession.confession_id + 1
    : 1;

  // Save to database
  const confession = new Confession({
    confession_id: confessionNumber,
    guild_id: interaction.guildId,
    content: content,
    anonymous: isAnonymous,
    user_id: interaction.user.id,
    status: 'pending',
  });

  await confession.save();

  // Send to admin channel
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
          value: `<@${interaction.user.id}>`,
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

    await adminChannel.send({ embeds: [embed], components: [row] });
  }

  // Try to DM user
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
      content:
        '⚠️ **Bot không thể gửi tin nhắn riêng cho bạn!**\n\n' +
        'Vui lòng bật **tin nhắn trực tiếp từ server** để nhận thông báo khi confession được duyệt.\n\n' +
        `✅ Confession #${confessionNumber} đã được gửi thành công!\n` +
        '💡 Sau khi bật DM, bạn sẽ nhận được thông báo khi confession được duyệt.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleReplyModalSubmit(interaction) {
  const confessionId = interaction.customId.split('_')[2];
  const replyContent = interaction.fields.getTextInputValue('reply_content');

  // Kiểm tra confession có tồn tại không
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

  try {
    const thread = await client.channels.fetch(confession.thread_id);

    if (!thread) {
      await interaction.reply({
        content: '❌ Không tìm thấy thread của confession.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Embed với prefix "Gửi ẩn danh:"
    const replyEmbed = new EmbedBuilder()
      .setDescription(`**Gửi ẩn danh tới tác giả:**\n${replyContent}`)
      .setColor(0x36393f);

    await thread.send({ embeds: [replyEmbed] });

    // Đóng modal mà không hiển thị gì
    await interaction.deferUpdate();
  } catch (error) {
    console.error('Error sending anonymous reply:', error);
    await interaction.reply({
      content: '❌ Có lỗi xảy ra khi gửi trả lời.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleApprovalButtons(interaction) {
  if (!(await checkAdminPermission(interaction))) return;

  const [action, confessionId] = interaction.customId.split('_');
  const confession = await Confession.findOne({
    confession_id: parseInt(confessionId),
    guild_id: interaction.guildId,
  });

  if (!confession) {
    await interaction.reply({
      content: '❌ Confession không tồn tại!',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (confession.status !== 'pending') {
    await interaction.reply({
      content: '❌ Confession này đã được xử lý!',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (action === 'approve') {
    const settings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });
    const forumChannel = client.channels.cache.get(settings.forum_channel_id);

    if (!forumChannel) {
      await interaction.reply({
        content: '❌ Không tìm thấy forum channel!',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let fullContent = confession.content;
    if (!confession.anonymous) {
      const user = await client.users.fetch(confession.user_id);
      fullContent += `\n\n**Tác giả: @${user.username}**`;
    }

    const thread = await forumChannel.threads.create({
      name: `Confession #${confession.confession_id}`,
      message: { content: fullContent },
    });

    // Tạo button trả lời ẩn danh
    const replyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`anonymous_reply_${confession.confession_id}`)
        .setLabel('Trả lời ẩn danh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💬')
    );

    // Gửi message với button trả lời ẩn danh
    await thread.send({
      content:
        '**🎩 Nếu bạn muốn gửi ẩn danh tới tác giả, ấn vào nút bên dưới.**',
      components: [replyRow],
    });

    confession.status = 'approved';
    confession.thread_id = thread.id;
    await confession.save();

    await interaction.reply({
      content: '✅ Đã duyệt và đăng confession lên forum.',
      flags: MessageFlags.Ephemeral,
    });

    // Notify user
    try {
      const user = await client.users.fetch(confession.user_id);
      await user.send(
        `📢 Confession #${confession.confession_id} của bạn đã được admin duyệt và đăng công khai.`
      );
    } catch (error) {
      console.log('Cannot send DM to user');
    }
  } else if (action === 'reject') {
    await Confession.deleteOne({
      confession_id: parseInt(confessionId),
      guild_id: interaction.guildId,
    });

    await interaction.reply({
      content: '🗑️ Confession đã bị từ chối và xóa khỏi hệ thống.',
      flags: MessageFlags.Ephemeral,
    });

    // Notify user
    try {
      const user = await client.users.fetch(confession.user_id);
      await user.send(
        `❌ Confession #${confession.confession_id} của bạn đã bị admin từ chối.`
      );
    } catch (error) {
      console.log('Cannot send DM to user');
    }
  }
}

// Helper functions
async function checkAdminPermission(interaction) {
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
}

// Implement other command handlers
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

async function showConfessionList(interaction, status, page = 0) {
  const perPage = 5;
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
}

async function handlePaginationButtons(interaction) {
  const customIdParts = interaction.customId.split('_');
  const action = customIdParts[1];
  const status = customIdParts[2];
  const page = parseInt(customIdParts[3]);

  await interaction.deferUpdate();

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
}

async function handleApprove(interaction) {
  if (!(await checkAdminPermission(interaction))) return;

  const confessionId = interaction.options.getInteger('confession_id');
  const confession = await Confession.findOne({
    confession_id: confessionId,
    guild_id: interaction.guildId,
    status: 'pending',
  });

  if (!confession) {
    await interaction.reply({
      content: '❌ Không tìm thấy confession với ID này hoặc đã được xử lý.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const settings = await GuildSettings.findOne({
    guild_id: interaction.guildId,
  });
  const forumChannel = client.channels.cache.get(settings.forum_channel_id);

  if (!forumChannel) {
    await interaction.reply({
      content: '❌ Không tìm thấy forum channel!',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let fullContent = confession.content;
  if (!confession.anonymous) {
    const user = await client.users.fetch(confession.user_id);
    fullContent += `\n\n**Tác giả: @${user.username}**`;
  }

  const thread = await forumChannel.threads.create({
    name: `Confession #${confession.confession_id}`,
    message: { content: fullContent },
  });

  // Tạo button trả lời ẩn danh
  const replyRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`anonymous_reply_${confession.confession_id}`)
      .setLabel('💬 Trả lời ẩn danh')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔒')
  );

  // Gửi message với button trả lời ẩn danh
  await thread.send({
    content: '👆 Ấn vào nút bên dưới để trả lời ẩn danh cho confession này.',
    components: [replyRow],
  });

  confession.status = 'approved';
  confession.thread_id = thread.id;
  await confession.save();

  await interaction.reply({
    content: `✅ Đã duyệt confession #${confessionId} và đăng lên forum!`,
    flags: MessageFlags.Ephemeral,
  });

  // Notify user
  try {
    const user = await client.users.fetch(confession.user_id);
    await user.send(
      `📢 Confession #${confession.confession_id} của bạn đã được admin duyệt và đăng công khai.`
    );
  } catch (error) {
    console.log('Cannot send DM to user');
  }
}

async function handleDelete(interaction) {
  if (!(await checkAdminPermission(interaction))) return;

  const confessionId = interaction.options.getInteger('confession_id');
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

  // Delete thread if approved
  if (confession.status === 'approved' && confession.thread_id) {
    try {
      const thread = await client.channels.fetch(confession.thread_id);
      if (thread) {
        await thread.delete();
      }
    } catch (error) {
      console.log('Thread already deleted or not found');
    }
  }

  await Confession.deleteOne({
    confession_id: confessionId,
    guild_id: interaction.guildId,
  });

  const statusMessage =
    confession.status === 'approved'
      ? `🗑️ Đã xóa confession #${confessionId} khỏi hệ thống và forum!`
      : `🗑️ Đã xóa confession #${confessionId} khỏi hệ thống!`;

  await interaction.reply({
    content: statusMessage,
    flags: MessageFlags.Ephemeral,
  });

  // Notify user
  try {
    const user = await client.users.fetch(confession.user_id);
    await user.send(
      `🗑️ Confession #${confessionId} của bạn đã bị admin xóa khỏi hệ thống.`
    );
  } catch (error) {
    console.log('Cannot send DM to user');
  }
}

async function handleDetail(interaction) {
  if (!(await checkAdminPermission(interaction))) return;

  const confessionId = interaction.options.getInteger('confession_id');
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
    .setTitle(`${statusIcon} Chi Tiết Confession #${confession.confession_id}`)
    .setDescription(confession.content)
    .setColor(statusColor)
    .addFields(
      {
        name: 'Ẩn danh',
        value: confession.anonymous ? 'Có' : 'Không',
        inline: true,
      },
      {
        name: 'Người gửi',
        value: `<@${confession.user_id}>`,
        inline: true,
      },
      {
        name: 'Trạng thái',
        value: confession.status === 'approved' ? 'Đã duyệt' : 'Đang chờ duyệt',
        inline: true,
      },
      {
        name: 'Thời gian gửi',
        value: new Date(confession.timestamp).toLocaleString('vi-VN'),
        inline: false,
      }
    );

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
}

module.exports = { initializeBot };
