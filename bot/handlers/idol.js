const { EmbedBuilder, MessageFlags } = require('discord.js');
const { ChannelConfig } = require('../models');
const logger = require('../logger');

async function getChannelConfig(channelId) {
  try {
    return await ChannelConfig.findOne({ channel_id: channelId });
  } catch (error) {
    logger.error('Error getting channel config:', error);
    return null;
  }
}

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

async function handleIdolSetup(interaction) {
  const idolName = interaction.options.getString('idol_name');
  const idolAvatar = interaction.options.getString('idol_avatar');
  const fanName = interaction.options.getString('fan_name');
  const fanAvatar = interaction.options.getString('fan_avatar');
  const channel = interaction.channel;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    let webhook;
    const webhooks = await channel.fetchWebhooks();
    const existingWebhook = webhooks.find((wh) =>
      wh.name.includes('idol_webhook')
    );
    webhook = existingWebhook
      ? existingWebhook
      : await channel.createWebhook({
          name: `${idolName}_idol_webhook`,
          reason: 'Setup idol/fan webhook',
        });

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

module.exports = {
  getChannelConfig,
  setChannelConfig,
  handleIdolSetup,
  handleIdolConfig,
  handleIdolRemove,
};
