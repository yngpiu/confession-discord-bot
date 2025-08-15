const { MessageFlags } = require('discord.js');
const logger = require('./logger');
const { registerCommands } = require('./commands/register');
const {
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
} = require('./handlers/confession');

const {
  handleCharacterAdd,
  handleCharacterList,
  handleCharacterRemove,
  handleSendMessage,
  getCharacterSystem,
  getCharactersForGuild,
} = require('./handlers/character');
const { handleRegularMessage } = require('./handlers/message');
const { setClient } = require('./context');

let client;

/**
 * Khởi tạo bot Discord và đăng ký các event listeners
 * @param {Client} discordClient - Discord client instance
 */
async function initializeBot(discordClient) {
  logger.init('Initializing Discord Confession Bot...');
  client = discordClient;
  setClient(client);

  // Event: Bot ready with detailed logging
  client.once('ready', async () => {
    const readyTime = Date.now();
    logger.success('🎉 BOT READY EVENT TRIGGERED!');
    logger.success(
      `✅ Bot online: ${client.user.tag} | Guilds: ${client.guilds.cache.size}`
    );

    // Log detailed bot information
    logger.system('📊 Bot Details:');
    logger.system(`  🤖 Username: ${client.user.username}`);
    logger.system(`  🆔 Bot ID: ${client.user.id}`);
    logger.system(`  🎯 Discriminator: ${client.user.discriminator}`);
    logger.system(`  🌐 Guilds count: ${client.guilds.cache.size}`);
    logger.system(`  👥 Users count: ${client.users.cache.size}`);
    logger.system(`  📡 WebSocket ping: ${client.ws.ping}ms`);
    logger.system(`  🌍 WebSocket status: ${client.ws.status} (0=READY)`);
    logger.system(`  ⏰ Ready at: ${new Date(readyTime).toISOString()}`);

    // Log guild information
    if (client.guilds.cache.size > 0) {
      logger.system('🏰 Connected Guilds:');
      client.guilds.cache.forEach((guild) => {
        logger.system(
          `  - ${guild.name} (${guild.id}) - ${guild.memberCount} members`
        );
      });
    } else {
      logger.warn('⚠️ Bot chưa join guild nào!');
    }

    try {
      logger.init('🔧 Registering slash commands...');
      await registerCommands(client);
      logger.success('✅ Slash commands registered successfully!');
    } catch (error) {
      logger.error('❌ Failed to register commands:', error);
    }

    // Set bot activity status
    try {
      await client.user.setActivity('Character & Confession Bot', {
        type: 'WATCHING',
      });
      logger.system('🎮 Bot activity status set successfully');
    } catch (error) {
      logger.warn('⚠️ Could not set bot activity:', error.message);
    }

    logger.success('🚀 Bot is fully operational and ready to serve!');
  });

  // Event: Interaction created (slash commands, buttons, modals)
  client.on('interactionCreate', async (interaction) => {
    // THÊM kiểm tra autocomplete VÀO ĐẦU
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === 'send') {
        try {
          // Use cached characters for faster autocomplete
          const characters = await getCharactersForGuild(interaction.guildId);

          if (characters.length === 0) {
            await interaction.respond([]);
            return;
          }

          const focusedValue = interaction.options.getFocused().toLowerCase();
          const filtered = characters.filter(
            (char) =>
              char.id.toLowerCase().includes(focusedValue) ||
              char.name.toLowerCase().includes(focusedValue)
          );

          await interaction.respond(
            filtered.slice(0, 25).map((char) => ({
              name: `${char.name} (${char.id})`,
              value: char.id,
            }))
          );
        } catch (error) {
          logger.error('Error in autocomplete:', error);
          await interaction.respond([]);
        }
      }
      return; // Dừng ở đây cho autocomplete
    }

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

  // Message create event
  client.on('messageCreate', async (message) => {
    try {
      await handleRegularMessage(message);
    } catch (error) {
      logger.error('Error handling regular message:', error);
    }
  });

  // Additional connection state events
  client.on('disconnect', () => {
    logger.warn('🔌 BOT DISCONNECTED from Discord');
    logger.warn('❌ Bot status: OFFLINE');
  });

  client.on('reconnecting', () => {
    logger.info('🔄 BOT RECONNECTING to Discord...');
    logger.info('⏳ Bot status: CONNECTING');
  });

  client.on('resume', (replayed) => {
    logger.success(`🔄 BOT RESUMED connection (replayed ${replayed} events)`);
    logger.success('✅ Bot status: ONLINE');
  });

  client.on('invalidated', () => {
    logger.error('❌ BOT SESSION INVALIDATED - Token may be compromised');
    logger.error('🚨 Bot status: OFFLINE (requires restart)');
  });

  client.on('rateLimit', (rateLimitData) => {
    logger.warn('⚠️ BOT RATE LIMITED:', rateLimitData);
  });
}

// Commands are registered via ./commands/register

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

    // ===== CÁC LỆNH CHARACTER =====
    case 'character-add':
      await handleCharacterAdd(interaction);
      break;
    case 'character-list':
      await handleCharacterList(interaction);
      break;
    case 'character-remove':
      await handleCharacterRemove(interaction);
      break;
    case 'send':
      await handleSendMessage(interaction);
      break;

    default:
      logger.warn(`Unknown command: ${commandName}`);
  }

  logger.timing(commandName, Date.now() - startTime);
}

module.exports = { initializeBot };
