require('dotenv').config();

const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const cron = require('node-cron'); // ➕ Thêm node-cron
const axios = require('axios'); // ➕ Thêm axios

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

// ➕ Tạo endpoint ping để tự ping
app.get('/ping', (req, res) => {
  const timestamp = new Date().toISOString();
  const botStatus = client.readyAt ? 'online' : 'offline';
  const uptime = process.uptime();

  logger.api(`Nhận được self-ping lúc ${timestamp}`);
  logger.api(`Trạng thái bot: ${botStatus}`);
  logger.api(`Thời gian hoạt động app: ${Math.floor(uptime)} giây`);

  const response = {
    status: 'alive',
    bot_status: botStatus,
    uptime: uptime,
    timestamp: timestamp,
  };

  logger.api('Đang gửi ping response:', response);

  res.status(200).json(response);
});

logger.system('Đã đăng ký ping endpoint tại /ping');

// Setup routes
logger.system('Đang thiết lập web routes...');
setupRoutes(app, client);
logger.success('Hoàn thành thiết lập web routes');

// ➕ Self-ping scheduler - chỉ chạy khi production
if (process.env.NODE_ENV === 'production') {
  logger.system(
    'Phát hiện môi trường production, đang thiết lập self-ping scheduler...'
  );

  const APP_URL =
    process.env.RENDER_EXTERNAL_URL || `https://your-app-name.onrender.com`;
  logger.system(`URL app cho self-ping: ${APP_URL}`);

  cron.schedule('*/12 * * * *', async () => {
    const pingTime = new Date().toISOString();
    logger.system(`Bắt đầu ping theo lịch lúc ${pingTime}`);

    try {
      const startTime = Date.now();
      logger.network(`Đang gửi GET request tới: ${APP_URL}/ping`);

      const response = await axios.get(`${APP_URL}/ping`, {
        timeout: 30000,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      logger.success(`Keep-alive ping thành công!`);
      logger.network(`Response status: ${response.status}`);
      logger.timing('Keep-alive ping', responseTime);
      logger.debug(`Response data:`, response.data);
    } catch (error) {
      logger.error(`Keep-alive ping thất bại lúc ${pingTime}`, error);
      logger.error(`Thông báo lỗi: ${error.message}`);
      logger.error(`Mã lỗi: ${error.code || 'Không xác định'}`);

      if (error.response) {
        logger.network(`Response status: ${error.response.status}`);
        logger.debug(`Response data:`, error.response.data);
      }
    }
  });

  logger.success('Đã khởi tạo self-ping scheduler thành công');
  logger.system('Lịch trình: Mỗi 12 phút');
} else {
  logger.system('Phát hiện môi trường development, bỏ qua self-ping scheduler');
}

// Start server
logger.init('Đang khởi động web server...');
logger.system(`Server sẽ lắng nghe trên port ${PORT}`);
logger.system(`Server sẽ bind tới 0.0.0.0`);

app.listen(PORT, '0.0.0.0', () => {
  logger.success(`Web server đang chạy thành công trên port ${PORT}`);
  logger.system(`Server có thể truy cập tại: http://0.0.0.0:${PORT}`);
  logger.system(`Server được khởi động lúc: ${new Date().toISOString()}`);
});

// Start bot
logger.init('Đang bắt đầu Discord bot login...');
logger.system(
  `Sử dụng bot token: ${
    process.env.BOT_TOKEN ? '***[ĐÃ ẨN]***' : 'CHƯA THIẾT LẬP'
  }`
);

client
  .login(process.env.BOT_TOKEN)
  .then(() => {
    logger.success('Discord bot login thành công');
  })
  .catch((error) => {
    logger.error('Discord bot login thất bại', error);
    logger.error('Lỗi login:', error.message);
  });

logger.success('Hoàn thành chuỗi khởi động ứng dụng');
logger.system('Thời gian khởi động:', new Date().toISOString());
