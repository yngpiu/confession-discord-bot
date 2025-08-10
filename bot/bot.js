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
  handleIdolSetup,
  handleIdolConfig,
  handleIdolRemove,
} = require('./handlers/idol');
const {
  handleCharacterConfig,
  handleCharacterManage,
  getCharacterSystem,
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

  // Event: Bot ready
  client.once('ready', async () => {
    logger.success(
      `Bot online: ${client.user.tag} | Guilds: ${client.guilds.cache.size}`
    );
    await registerCommands(client);
  });

  // Event: Interaction created (slash commands, buttons, modals)
  client.on('interactionCreate', async (interaction) => {
    // THÊM kiểm tra autocomplete VÀO ĐẦU
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === 'send') {
        const system = await getCharacterSystem(interaction.channel.id);
        if (!system) {
          await interaction.respond([]);
          return;
        }

        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = system.characters.filter(
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

    // ===== CÁC LỆNH IDOL/FAN =====
    case 'idol-setup':
      await handleIdolSetup(interaction);
      break;
    case 'idol-config':
      await handleIdolConfig(interaction);
      break;
    case 'idol-remove':
      await handleIdolRemove(interaction);
      break;

    // ===== CÁC LỆNH CHARACTER =====
    case 'character-config':
      await handleCharacterConfig(interaction);
      break;
    case 'character-manage':
      await handleCharacterManage(interaction);
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
