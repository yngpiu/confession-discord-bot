const { EmbedBuilder, MessageFlags } = require('discord.js');
const { CharacterSystem } = require('../models');
const logger = require('../logger');
const axios = require('axios');
const FormData = require('form-data');

// Fetch server-wide character system by guild; fallback to legacy channel-based record
async function getCharacterSystem(guildId, channelId) {
  try {
    // Try guild-scoped first
    if (guildId) {
      const byGuild = await CharacterSystem.findOne({ guild_id: guildId });
      if (byGuild) return byGuild;
    }
    if (byGuild) return byGuild;
    // Fallback: legacy channel-scoped
    if (channelId) {
      return await CharacterSystem.findOne({ channel_id: channelId });
    }
    return null;
  } catch (error) {
    logger.error('Error getting character system:', error);
    return null;
  }
}

async function handleCharacterConfig(interaction) {
  const channel = interaction.channel;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const existing = await getCharacterSystem(
      interaction.guildId,
      interaction.channel.id
    );
    if (existing) {
      const embed = new EmbedBuilder()
        .setTitle('🎭 Character System - Đã cấu hình')
        .setDescription(
          `Server này đã có hệ thống character với ${existing.characters.length} nhân vật`
        )
        .setColor(0x00ff00)
        .addFields(
          {
            name: '📊 Số nhân vật',
            value: existing.characters.length.toString(),
            inline: true,
          },
          {
            name: '⭐ Mặc định',
            value: existing.default_character_id || 'Chưa đặt',
            inline: true,
          }
        )
        .setFooter({ text: 'Sử dụng /character-manage để quản lý nhân vật' });

      await interaction.followUp({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Guild-scoped system: no single webhook stored; resolve per-channel when sending
    const newSystem = new CharacterSystem({
      guild_id: interaction.guildId,
      characters: [],
      default_character_id: null,
    });
    await newSystem.save();

    const embed = new EmbedBuilder()
      .setTitle('✅ Character System - Setup thành công')
      .setDescription('Server đã được cấu hình cho hệ thống multi-character!')
      .setColor(0x00ff00)
      .addFields({
        name: '📝 Bước tiếp theo',
        value:
          '1. `/character-manage add` - Thêm nhân vật\n2. `/character-manage default` - Đặt mặc định\n3. `/send` - Gửi tin nhắn',
        inline: false,
      });

    await interaction.followUp({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error('Error in character config:', error);
    await interaction.followUp({
      content: '❌ Lỗi khi cấu hình character system.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleCharacterAdd(interaction) {
  const name = interaction.options.getString('name');
  const avatar = interaction.options.getString('avatar');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let system = await getCharacterSystem(
    interaction.guildId,
    interaction.channel.id
  );

  // Tự động tạo hệ thống nếu chưa có
  if (!system) {
    system = new CharacterSystem({
      guild_id: interaction.guildId,
      characters: [],
    });
    await system.save();
    logger.success(
      `Auto-created character system for guild ${interaction.guild.name}`
    );
  }

  try {
    await handleAddCharacter(interaction, system, name, avatar);
  } catch (error) {
    logger.error('Error adding character:', error);
    await interaction.followUp({
      content: '❌ Lỗi khi thêm nhân vật.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleCharacterList(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const system = await getCharacterSystem(
    interaction.guildId,
    interaction.channel.id
  );

  if (!system || system.characters.length === 0) {
    await interaction.followUp({
      content:
        '📭 Chưa có nhân vật nào. Dùng `/character-add` để thêm nhân vật đầu tiên.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await handleListCharacters(interaction, system);
  } catch (error) {
    logger.error('Error listing characters:', error);
    await interaction.followUp({
      content: '❌ Lỗi khi xem danh sách nhân vật.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleCharacterRemove(interaction) {
  const id = interaction.options.getString('id');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const system = await getCharacterSystem(
    interaction.guildId,
    interaction.channel.id
  );

  if (!system) {
    await interaction.followUp({
      content: '⚠️ Chưa có hệ thống character nào trong server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await handleRemoveCharacter(interaction, system, id);
  } catch (error) {
    logger.error('Error removing character:', error);
    await interaction.followUp({
      content: '❌ Lỗi khi xóa nhân vật.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleAddCharacter(interaction, system, name, avatar) {
  if (!name || !avatar) {
    await interaction.followUp({
      content: '❌ Thiếu thông tin: Name và avatar là bắt buộc.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const generateId = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  };
  let generatedId = generateId(name);
  let counter = 1;
  while (system.characters.find((c) => c.id === generatedId)) {
    generatedId = `${generateId(name)}_${counter}`;
    counter++;
  }
  system.characters.push({ id: generatedId, name, avatar, description: '' });
  await system.save();
  await interaction.followUp({
    content: `✅ Đã thêm nhân vật **${name}** với ID tự động: \`${generatedId}\``,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleListCharacters(interaction, system) {
  if (system.characters.length === 0) {
    await interaction.followUp({
      content: '📭 Chưa có nhân vật nào. Dùng `/character-add` để thêm.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const embed = new EmbedBuilder()
    .setTitle('🎭 Danh sách nhân vật')
    .setColor(0x0099ff)
    .setFooter({
      text: `${system.characters.length} nhân vật`,
    });
  system.characters.forEach((char) => {
    embed.addFields({
      name: `${char.name}`,
      value: `**ID:** ${char.id}`,
      inline: true,
    });
  });
  await interaction.followUp({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleRemoveCharacter(interaction, system, id) {
  if (!id) {
    await interaction.followUp({
      content: '❌ Vui lòng nhập ID nhân vật cần xóa.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const charIndex = system.characters.findIndex((c) => c.id === id);
  if (charIndex === -1) {
    await interaction.followUp({
      content: `❌ Không tìm thấy nhân vật với ID "${id}".`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const removedChar = system.characters[charIndex];
  system.characters.splice(charIndex, 1);
  await system.save();
  await interaction.followUp({
    content: `🗑️ Đã xóa nhân vật **${removedChar.name}** (ID: ${id})`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  getCharacterSystem,
  handleCharacterAdd,
  handleCharacterList,
  handleCharacterRemove,
  handleAddCharacter,
  handleListCharacters,
  handleRemoveCharacter,
};

/**
 * Gửi tin nhắn slash dưới tên nhân vật đã chọn (kèm file tuỳ chọn)
 */
async function handleSendMessage(interaction) {
  const characterId = interaction.options.getString('character');
  const message = interaction.options.getString('message');
  const attachment = interaction.options.getAttachment('attachment');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let system = await getCharacterSystem(
    interaction.guildId,
    interaction.channel.id
  );

  // Tự động tạo hệ thống nếu chưa có
  if (!system) {
    system = new CharacterSystem({
      guild_id: interaction.guildId,
      characters: [],
      default_character_id: null,
    });
    await system.save();
    logger.success(
      `Auto-created character system for guild ${interaction.guild.name}`
    );
  }

  const selectedCharacter = system.characters.find((c) => c.id === characterId);
  if (!selectedCharacter) {
    await interaction.followUp({
      content: `❌ Không tìm thấy nhân vật "${characterId}".`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    let webhookPayload;
    let requestConfig = {};

    if (attachment) {
      const formData = new FormData();
      const payload = {
        username: selectedCharacter.name,
        avatar_url: selectedCharacter.avatar,
        content: message,
      };
      formData.append('payload_json', JSON.stringify(payload));

      const response = await axios.get(attachment.url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      formData.append('files[0]', Buffer.from(response.data), {
        filename: attachment.name,
        contentType: attachment.contentType,
      });

      webhookPayload = formData;
      requestConfig = {
        headers: { ...formData.getHeaders() },
        timeout: 60000,
      };
    } else {
      webhookPayload = {
        username: selectedCharacter.name,
        avatar_url: selectedCharacter.avatar,
        content: message,
      };
      requestConfig = {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      };
    }

    // Resolve or create a webhook for the current channel at send-time
    const webhooks = await interaction.channel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.name.includes('character_webhook'));
    if (!webhook) {
      webhook = await interaction.channel.createWebhook({
        name: 'character_webhook',
        reason: 'Send character message',
      });
    }
    await axios.post(webhook.url, webhookPayload, requestConfig);
    await interaction.followUp({
      content: `✅ Đã gửi tin nhắn dưới tên **${selectedCharacter.name}**!`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error('Error sending character message:', error);
    await interaction.followUp({
      content: '❌ Lỗi khi gửi tin nhắn qua webhook.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports.handleSendMessage = handleSendMessage;
