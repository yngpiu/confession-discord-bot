const axios = require('axios');
const FormData = require('form-data');
const logger = require('../logger');
const { getCharacterSystem } = require('./character');

async function handleRegularMessage(message) {
  if (message.author.bot || message.content.startsWith('/') || !message.guild) {
    return;
  }

  // Bỏ tính năng default character - chỉ sử dụng /send để gửi tin nhắn character
}

async function sendWebhookMessage(
  message,
  webhookUrl,
  username,
  avatarUrl,
  content
) {
  try {
    const MAX_FILES = 10;
    const MAX_FILE_SIZE = 8 * 1024 * 1024;
    const MAX_TOTAL_SIZE = 25 * 1024 * 1024;

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
        username,
        avatar_url: avatarUrl,
        content: content || '',
      };
      formData.append('payload_json', JSON.stringify(payload));

      let fileIndex = 0;
      let totalSize = 0;
      const attachmentArray = Array.from(message.attachments.values());
      for (const attachment of attachmentArray) {
        try {
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
            timeout: 30000,
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
        }
      }

      if (fileIndex === 0) {
        webhookPayload = {
          username,
          avatar_url: avatarUrl,
          content: content || 'File không thể tải lên.',
        };
        requestConfig = {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        };
      } else {
        webhookPayload = formData;
        const baseTimeout = 15000;
        const fileTimeout = fileIndex * 5000;
        const sizeTimeout = Math.ceil(totalSize / (1024 * 1024)) * 3000;
        const finalTimeout = Math.min(
          baseTimeout + fileTimeout + sizeTimeout,
          120000
        );
        requestConfig = {
          headers: { ...formData.getHeaders() },
          timeout: finalTimeout,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        };
        logger.config(`⏱️ Upload timeout: ${finalTimeout}ms`);
      }
    } else {
      webhookPayload = { username, avatar_url: avatarUrl, content };
      requestConfig = {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      };
    }

    logger.config(
      `🚀 Sending webhook as ${username} (${message.attachments.size} files)`
    );
    await axios.post(webhookUrl, webhookPayload, requestConfig);
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

module.exports = { handleRegularMessage };
