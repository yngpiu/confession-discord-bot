const mongoose = require('mongoose');

const confessionSchema = new mongoose.Schema({
  confession_id: { type: Number, required: true },
  guild_id: { type: String, required: true },
  content: { type: String, required: true },
  anonymous: { type: Boolean, required: true },
  user_id: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
  thread_id: { type: String },
});

const guildSettingsSchema = new mongoose.Schema({
  guild_id: { type: String, required: true, unique: true },
  forum_channel_id: { type: String, required: true },
  admin_channel_id: { type: String, required: true },
  admin_role_id: { type: String, required: true },
});

const Confession = mongoose.model('Confession', confessionSchema);
const GuildSettings = mongoose.model('GuildSettings', guildSettingsSchema);

module.exports = { Confession, GuildSettings };
