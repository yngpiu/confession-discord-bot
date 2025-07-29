require('dotenv').config();
console.log('🔧 Đã tải environment variables thành công');

const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const cron = require('node-cron'); // ➕ Thêm node-cron
const axios = require('axios'); // ➕ Thêm axios

console.log('📦 Đã import tất cả modules thành công');

// Import bot modules
const { initializeBot } = require('./bot/bot');
const { setupRoutes } = require('./web/routes');

console.log('🤖 Đã import bot modules thành công');

const app = express();
const PORT = process.env.PORT || 3000;

console.log(`🌐 Đã khởi tạo Express app, PORT: ${PORT}`);
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

// MongoDB Connection
console.log('🔗 Đang cố gắng kết nối tới MongoDB...');
console.log(
  `📍 MongoDB URI: ${
    process.env.MONGODB_URI ? 'Đã thiết lập' : 'Chưa thiết lập'
  }`
);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Kết nối MongoDB thành công');
    console.log(
      `🏛️ Trạng thái kết nối database: ${mongoose.connection.readyState}`
    );
  })
  .catch((err) => {
    console.error('❌ Lỗi kết nối MongoDB:', err);
    console.error('💥 Chi tiết lỗi:', err.message);
  });

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
  console.log('🔌 Event kết nối MongoDB đã được kích hoạt');
});

mongoose.connection.on('error', (err) => {
  console.error('⚠️ Event lỗi kết nối MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Event ngắt kết nối MongoDB đã được kích hoạt');
});

// Discord Bot
console.log('🤖 Đang khởi tạo Discord client...');
console.log(
  `🔑 Bot token: ${process.env.BOT_TOKEN ? 'Đã thiết lập' : 'Chưa thiết lập'}`
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

console.log('⚙️ Đã tạo Discord client với intents:', [
  'Guilds',
  'GuildMessages',
  'MessageContent',
]);

// Initialize bot
console.log('🚀 Đang bắt đầu khởi tạo bot...');
initializeBot(client);
console.log('✅ Hoàn thành khởi tạo bot');

// Express setup
console.log('⚙️ Đang thiết lập Express middleware...');

app.set('view engine', 'ejs');
console.log('📄 Đã thiết lập view engine thành EJS');

app.set('views', path.join(__dirname, 'web/views'));
console.log(`📁 Thư mục views: ${path.join(__dirname, 'web/views')}`);

app.use(express.static(path.join(__dirname, 'web/public')));
console.log(`📁 Thư mục static files: ${path.join(__dirname, 'web/public')}`);

app.use(express.json());
console.log('📝 Đã bật JSON parser middleware');

// ➕ Tạo endpoint ping để tự ping
app.get('/ping', (req, res) => {
  const timestamp = new Date().toISOString();
  const botStatus = client.readyAt ? 'online' : 'offline';
  const uptime = process.uptime();

  console.log(`🏃‍♂️ Nhận được self-ping lúc ${timestamp}`);
  console.log(`🤖 Trạng thái bot: ${botStatus}`);
  console.log(`⏰ Thời gian hoạt động app: ${Math.floor(uptime)} giây`);

  const response = {
    status: 'alive',
    bot_status: botStatus,
    uptime: uptime,
    timestamp: timestamp,
  };

  console.log('📤 Đang gửi ping response:', response);

  res.status(200).json(response);
});

console.log('🏓 Đã đăng ký ping endpoint tại /ping');

// Setup routes
console.log('🛣️ Đang thiết lập web routes...');
setupRoutes(app, client);
console.log('✅ Hoàn thành thiết lập web routes');

// ➕ Self-ping scheduler - chỉ chạy khi production
if (process.env.NODE_ENV === 'production') {
  console.log(
    '🏭 Phát hiện môi trường production, đang thiết lập self-ping scheduler...'
  );

  const APP_URL =
    process.env.RENDER_EXTERNAL_URL || `https://your-app-name.onrender.com`;
  console.log(`🌐 URL app cho self-ping: ${APP_URL}`);

  cron.schedule('*/12 * * * *', async () => {
    const pingTime = new Date().toISOString();
    console.log(`🔔 Bắt đầu ping theo lịch lúc ${pingTime}`);

    try {
      const startTime = Date.now();
      console.log(`📡 Đang gửi GET request tới: ${APP_URL}/ping`);

      const response = await axios.get(`${APP_URL}/ping`, {
        timeout: 30000,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`✅ Keep-alive ping thành công!`);
      console.log(`📊 Response status: ${response.status}`);
      console.log(`⏱️ Thời gian response: ${responseTime}ms`);
      console.log(`📄 Response data:`, response.data);
    } catch (error) {
      console.error(`❌ Keep-alive ping thất bại lúc ${pingTime}`);
      console.error(`💥 Thông báo lỗi: ${error.message}`);
      console.error(`🔍 Mã lỗi: ${error.code || 'Không xác định'}`);

      if (error.response) {
        console.error(`📊 Response status: ${error.response.status}`);
        console.error(`📄 Response data:`, error.response.data);
      }
    }
  });

  console.log('🔄 Đã khởi tạo self-ping scheduler thành công');
  console.log('⏰ Lịch trình: Mỗi 12 phút');
} else {
  console.log(
    '🧪 Phát hiện môi trường development, bỏ qua self-ping scheduler'
  );
}

// Start server
console.log('🚀 Đang khởi động web server...');
console.log(`🌐 Server sẽ lắng nghe trên port ${PORT}`);
console.log(`🔗 Server sẽ bind tới 0.0.0.0`);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Web server đang chạy thành công trên port ${PORT}`);
  console.log(`🔗 Server có thể truy cập tại: http://0.0.0.0:${PORT}`);
  console.log(`📅 Server được khởi động lúc: ${new Date().toISOString()}`);
});

// Start bot
console.log('🤖 Đang bắt đầu Discord bot login...');
console.log(
  `🔑 Sử dụng bot token: ${
    process.env.BOT_TOKEN ? '***[ĐÃ ẨN]***' : 'CHƯA THIẾT LẬP'
  }`
);

client
  .login(process.env.BOT_TOKEN)
  .then(() => {
    console.log('✅ Discord bot login thành công');
  })
  .catch((error) => {
    console.error('❌ Discord bot login thất bại');
    console.error('💥 Lỗi login:', error.message);
  });

console.log('🎯 Hoàn thành chuỗi khởi động ứng dụng');
console.log('⏰ Thời gian khởi động:', new Date().toISOString());
