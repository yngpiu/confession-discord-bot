require('dotenv').config();

const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

// Import logger first to use it throughout the app
const logger = require('./bot/logger');

logger.system('Đã tải environment variables thành công');
logger.system('Đã import tất cả modules thành công');

// Import bot modules
const { initializeBot } = require('./bot/bot');
const { setupRoutes } = require('./web/routes');

logger.system('Đã import bot modules thành công');

const app = express();
const PORT = process.env.PORT || 3000;

logger.system(`Đã khởi tạo Express app, PORT: ${PORT}`);
logger.system(`Environment: ${process.env.NODE_ENV || 'development'}`);

// MongoDB Connection
logger.database('Đang cố gắng kết nối tới MongoDB...');
logger.database(
  `MongoDB URI: ${process.env.MONGODB_URI ? 'Đã thiết lập' : 'Chưa thiết lập'}`
);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    logger.success('Kết nối MongoDB thành công');
    logger.database(
      `Trạng thái kết nối database: ${mongoose.connection.readyState}`
    );
  })
  .catch((err) => {
    logger.error('Lỗi kết nối MongoDB:', err);
    logger.error('Chi tiết lỗi:', err.message);
  });

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
  logger.database('Event kết nối MongoDB đã được kích hoạt');
});

mongoose.connection.on('error', (err) => {
  logger.error('Event lỗi kết nối MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.database('Event ngắt kết nối MongoDB đã được kích hoạt');
});

// Discord Bot
logger.init('Đang khởi tạo Discord client...');
logger.system(
  `Bot token: ${process.env.BOT_TOKEN ? 'Đã thiết lập' : 'Chưa thiết lập'}`
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

logger.system('Đã tạo Discord client với intents:', [
  'Guilds',
  'GuildMessages',
  'MessageContent',
]);

// Initialize bot
logger.init('Đang bắt đầu khởi tạo bot...');
initializeBot(client);
logger.success('Hoàn thành khởi tạo bot');

// Express setup
logger.system('Đang thiết lập Express middleware...');

app.set('view engine', 'ejs');
logger.system('Đã thiết lập view engine thành EJS');

app.set('views', path.join(__dirname, 'web/views'));
logger.system(`Thư mục views: ${path.join(__dirname, 'web/views')}`);

app.use(express.static(path.join(__dirname, 'web/public')));
logger.system(`Thư mục static files: ${path.join(__dirname, 'web/public')}`);

app.use(express.json());
logger.system('Đã bật JSON parser middleware');

// Setup routes
logger.system('Đang thiết lập web routes...');
setupRoutes(app, client);
logger.success('Hoàn thành thiết lập web routes');

// Start server
logger.init('Đang khởi động web server...');
logger.system(`Server sẽ lắng nghe trên port ${PORT}`);
logger.system(`Server sẽ bind tới 0.0.0.0`);

app.listen(PORT, '0.0.0.0', () => {
  logger.success(`Web server đang chạy thành công trên port ${PORT}`);
  logger.system(`Server có thể truy cập tại: http://0.0.0.0:${PORT}`);
  logger.system(`Server được khởi động lúc: ${new Date().toISOString()}`);
});

// Start bot with detailed logging
logger.init('Đang bắt đầu Discord bot login...');
logger.system(
  `Sử dụng bot token: ${
    process.env.BOT_TOKEN ? '***[ĐÃ ẨN]***' : 'CHƯA THIẾT LẬP'
  }`
);

// Bot connection event listeners for detailed logging
client.on('debug', (info) => {
  if (info.includes('Identifying')) {
    logger.info('🔐 Bot đang xác thực với Discord Gateway...');
  } else if (info.includes('Heartbeat')) {
    logger.debug(`💓 Heartbeat: ${info}`);
  } else if (info.includes('Shard')) {
    logger.info(`🌐 Shard event: ${info}`);
  }
});

client.on('warn', (warning) => {
  logger.warn(`⚠️ Discord Warning: ${warning}`);
});

client.on('error', (error) => {
  logger.error('❌ Discord Client Error:', error);
  logger.error('Error details:', error.message);
  logger.error('Error stack:', error.stack);
});

client.on('shardError', (error, shardId) => {
  logger.error(`❌ Shard ${shardId} Error:`, error);
});

client.on('shardDisconnect', (event, shardId) => {
  logger.warn(`🔌 Shard ${shardId} Disconnected:`, event);
});

client.on('shardReconnecting', (shardId) => {
  logger.info(`🔄 Shard ${shardId} đang reconnecting...`);
});

client.on('shardReady', (shardId) => {
  logger.success(`✅ Shard ${shardId} đã ready!`);
});

client.on('shardResume', (shardId, replayed) => {
  logger.success(`🔄 Shard ${shardId} resumed (replayed ${replayed} events)`);
});

// Connection state tracking
let connectionStartTime = Date.now();

client
  .login(process.env.BOT_TOKEN)
  .then(() => {
    const loginTime = Date.now() - connectionStartTime;
    logger.success(`✅ Discord bot login thành công sau ${loginTime}ms`);
    logger.system(`🤖 Bot user: ${client.user?.tag || 'Chưa có thông tin'}`);
    logger.system(`📊 Bot ID: ${client.user?.id || 'Chưa có thông tin'}`);
    logger.system(
      `🌐 WebSocket Status: ${client.ws.status} (0=READY, 1=CONNECTING, 2=RECONNECTING, 3=IDLE, 4=NEARLY, 5=DISCONNECTED, 6=WAITING_FOR_GUILDS, 7=IDENTIFYING, 8=RESUMING)`
    );
  })
  .catch((error) => {
    const loginTime = Date.now() - connectionStartTime;
    logger.error(`❌ Discord bot login thất bại sau ${loginTime}ms`);
    logger.error('Chi tiết lỗi:', error.message);
    logger.error('Error code:', error.code);
    logger.error('Full error:', error);

    // Specific error handling
    if (error.code === 'TOKEN_INVALID') {
      logger.error(
        '🔑 TOKEN KHÔNG HỢP LỆ - Kiểm tra lại BOT_TOKEN trong environment variables'
      );
    } else if (error.code === 'DISALLOWED_INTENTS') {
      logger.error(
        '🚫 INTENTS KHÔNG ĐƯỢC PHÉP - Kiểm tra Privileged Gateway Intents trong Discord Developer Portal'
      );
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      logger.error('🌐 LỖI MẠNG - Không thể kết nối tới Discord API');
    }

    process.exit(1); // Exit if bot can't connect
  });

// Timeout để kiểm tra bot có kết nối được không
setTimeout(() => {
  if (!client.readyAt) {
    logger.error('⏰ TIMEOUT: Bot không thể kết nối sau 30 giây');
    logger.error('🔍 Debug thông tin:');
    logger.error(`  - WebSocket Status: ${client.ws.status}`);
    logger.error(`  - Token có tồn tại: ${!!process.env.BOT_TOKEN}`);
    logger.error(`  - User info: ${client.user?.tag || 'Không có'}`);
    logger.error(`  - Ready timestamp: ${client.readyAt || 'Chưa ready'}`);
  }
}, 30000);

logger.success('Hoàn thành chuỗi khởi động ứng dụng');
logger.system('Thời gian khởi động:', new Date().toISOString());
