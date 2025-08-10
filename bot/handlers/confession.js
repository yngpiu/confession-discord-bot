const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');
const { Confession, GuildSettings } = require('../models');
const logger = require('../logger');
const { findCutPosition } = require('../utils/text');

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
      logger.config(`Updating existing settings for guild ${interaction.guildId}`);
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
        { name: 'Forum Channel', value: `<#${settings.forum_channel_id}>`, inline: false },
        { name: 'Admin Channel', value: `<#${settings.admin_channel_id}>`, inline: false },
        { name: 'Admin Role', value: `<@&${settings.admin_role_id}>`, inline: false }
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

async function handleCreateGuide(interaction) {
  if (!(await checkAdminPermission(interaction))) return;

  try {
    const settings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });

    if (!settings) {
      await interaction.reply({
        content: '⚠️ Server chưa được cấu hình. Hãy sử dụng lệnh `/setup` trước.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const forumChannel = interaction.client.channels.cache.get(
      settings.forum_channel_id
    );
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

async function handleButtonInteraction(interaction) {
  const { customId } = interaction;
  if (customId === 'send_named' || customId === 'send_anonymous') {
    await handleConfessionButtons(interaction);
  } else if (customId.startsWith('anonymous_reply_')) {
    await handleAnonymousReply(interaction);
  } else if (customId.startsWith('approve_') || customId.startsWith('reject_')) {
    await handleApprovalButtons(interaction);
  } else if (customId.startsWith('page_')) {
    await handlePaginationButtons(interaction);
  }
}

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

  logger.confession(
    `New submission: ${isAnonymous ? 'Anonymous' : 'Named'}`,
    '',
    `from ${interaction.user.tag}`
  );

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const settings = await GuildSettings.findOne({ guild_id: interaction.guildId });
    if (!settings) {
      await interaction.followUp({
        content: '⚠️ Server chưa setup. Admin cần chạy lệnh `/setup`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const lastConfession = await Confession.findOne({ guild_id: interaction.guildId })
      .sort({ confession_id: -1 })
      .select('confession_id');

    const confessionNumber = lastConfession ? lastConfession.confession_id + 1 : 1;

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

    const adminChannel = interaction.client.channels.cache.get(
      settings.admin_channel_id
    );
    if (adminChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`📥 Confession Pending #${confessionNumber}`)
        .setDescription(content)
        .setColor(0xff9900)
        .addFields(
          { name: 'Ẩn danh', value: isAnonymous ? 'Có' : 'Không', inline: true },
          {
            name: 'Người gửi',
            value: isAnonymous ? '🔒 Ẩn danh' : `<@${interaction.user.id}>`,
            inline: false,
          }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`approve_${confessionNumber}`).setLabel('Duyệt').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${confessionNumber}`).setLabel('Từ chối').setStyle(ButtonStyle.Danger)
      );

      await adminChannel.send({ embeds: [embed], components: [row] });
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
        content:
          `✅ Đã gửi confession #${confessionNumber} thành công! \n\n __Bật DM để nhận thông báo duyệt.__`,
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
      logger.error('Failed to send confession submission error reply:', replyError);
    }
  }
}

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

    const thread = await interaction.client.channels.fetch(confession.thread_id);
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

async function approveConfession(interaction, confession) {
  const settings = await GuildSettings.findOne({ guild_id: interaction.guildId });
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

  await thread.send({ content: '', components: [replyRow] });

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
      message: { content: fullContent, embeds: [creditEmbed] },
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
        const userDisplay = confession.anonymous ? '🔒 Ẩn danh' : `<@${confession.user_id}>`;
        const contentPreview =
          confession.content.length > 100
            ? confession.content.substring(0, 100) + '...'
            : confession.content;
        const formattedTime = new Date(confession.timestamp).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
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

    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
  } catch (error) {
    logger.error('Error showing confession list:', error);
    try {
      await interaction.reply({
        content: '❌ Lỗi khi hiển thị danh sách confession. Vui lòng thử lại sau.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send confession list error reply:', replyError);
    }
  }
}

async function handlePaginationButtons(interaction) {
  const customIdParts = interaction.customId.split('_');
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
        const formattedTime = new Date(confession.timestamp).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        embed.addFields({
          name: `${statusIcon} Confession #${confession.confession_id}`,
          value: `**Ẩn danh:** ${anonymousStatus}\n**Người gửi:** ${userTag}\n**Thời gian:** ${formattedTime}\n**Nội dung:** ${contentPreview}`,
          inline: false,
        });
      }
    }

    embed.setFooter({ text: `Trang ${page + 1}/${totalPages} • Tổng: ${totalCount} confession` });

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
        const thread = await interaction.client.channels.fetch(
          confession.thread_id
        );
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
    await interaction.reply({ content: statusMessage, flags: MessageFlags.Ephemeral });
    try {
      const user = await interaction.client.users.fetch(confession.user_id);
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
      .setTitle(`${statusIcon} Chi Tiết Confession #${confession.confession_id}`)
      .setDescription(confession.content)
      .setColor(statusColor)
      .addFields(
        { name: 'Ẩn danh', value: confession.anonymous ? 'Có' : 'Không', inline: true },
        {
          name: 'Trạng thái',
          value: confession.status === 'approved' ? 'Đã duyệt' : 'Đang chờ duyệt',
          inline: true,
        },
        { name: 'Thời gian gửi', value: new Date(confession.timestamp).toLocaleString('vi-VN'), inline: false }
      );
    if (!confession.anonymous) {
      embed.addFields({ name: 'Người gửi', value: `<@${confession.user_id}>`, inline: true });
    }
    if (confession.status === 'approved' && confession.thread_id) {
      embed.addFields({ name: 'Thread', value: `<#${confession.thread_id}>`, inline: false });
    }
    embed.setFooter({ text: `Guild ID: ${interaction.guildId} | User ID: ${confession.user_id}` });
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

module.exports = {
  handleSetup,
  handleConfig,
  handleCreateGuide,
  handleButtonInteraction,
  handleModalSubmit,
  handleConfessionModalSubmit,
  handleReplyModalSubmit,
  handleApprovalButtons,
  handlePending,
  handleApproved,
  handleAll,
  handlePaginationButtons,
  handleApprove,
  handleDelete,
  handleDetail,
};


