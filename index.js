require('dotenv').config();
const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const cron = require('node-cron'); // ➕ Thêm node-cron
const axios = require('axios'); // ➕ Thêm axios

// Import bot modules
const { initializeBot } = require('./bot/bot');
const { setupRoutes } = require('./web/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize bot
initializeBot(client);

// Express setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'web/views'));
app.use(express.static(path.join(__dirname, 'web/public')));
app.use(express.json());

// ➕ Tạo endpoint ping để tự ping
app.get('/ping', (req, res) => {
  console.log(`🏃‍♂️ Self-ping received at ${new Date().toISOString()}`);
  res.status(200).json({
    status: 'alive',
    bot_status: client.readyAt ? 'online' : 'offline',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Setup routes
setupRoutes(app, client);

// ➕ Self-ping scheduler - chỉ chạy khi production
if (process.env.NODE_ENV === 'production') {
  const APP_URL =
    process.env.RENDER_EXTERNAL_URL || `https://your-app-name.onrender.com`;

  cron.schedule('*/12 * * * *', async () => {
    try {
      const response = await axios.get(`${APP_URL}/ping`, {
        timeout: 30000,
      });
      console.log(`✅ Keep-alive ping successful: ${response.status}`);
    } catch (error) {
      console.error(`❌ Keep-alive ping failed: ${error.message}`);
    }
  });

  console.log('🔄 Self-ping scheduler initialized - ping every 12 minutes');
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// Start bot
client.login(process.env.BOT_TOKEN);
