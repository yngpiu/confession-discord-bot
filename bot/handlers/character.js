const { EmbedBuilder, MessageFlags } = require('discord.js');
const { CharacterSystem } = require('../models');
const logger = require('../logger');

async function getCharacterSystem(channelId) {
  try {
    return await CharacterSystem.findOne({ channel_id: channelId });
  } catch (error) {
    logger.error('Error getting character system:', error);
    return null;
  }
}

async function handleCharacterConfig(interaction) {
  const channel = interaction.channel;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const existing = await getCharacterSystem(channel.id);
    if (existing) {
      const embed = new EmbedBuilder()
        .setTitle('🎭 Character System - Đã cấu hình')
        .setDescription(
          `Kênh này đã có hệ thống character với ${existing.characters.length} nhân vật`
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

    let webhook;
    const webhooks = await channel.fetchWebhooks();
    const existingWebhook = webhooks.find((wh) =>
      wh.name.includes('character_webhook')
    );
    webhook = existingWebhook
      ? existingWebhook
      : await channel.createWebhook({
          name: `character_webhook`,
          reason: 'Setup character system',
        });

    const newSystem = new CharacterSystem({
      channel_id: channel.id,
      webhook_url: webhook.url,
      characters: [],
      default_character_id: null,
    });
    await newSystem.save();

    const embed = new EmbedBuilder()
      .setTitle('✅ Character System - Setup thành công')
      .setDescription('Kênh đã được cấu hình cho hệ thống multi-character!')
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

async function handleCharacterManage(interaction) {
  const action = interaction.options.getString('action');
  const name = interaction.options.getString('name');
  const avatar = interaction.options.getString('avatar');
  const id = interaction.options.getString('id');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const system = await getCharacterSystem(interaction.channel.id);
  if (!system) {
    await interaction.followUp({
      content:
        '⚠️ Chưa cấu hình character system. Dùng `/character-config` trước.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    switch (action) {
      case 'add':
        await handleAddCharacter(interaction, system, name, avatar);
        break;
      case 'list':
        await handleListCharacters(interaction, system);
        break;
      case 'remove':
        await handleRemoveCharacter(interaction, system, id);
        break;
      case 'default':
        await handleSetDefaultCharacter(interaction, system, id);
        break;
    }
  } catch (error) {
    logger.error('Error in character manage:', error);
    await interaction.followUp({
      content: '❌ Lỗi khi quản lý nhân vật.',
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
      content: '📭 Chưa có nhân vật nào. Dùng `/character-manage add` để thêm.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const embed = new EmbedBuilder()
    .setTitle('🎭 Danh sách nhân vật')
    .setColor(0x0099ff)
    .setFooter({
      text: `${system.characters.length} nhân vật • Mặc định: ${
        system.default_character_id || 'Chưa đặt'
      }`,
    });
  system.characters.forEach((char) => {
    const isDefault = char.id === system.default_character_id ? ' ⭐' : '';
    embed.addFields({
      name: `${char.name}${isDefault}`,
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
  if (system.default_character_id === id) {
    system.default_character_id = null;
  }
  await system.save();
  await interaction.followUp({
    content: `🗑️ Đã xóa nhân vật **${removedChar.name}** (ID: ${id})`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleSetDefaultCharacter(interaction, system, id) {
  if (!id) {
    await interaction.followUp({
      content: '❌ Vui lòng nhập ID nhân vật làm mặc định.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const character = system.characters.find((c) => c.id === id);
  if (!character) {
    await interaction.followUp({
      content: `❌ Không tìm thấy nhân vật với ID "${id}".`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  system.default_character_id = id;
  await system.save();
  await interaction.followUp({
    content: `⭐ Đã đặt **${character.name}** làm nhân vật mặc định.`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  getCharacterSystem,
  handleCharacterConfig,
  handleCharacterManage,
  handleAddCharacter,
  handleListCharacters,
  handleRemoveCharacter,
  handleSetDefaultCharacter,
};
