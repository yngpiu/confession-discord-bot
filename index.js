require('dotenv').config();
const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

// Import bot modules
const { initializeBot } = require('./bot/bot');
const { setupRoutes } = require('./web/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize bot
initializeBot(client);

// Express setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'web/views'));
app.use(express.static(path.join(__dirname, 'web/public')));
app.use(express.json());

// Setup routes
setupRoutes(app, client);

// Start server
app.listen(PORT, () => {
  console.log(`🌐 Web server running on http://localhost:${PORT}`);
});

// Start bot
client.login(process.env.BOT_TOKEN);
