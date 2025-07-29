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

console.log('📦 Đã import Discord.js components thành công');
console.log('🗃️ Đã import database models thành công');

let client;

async function initializeBot(discordClient) {
  console.log('🤖 Đang bắt đầu khởi tạo bot...');
  client = discordClient;
  console.log('✅ Đã lưu trữ client reference thành công');

  client.once('ready', async () => {
    console.log(`🤖 Bot đã online: ${client.user.tag}`);
    console.log(`🆔 Bot ID: ${client.user.id}`);
    console.log(`👥 Đã kết nối tới ${client.guilds.cache.size} guilds`);
    console.log(`📅 Timestamp ready: ${client.readyAt}`);

    console.log('⚙️ Đang đăng ký slash commands...');
    await registerCommands();
    console.log('✅ Đã đăng ký slash commands thành công');
  });

  client.on('interactionCreate', async (interaction) => {
    const interactionType = interaction.isChatInputCommand() ? 'slash command' :
                          interaction.isButton() ? 'button' :
                          interaction.isModalSubmit() ? 'modal' : 'không xác định';

    console.log(`🎯 Nhận được interaction: ${interactionType}`);
    console.log(`👤 Người dùng: ${interaction.user.tag} (${interaction.user.id})`);
    console.log(`🏠 Guild: ${interaction.guild?.name || 'DM'} (${interaction.guildId || 'N/A'})`);

    if (interaction.isChatInputCommand()) {
      console.log(`⚡ Slash command: /${interaction.commandName}`);
      await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
      console.log(`🔘 Button được nhấn: ${interaction.customId}`);
      await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      console.log(`📝 Modal được gửi: ${interaction.customId}`);
      await handleModalSubmit(interaction);
    }
  });

  console.log('🎧 Đã đăng ký event listeners thành công');
}

async function registerCommands() {
  console.log('📋 Đang xây dựng slash commands...');

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

  console.log(`📝 Đã xây dựng ${commands.length} slash commands`);
  console.log('🌐 Đang đăng ký commands với Discord API...');

  try {
    await client.application.commands.set(commands);
    console.log('✅ Đã đăng ký commands với Discord thành công');
  } catch (error) {
    console.error('❌ Thất bại khi đăng ký commands:', error);
    throw error;
  }
}

async function handleSlashCommand(interaction) {
  const { commandName } = interaction;
  console.log(`⚡ Đang xử lý slash command: /${commandName}`);
  console.log(`👤 Được thực hiện bởi: ${interaction.user.tag}`);
  console.log(`🏠 Trong guild: ${interaction.guild?.name}`);

  try {
    const startTime = Date.now();

    switch (commandName) {
      case 'setup':
        console.log('⚙️ Đang thực hiện setup command...');
        await handleSetup(interaction);
        break;
      case 'config':
        console.log('🔧 Đang thực hiện config command...');
        await handleConfig(interaction);
        break;
      case 'tao-huong-dan':
        console.log('🧾 Đang thực hiện create guide command...');
        await handleCreateGuide(interaction);
        break;
      case 'pending':
        console.log('📋 Đang thực hiện pending command...');
        await handlePending(interaction);
        break;
      case 'approved':
        console.log('✅ Đang thực hiện approved command...');
        await handleApproved(interaction);
        break;
      case 'all':
        console.log('📜 Đang thực hiện all command...');
        await handleAll(interaction);
        break;
      case 'approve':
        console.log('✅ Đang thực hiện approve command...');
        await handleApprove(interaction);
        break;
      case 'delete':
        console.log('🗑️ Đang thực hiện delete command...');
        await handleDelete(interaction);
        break;
      case 'detail':
        console.log('🔍 Đang thực hiện detail command...');
        await handleDetail(interaction);
        break;
      default:
        console.log(`⚠️ Command không xác định: ${commandName}`);
    }

    const executionTime = Date.now() - startTime;
    console.log(`⏱️ Command ${commandName} được thực hiện trong ${executionTime}ms`);

  } catch (error) {
    console.error(`❌ Lỗi khi xử lý slash command ${commandName}:`, error);
    console.error(`💥 Chi tiết lỗi:`, error.message);
    console.error(`📊 Stack trace:`, error.stack);

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
  console.log('⚙️ Đang bắt đầu quá trình setup...');

  const forumChannel = interaction.options.getChannel('forum_channel');
  const adminChannel = interaction.options.getChannel('admin_channel');
  const adminRole = interaction.options.getRole('admin_role');

  console.log(`📋 Tham số setup:`);
  console.log(`  Forum Channel: ${forumChannel.name} (${forumChannel.id})`);
  console.log(`  Admin Channel: ${adminChannel.name} (${adminChannel.id})`);
  console.log(`  Admin Role: ${adminRole.name} (${adminRole.id})`);
  console.log(`  Guild ID: ${interaction.guildId}`);

  try {
    console.log('💾 Đang lưu guild settings vào database...');

    const result = await GuildSettings.findOneAndUpdate(
      { guild_id: interaction.guildId },
      {
        guild_id: interaction.guildId,
        forum_channel_id: forumChannel.id,
        admin_channel_id: adminChannel.id,
        admin_role_id: adminRole.id,
      },
      { upsert: true, new: true }
    );

    console.log('✅ Đã lưu guild settings thành công');
    console.log('📊 Kết quả database:', result);

    await interaction.reply({
      content: `✅ Đã cấu hình bot thành công!\nForum: ${forumChannel}\nAdmin Channel: ${adminChannel}\nAdmin Role: ${adminRole}`,
      flags: MessageFlags.Ephemeral,
    });

    console.log('📤 Đã gửi xác nhận setup cho người dùng');

  } catch (error) {
    console.error('❌ Thất bại khi lưu guild settings:', error);
    throw error;
  }
}

async function handleConfig(interaction) {
  console.log('🔧 Đang lấy cấu hình guild...');

  if (!(await checkAdminPermission(interaction))) {
    console.log('⛔ Kiểm tra quyền admin thất bại');
    return;
  }

  try {
    console.log(`🔍 Đang tìm kiếm settings cho guild: ${interaction.guildId}`);

    const settings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });

    if (!settings) {
      console.log('⚠️ Không tìm thấy settings cho guild này');
      await interaction.reply({
        content: '⚠️ Server chưa được cấu hình. Hãy sử dụng lệnh `/setup` trước.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    console.log('📊 Đã tìm thấy settings:', settings);

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
    console.log('📤 Đã gửi embed cấu hình cho người dùng');

  } catch (error) {
    console.error('❌ Thất bại khi lấy cấu hình:', error);
    throw error;
  }
}

async function handleCreateGuide(interaction) {
  console.log('🧾 Đang tạo hướng dẫn confession...');

  if (!(await checkAdminPermission(interaction))) {
    console.log('⛔ Kiểm tra quyền admin thất bại');
    return;
  }

  try {
    console.log(`🔍 Đang lấy settings cho guild: ${interaction.guildId}`);

    const settings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });

    if (!settings) {
      console.log('⚠️ Không tìm thấy settings cho guild này');
      await interaction.reply({
        content: '⚠️ Server chưa được cấu hình. Hãy sử dụng lệnh `/setup` trước.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    console.log(`🔍 Đang lấy forum channel: ${settings.forum_channel_id}`);
    const forumChannel = client.channels.cache.get(settings.forum_channel_id);

    if (!forumChannel) {
      console.log('❌ Không tìm thấy forum channel trong cache');
      await interaction.reply({
        content: '❌ Không tìm thấy forum channel!',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    console.log(`✅ Đã tìm thấy forum channel: ${forumChannel.name}`);
    console.log('📝 Đang tạo guide embed...');

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

    console.log('🔘 Đang tạo action buttons...');

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

    console.log('🧵 Đang tạo guide thread...');

    const thread = await forumChannel.threads.create({
      name: '💌 GỬI CONFESSION TẠI ĐÂY! 💌',
      message: {
        content:
          'Chọn 1 trong 2 nút dưới để gửi confession nha. Bot sẽ gửi tin nhắn riêng thông báo cho bạn khi confession được duyệt.',
        embeds: [embed],
        components: [row],
      },
    });

    console.log(`✅ Đã tạo guide thread: ${thread.name} (${thread.id})`);

    await interaction.reply({
      content: '✅ Đã tạo thread hướng dẫn gửi confession.',
      flags: MessageFlags.Ephemeral,
    });

    console.log('📤 Đã gửi thông báo thành công cho người dùng');

  } catch (error) {
    console.error('❌ Thất bại khi tạo guide thread:', error);
    throw error;
  }
}

async function handleButtonInteraction(interaction) {
  const { customId } = interaction;
  console.log(`🔘 Đang xử lý button interaction: ${customId}`);

  if (customId === 'send_named' || customId === 'send_anonymous') {
    console.log(`📝 Đang tạo confession modal cho: ${customId}`);

    const isAnonymous = customId === 'send_anonymous';
    console.log(`🎭 Chế độ ẩn danh: ${isAnonymous}`);

    const modal = new ModalBuilder()
      .setCustomId(
        `confession_modal_${isAnonymous ? 'anon' : 'named'}`
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
    console.log('📝 Đã hiển thị modal cho người dùng');

  } else if (customId.startsWith('anonymous_reply_')) {
    console.log('💬 Đang xử lý anonymous reply button');
    await handleAnonymousReply(interaction);
  } else if (
    customId.startsWith('approve_') ||
    customId.startsWith('reject_')
  ) {
    console.log('✅ Đang xử lý approval button');
    await handleApprovalButtons(interaction);
  } else if (customId.startsWith('page_')) {
    console.log('📄 Đang xử lý pagination button');
    await handlePaginationButtons(interaction);
  } else {
    console.log(`⚠️ customId button không xác định: ${customId}`);
  }
}

async function handleAnonymousReply(interaction) {
  const confessionId = interaction.customId.split('_')[2];
  console.log(`💬 Đang tạo anonymous reply modal cho confession: ${confessionId}`);

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
  console.log('💬 Đã hiển thị anonymous reply modal cho người dùng');
}

async function handleModalSubmit(interaction) {
  console.log(`📝 Đang xử lý modal submission: ${interaction.customId}`);

  if (interaction.customId.startsWith('confession_modal_')) {
    console.log('📨 Đang xử lý confession modal submission');
    await handleConfessionModalSubmit(interaction);
  } else if (interaction.customId.startsWith('reply_modal_')) {
    console.log('💬 Đang xử lý reply modal submission');
    await handleReplyModalSubmit(interaction);
  } else {
    console.log(`⚠️ customId modal không xác định: ${interaction.customId}`);
  }
}

async function handleConfessionModalSubmit(interaction) {
  const isAnonymous = interaction.customId.includes('anon');
  const content = interaction.fields.getTextInputValue('confession_content');

  console.log(`📨 Đang xử lý confession submission:`);
  console.log(`  Ẩn danh: ${isAnonymous}`);
  console.log(`  Độ dài nội dung: ${content.length} ký tự`);
  console.log(`  Người dùng: ${interaction.user.tag} (${interaction.user.id})`);
  console.log(`  Guild: ${interaction.guildId}`);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  console.log('⏳ Đã defer interaction');

  try {
    console.log('🔍 Đang lấy guild settings...');
    const settings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });

    if (!settings) {
      console.log('⚠️ Guild chưa được cấu hình');
      await interaction.followUp({
        content: '⚠️ Server chưa setup. Admin cần chạy lệnh `/setup`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    console.log('✅ Đã tìm thấy guild settings');

    // FIX: Tìm ID lớn nhất và +1 thay vì dùng count
    console.log('🔢 Đang tìm confession ID cuối cùng...');
    const lastConfession = await Confession.findOne({
      guild_id: interaction.guildId,
    })
      .sort({ confession_id: -1 })
      .select('confession_id');

    const confessionNumber = lastConfession
      ? lastConfession.confession_id + 1
      : 1;

    console.log(`📊 ID confession mới sẽ là: ${confessionNumber}`);
    console.log(`📊 ID confession cuối cùng là: ${lastConfession?.confession_id || 'không có'}`);

    // Save to database
    console.log('💾 Đang lưu confession vào database...');
    const confession = new Confession({
      confession_id: confessionNumber,
      guild_id: interaction.guildId,
      content: content,
      anonymous: isAnonymous,
      user_id: interaction.user.id,
      status: 'pending',
    });

    await confession.save();
    console.log('✅ Đã lưu confession vào database');
    console.log('📊 Document confession:', confession._id);

    // Send to admin channel
    console.log(`📢 Đang gửi tới admin channel: ${settings.admin_channel_id}`);
    const adminChannel = client.channels.cache.get(settings.admin_channel_id);

    if (adminChannel) {
      console.log(`✅ Đã tìm thấy admin channel: ${adminChannel.name}`);

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

      const adminMessage = await adminChannel.send({ embeds: [embed], components: [row] });
      console.log(`📤 Đã gửi thông báo admin: ${adminMessage.id}`);
    } else {
      console.log('❌ Không tìm thấy admin channel trong cache');
    }

    // Try to DM user
    console.log('📧 Đang cố gắng gửi DM cho người dùng...');
    try {
      await interaction.user.send(
        `📨 Bạn đã gửi confession #${confessionNumber} thành công! Đang chờ admin duyệt.`
      );
      console.log('✅ Đã gửi DM thành công');

      await interaction.followUp({
        content: `✅ Đã gửi confession #${confessionNumber} thành công!`,
        flags: MessageFlags.Ephemeral,
      });
      console.log('📤 Đã gửi response thành công');

    } catch (error) {
      console.log('❌ Thất bại khi gửi DM:', error.message);

      await interaction.followUp({
        content:
          '⚠️ **Bot không thể gửi tin nhắn riêng cho bạn!**\n\n' +
          'Vui lòng bật **tin nhắn trực tiếp từ server** để nhận thông báo khi confession được duyệt.\n\n' +
          `✅ Confession #${confessionNumber} đã được gửi thành công!\n` +
          '💡 Sau khi bật DM, bạn sẽ nhận được thông báo khi confession được duyệt.',
        flags: MessageFlags.Ephemeral,
      });
      console.log('📤 Đã gửi cảnh báo DM response');
    }

  } catch (error) {
    console.error('❌ Thất bại khi xử lý confession submission:', error);
    throw error;
  }
}

async function handleReplyModalSubmit(interaction) {
  const confessionId = interaction.customId.split('_')[2];
  const replyContent = interaction.fields.getTextInputValue('reply_content');

  console.log(`💬 Đang xử lý anonymous reply:`);
  console.log(`  Confession ID: ${confessionId}`);
  console.log(`  Độ dài reply: ${replyContent.length} ký tự`);
  console.log(`  Người dùng: ${interaction.user.tag} (${interaction.user.id})`);

  try {
    console.log('🔍 Đang tìm kiếm confession trong database...');
    // Kiểm tra confession có tồn tại không
    const confession = await Confession.findOne({
      confession_id: parseInt(confessionId),
      guild_id: interaction.guildId,
      status: 'approved',
    });

    if (!confession || !confession.thread_id) {
      console.log('❌ Không tìm thấy confession hoặc không có thread ID');
      await interaction.reply({
        content: '❌ Không tìm thấy confession hoặc thread không tồn tại.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    console.log(`✅ Đã tìm thấy confession với thread: ${confession.thread_id}`);

    console.log('🔍 Đang lấy thread từ Discord...');
    const thread = await client.channels.fetch(confession.thread_id);

    if (!thread) {
      console.log('❌ Không tìm thấy thread trên Discord');
      await interaction.reply({
        content: '❌ Không tìm thấy thread của confession.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    console.log(`✅ Đã tìm thấy thread: ${thread.name}`);

    // Embed với prefix "Gửi ẩn danh:"
    console.log('📝 Đang tạo anonymous reply embed...');
    const replyEmbed = new EmbedBuilder()
      .setDescription(`**Gửi ẩn danh tới tác giả:**\n${replyContent}`)
      .setColor(0x36393f);

    const sentMessage = await thread.send({ embeds: [replyEmbed] });
    console.log(`📤 Đã gửi anonymous reply: ${sentMessage.id}`);

    // Đóng modal mà không hiển thị gì
    await interaction.deferUpdate();
    console.log('✅ Đã update modal interaction');

  } catch (error) {
    console.error('❌ Lỗi khi gửi anonymous reply:', error);
    console.error('💥 Chi tiết lỗi:', error.message);

    await interaction.reply({
      content: '❌ Có lỗi xảy ra khi gửi trả lời.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleApprovalButtons(interaction) {
  console.log('✅ Đang xử lý approval button interaction');

  if (!(await checkAdminPermission(interaction))) {
    console.log('⛔ Kiểm tra quyền admin thất bại');
    return;
  }

  const [action, confessionId] = interaction.customId.split('_');
  console.log(`📊 Hành động approval: ${action} cho confession ${confessionId}`);

  try {
    console.log('🔍 Đang tìm kiếm confession trong database...');
    const confession = await Confession.findOne({
      confession_id: parseInt(confessionId),
      guild_id: interaction.guildId,
    });

    if (!confession) {
      console.log('❌ Không tìm thấy confession');
      await interaction.reply({
        content: '❌ Confession không tồn tại!',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    console.log(`📊 Đã tìm thấy confession với status: ${confession.status}`);

    if (confession.status !== 'pending') {
      console.log('⚠️ Confession đã được xử lý');
      await interaction.reply({
        content: '❌ Confession này đã được xử lý!',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'approve') {
      console.log('✅ Đang xử lý approval...');

      console.log('🔍 Đang lấy guild settings...');
      const settings = await GuildSettings.findOne({
        guild_id: interaction.guildId,
      });

      console.log(`🔍 Đang lấy forum channel: ${settings.forum_channel_id}`);
      const forumChannel = client.channels.cache.get(settings.forum_channel_id);

      if (!forumChannel) {
        console.log('❌ Không tìm thấy forum channel');
        await interaction.reply({
          content: '❌ Không tìm thấy forum channel!',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      console.log(`✅ Đã tìm thấy forum channel: ${forumChannel.name}`);

      let fullContent = confession.content;
      if (!confession.anonymous) {
        console.log('👤 Đang thêm tên tác giả vào nội dung');
        const user = await client.users.fetch(confession.user_id);
        fullContent += `\n\n**Tác giả: @${user.username}**`;
        console.log(`👤 Tác giả: ${user.username}`);
      }

      console.log('🧵 Đang tạo confession thread...');
      const thread = await forumChannel.threads.create({
        name: `Confession #${confession.confession_id}`,
        message: { content: fullContent },
      });

      console.log(`✅ Đã tạo thread: ${thread.name} (${thread.id})`);

      // Tạo button trả lời ẩn danh
      console.log('🔘 Đang thêm anonymous reply button...');
      const replyRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`anonymous_reply_${confession.confession_id}`)
          .setLabel('Trả lời ẩn danh')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('💬')
      );

      // Gửi message với button trả lời ẩn danh
      const replyMessage = await thread.send({
        content:
          '**🎩 Nếu bạn muốn gửi ẩn danh tới tác giả, ấn vào nút bên dưới.**',
        components: [replyRow],
      });

      console.log(`✅ Đã thêm reply button: ${replyMessage.id}`);

      console.log('💾 Đang cập nhật status confession trong database...');
      confession.status = 'approved';
      confession.thread_id = thread.id;
      await confession.save();

      console.log('✅ Đã cập nhật status confession thành approved');

      await interaction.reply({
        content: '✅ Đã duyệt và đăng confession lên forum.',
        flags: MessageFlags.Ephemeral,
      });

      console.log('📤 Đã gửi xác nhận approval');

      // Notify user
      console.log('📧 Đang cố gắng thông báo người dùng qua DM...');
      try {
        const user = await client.users.fetch(confession.user_id);
        await user.send(
          `📢 Confession #${confession.confession_id} của bạn đã được admin duyệt và đăng công khai.`
        );
        console.log('✅ Đã gửi thông báo người dùng thành công');
      } catch (error) {
        console.log('❌ Không thể gửi DM cho người dùng:', error.message);
      }

    } else if (action === 'reject') {
      console.log('❌ Đang xử lý rejection...');

      console.log('🗑️ Đang xóa confession khỏi database...');
      await Confession.deleteOne({
        confession_id: parseInt(confessionId),
        guild_id: interaction.guildId,
      });

      console.log('✅ Đã xóa confession khỏi database');

      await interaction.reply({
        content: '🗑️ Confession đã bị từ chối và xóa khỏi hệ thống.',
        flags: MessageFlags.Ephemeral,
      });

      console.log('📤 Đã gửi xác nhận rejection');

      // Notify user
      console.log('📧 Đang cố gắng thông báo người dùng qua DM...');
      try {
        const user = await client.users.fetch(confession.user_id);
        await user.send(
          `❌ Confession #${confession.confession_id} của bạn đã bị admin từ chối.`
        );
        console.log('✅ Đã gửi thông báo người dùng thành công');
      } catch (error) {
        console.log('❌ Không thể gửi DM cho người dùng:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Lỗi khi xử lý approval button:', error);
    throw error;
  }
}

// Helper functions
async function checkAdminPermission(interaction) {
  console.log('🔒 Đang kiểm tra quyền admin...');
  console.log(`👤 Người dùng: ${interaction.user.tag} (${interaction.user.id})`);
  console.log(`🏠 Guild: ${interaction.guildId}`);

  try {
    console.log('🔍 Đang lấy guild settings...');
    const settings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });

    if (!settings) {
      console.log('⚠️ Guild chưa được cấu hình');
      await interaction.reply({
        content: '⚠️ Server chưa setup. Admin cần chạy lệnh `/setup`.',
        flags: MessageFlags.Ephemeral,
      });
      return false;
    }

    console.log(`🎭 Role admin yêu cầu: ${settings.admin_role_id}`);
    console.log(`👤 Roles của người dùng: ${interaction.member.roles.cache.map(r => r.id).join(', ')}`);

    if (!interaction.member.roles.cache.has(settings.admin_role_id)) {
      console.log('⛔ Người dùng không có role admin yêu cầu');
      await interaction.reply({
        content: '⛔ Bạn không có quyền sử dụng lệnh này.',
        flags: MessageFlags.Ephemeral,
      });
      return false;
    }

    console.log('✅ Kiểm tra quyền admin thành công');
    return true;

  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra quyền admin:', error);
    throw error;
  }
}

// Implement other command handlers
async function handlePending(interaction) {
  console.log('📋 Đang xử lý danh sách confession pending');
  if (!(await checkAdminPermission(interaction))) return;
  await showConfessionList(interaction, 'pending');
}

async function handleApproved(interaction) {
  console.log('✅ Đang xử lý danh sách confession approved');
  if (!(await checkAdminPermission(interaction))) return;
  await showConfessionList(interaction, 'approved');
}

async function handleAll(interaction) {
  console.log('📜 Đang xử lý danh sách tất cả confession');
  if (!(await checkAdminPermission(interaction))) return;
  await showConfessionList(interaction, null);
}

async function showConfessionList(interaction, status, page = 0) {
  const perPage = 5;
  console.log(`📄 Đang hiển thị danh sách confession - Status: ${status || 'tất cả'}, Trang: ${page + 1}`);

  try {
    const query = { guild_id: interaction.guildId };
    if (status) query.status = status;

    console.log('🔍 Query database:', query);
    console.log(`📊 Items mỗi trang: ${perPage}, Bỏ qua: ${page * perPage}`);

    const confessions = await Confession.find(query)
      .sort({ confession_id: 1 })
      .skip(page * perPage)
      .limit(perPage);

    const totalCount = await Confession.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

    console.log(`📊 Tìm thấy ${confessions.length} confessions trên trang này`);
    console.log(`📊 Tổng: ${totalCount} confessions, ${totalPages} trang`);

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

    console.log(`📝 Đang tạo embed với title: ${title}`);

    const embed = new EmbedBuilder().setTitle(title).setColor(color);

    if (confessions.length === 0) {
      console.log('📭 Không tìm thấy confession cho trang này');
      embed.setDescription(
        status === 'pending'
          ? '✅ Không có confession nào đang chờ duyệt!'
          : status === 'approved'
          ? '📭 Chưa có confession nào được duyệt!'
          : '📭 Chưa có confession nào!'
      );
    } else {
      console.log(`📝 Đang thêm ${confessions.length} confession fields vào embed`);
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

    console.log('🔘 Đang tạo pagination buttons...');

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

    console.log('📤 Đã gửi danh sách confession cho người dùng');

  } catch (error) {
    console.error('❌ Lỗi khi hiển thị danh sách confession:', error);
    throw error;
  }
}

async function handlePaginationButtons(interaction) {
  console.log('📄 Đang xử lý pagination button click');

  const customIdParts = interaction.customId.split('_');
  const action = customIdParts[1];
  const status = customIdParts[2];
  const page = parseInt(customIdParts[3]);

  console.log(`📊 Pagination: ${action} - Status: ${status} - Trang: ${page + 1}`);

  await interaction.deferUpdate();
  console.log('⏳ Đã defer pagination interaction');

  try {
    const perPage = 5;
    const query = { guild_id: interaction.guildId };
    if (status !== 'all') query.status = status;

    console.log('🔍 Đang lấy danh sách confession được cập nhật...');

    const confessions = await Confession.find(query)
      .sort({ confession_id: 1 })
      .skip(page * perPage)
      .limit(perPage);

    const totalCount = await Confession.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

    console.log(
      `📊 Kết quả cập nhật: ${confessions.length} confessions trên trang ${page + 1}/${totalPages}`
    );

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
    console.log('📤 Đã cập nhật pagination response');

  } catch (error) {
    console.error('❌ Lỗi khi xử lý pagination:', error);
    throw error;
  }
}

async function handleApprove(interaction) {
  console.log('✅ Đang xử lý manual approve command');

  if (!(await checkAdminPermission(interaction))) return;

  const confessionId = interaction.options.getInteger('confession_id');
  console.log(`📊 Manual approve cho confession ID: ${confessionId}`);

  try {
    console.log('🔍 Đang tìm kiếm confession trong database...');
    const confession = await Confession.findOne({
      confession_id: confessionId,
      guild_id: interaction.guildId,
      status: 'pending',
    });

    if (!confession) {
      console.log('❌ Không tìm thấy confession hoặc đã được xử lý');
      await interaction.reply({
        content: '❌ Không tìm thấy confession với ID này hoặc đã được xử lý.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    console.log(`✅ Đã tìm thấy confession: ${confession._id}`);

    console.log('🔍 Đang lấy guild settings...');
    const settings = await GuildSettings.findOne({
      guild_id: interaction.guildId,
    });

    console.log(`🔍 Đang lấy forum channel: ${settings.forum_channel_id}`);
    const forumChannel = client.channels.cache.get(settings.forum_channel_id);

    if (!forumChannel) {
      console.log('❌ Không tìm thấy forum channel');
      await interaction.reply({
        content: '❌ Không tìm thấy forum channel!',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    console.log(`✅ Đã tìm thấy forum channel: ${forumChannel.name}`);

    let fullContent = confession.content;
    if (!confession.anonymous) {
      console.log('👤 Đang thêm tên tác giả vào nội dung');
      const user = await client.users.fetch(confession.user_id);
      fullContent += `\n\n**Tác giả: @${user.username}**`;
      console.log(`👤 Tác giả: ${user.username}`);
    }

    console.log('🧵 Đang tạo confession thread...');
    const thread = await forumChannel.threads.create({
      name: `Confession #${confession.confession_id}`,
      message: { content: fullContent },
    });

    console.log(`✅ Đã tạo thread: ${thread.name} (${thread.id})`);

    // Tạo button trả lời ẩn danh
    console.log('🔘 Đang thêm anonymous reply button...');
    const replyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`anonymous_reply_${confession.confession_id}`)
        .setLabel('💬 Trả lời ẩn danh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔒')
    );

    // Gửi message với button trả lời ẩn danh
    const replyMessage = await thread.send({
      content: '👆 Ấn vào nút bên dưới để trả lời ẩn danh cho confession này.',
      components: [replyRow],
    });

    console.log(`✅ Đã thêm reply button: ${replyMessage.id}`);

    console.log('💾 Đang cập nhật status confession trong database...');
    confession.status = 'approved';
    confession.thread_id = thread.id;
    await confession.save();

    console.log('✅ Đã cập nhật status confession thành approved');

    await interaction.reply({
      content: `✅ Đã duyệt confession #${confessionId} và đăng lên forum!`,
      flags: MessageFlags.Ephemeral,
    });

    console.log('📤 Đã gửi xác nhận manual approval');

    // Notify user
    console.log('📧 Đang cố gắng thông báo người dùng qua DM...');
    try {
      const user = await client.users.fetch(confession.user_id);
      await user.send(
        `📢 Confession #${confession.confession_id} của bạn đã được admin duyệt và đăng công khai.`
      );
      console.log('✅ Đã gửi thông báo người dùng thành công');
    } catch (error) {
      console.log('❌ Không thể gửi DM cho người dùng:', error.message);
    }

  } catch (error) {
    console.error('❌ Lỗi khi xử lý manual approval:', error);
    throw error;
  }
}

async function handleDelete(interaction) {
  console.log('🗑️ Đang xử lý delete command');

  if (!(await checkAdminPermission(interaction))) return;

  const confessionId = interaction.options.getInteger('confession_id');
  console.log(`📊 Yêu cầu xóa confession ID: ${confessionId}`);

  try {
    console.log('🔍 Đang tìm kiếm confession trong database...');
    const confession = await Confession.findOne({
      confession_id: confessionId,
      guild_id: interaction.guildId,
    });

    if (!confession) {
      console.log('❌ Không tìm thấy confession');
      await interaction.reply({
        content: '❌ Không tìm thấy confession với ID này.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    console.log(`✅ Đã tìm thấy confession với status: ${confession.status}`);

    // Delete thread if approved
    if (confession.status === 'approved' && confession.thread_id) {
      console.log(`🗑️ Đang cố gắng xóa thread: ${confession.thread_id}`);
      try {
        const thread = await client.channels.fetch(confession.thread_id);
        if (thread) {
          await thread.delete();
          console.log('✅ Đã xóa thread thành công');
        }
      } catch (error) {
        console.log('⚠️ Thread đã được xóa hoặc không tìm thấy:', error.message);
      }
    }

    console.log('🗑️ Đang xóa confession khỏi database...');
    await Confession.deleteOne({
      confession_id: confessionId,
      guild_id: interaction.guildId,
    });

    console.log('✅ Đã xóa confession khỏi database');

    const statusMessage =
      confession.status === 'approved'
        ? `🗑️ Đã xóa confession #${confessionId} khỏi hệ thống và forum!`
        : `🗑️ Đã xóa confession #${confessionId} khỏi hệ thống!`;

    await interaction.reply({
      content: statusMessage,
      flags: MessageFlags.Ephemeral,
    });

    console.log('📤 Đã gửi xác nhận delete');

    // Notify user
    console.log('📧 Đang cố gắng thông báo người dùng qua DM...');
    try {
      const user = await client.users.fetch(confession.user_id);
      await user.send(
        `🗑️ Confession #${confessionId} của bạn đã bị admin xóa khỏi hệ thống.`
      );
      console.log('✅ Đã gửi thông báo người dùng thành công');
    } catch (error) {
      console.log('❌ Không thể gửi DM cho người dùng:', error.message);
    }

  } catch (error) {
    console.error('❌ Lỗi khi xử lý delete command:', error);
    throw error;
  }
}

async function handleDetail(interaction) {
  console.log('🔍 Đang xử lý detail command');

  if (!(await checkAdminPermission(interaction))) return;

  const confessionId = interaction.options.getInteger('confession_id');
  console.log(`📊 Yêu cầu chi tiết confession ID: ${confessionId}`);

  try {
    console.log('🔍 Đang tìm kiếm confession trong database...');
    const confession = await Confession.findOne({
      confession_id: confessionId,
      guild_id: interaction.guildId,
    });

    if (!confession) {
      console.log('❌ Không tìm thấy confession');
      await interaction.reply({
        content: '❌ Không tìm thấy confession với ID này.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    console.log(`✅ Đã tìm thấy confession: ${confession._id}`);
    console.log(`📊 Status: ${confession.status}, Ẩn danh: ${confession.anonymous}`);

    const statusColor = confession.status === 'approved' ? 0x00ff00 : 0xff9900;
    const statusIcon = confession.status === 'approved' ? '✅' : '⏳';

    console.log('📝 Đang tạo detail embed...');

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
      console.log(`📎 Đang thêm link thread: ${confession.thread_id}`);
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
    console.log('📤 Đã gửi detail embed cho người dùng');

  } catch (error) {
    console.error('❌ Lỗi khi xử lý detail command:', error);
    throw error;
  }
}

console.log('✅ Đã định nghĩa tất cả functions của bot module thành công');

module.exports = { initializeBot };
