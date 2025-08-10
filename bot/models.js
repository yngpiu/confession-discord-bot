const mongoose = require('mongoose');

const logger = require('./logger');

logger.database('Import Mongoose thành công');

logger.database('Đang khởi tạo database schemas...');

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

logger.database('Đã tạo Confession schema với các trường:');
logger.debug(' - confession_id: Number (bắt buộc)');
logger.debug(' - guild_id: String (bắt buộc)');
logger.debug(' - content: String (bắt buộc)');
logger.debug(' - anonymous: Boolean (bắt buộc)');
logger.debug(' - user_id: String (bắt buộc)');
logger.debug(' - timestamp: Date (mặc định: hiện tại)');
logger.debug(' - status: String (enum: pending, approved, mặc định: pending)');
logger.debug(' - thread_id: String (tùy chọn)');

const guildSettingsSchema = new mongoose.Schema({
  guild_id: { type: String, required: true, unique: true },
  forum_channel_id: { type: String, required: true },
  admin_channel_id: { type: String, required: true },
  admin_role_id: { type: String, required: true },
});

logger.database('Đã tạo GuildSettings schema với các trường:');
logger.debug(' - guild_id: String (bắt buộc, duy nhất)');
logger.debug(' - forum_channel_id: String (bắt buộc)');
logger.debug(' - admin_channel_id: String (bắt buộc)');
logger.debug(' - admin_role_id: String (bắt buộc)');

// THÊM MỚI: Schema cho channel config idol/fan
const channelConfigSchema = new mongoose.Schema({
  channel_id: { type: String, required: true, unique: true },
  webhook_url: { type: String, required: true },
  idol_name: { type: String, required: true },
  idol_avatar: { type: String, required: true },
  fan_name: { type: String, required: true },
  fan_avatar: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

logger.database('Đã tạo ChannelConfig schema với các trường:');
logger.debug(' - channel_id: String (bắt buộc, duy nhất)');
logger.debug(' - webhook_url: String (bắt buộc)');
logger.debug(' - idol_name: String (bắt buộc)');
logger.debug(' - idol_avatar: String (bắt buộc)');
logger.debug(' - fan_name: String (bắt buộc)');
logger.debug(' - fan_avatar: String (bắt buộc)');
logger.debug(' - created_at: Date (mặc định: hiện tại)');

logger.database('Đang tạo Mongoose models...');

const Confession = mongoose.model('Confession', confessionSchema);
logger.success('Đã tạo Confession model thành công');
logger.debug(`Tên collection: ${Confession.collection.name}`);

const GuildSettings = mongoose.model('GuildSettings', guildSettingsSchema);
logger.success('Đã tạo GuildSettings model thành công');
logger.debug(`Tên collection: ${GuildSettings.collection.name}`);

// THÊM MỚI: Model cho channel config
const ChannelConfig = mongoose.model('ChannelConfig', channelConfigSchema);
logger.success('Đã tạo ChannelConfig model thành công');
logger.debug(`Tên collection: ${ChannelConfig.collection.name}`);

// Add schema middleware for logging
confessionSchema.pre('save', function (next) {
  logger.database(
    `Đang lưu confession #${this.confession_id} cho guild ${this.guild_id}`
  );
  logger.debug(`Status: ${this.status}, Ẩn danh: ${this.anonymous}`);
  next();
});

confessionSchema.post('save', function (doc) {
  logger.success(`Đã lưu confession #${doc.confession_id} thành công`);
  logger.debug(`Document ID: ${doc._id}`);
});

confessionSchema.pre('findOneAndUpdate', function (next) {
  logger.debug('Đang cập nhật confession với query:', this.getQuery());
  logger.debug('Dữ liệu cập nhật:', this.getUpdate());
  next();
});

confessionSchema.post('findOneAndUpdate', function (doc) {
  if (doc) {
    logger.success(`Đã cập nhật confession #${doc.confession_id} thành công`);
  } else {
    logger.warn('Không tìm thấy confession cho thao tác cập nhật');
  }
});

confessionSchema.pre('deleteOne', function (next) {
  logger.debug('Đang xóa confession với query:', this.getQuery());
  next();
});

confessionSchema.post('deleteOne', function (result) {
  logger.database(
    `Hoàn thành thao tác xóa. Số lượng đã xóa: ${result.deletedCount}`
  );
});

guildSettingsSchema.pre('save', function (next) {
  logger.database(`Đang lưu guild settings cho guild ${this.guild_id}`);
  logger.debug(
    `Settings: Forum=${this.forum_channel_id}, Admin=${this.admin_channel_id}, Role=${this.admin_role_id}`
  );
  next();
});

guildSettingsSchema.post('save', function (doc) {
  logger.success(`Đã lưu guild settings thành công cho guild ${doc.guild_id}`);
  logger.debug(`Document ID: ${doc._id}`);
});

guildSettingsSchema.pre('findOneAndUpdate', function (next) {
  logger.debug('Đang cập nhật guild settings với query:', this.getQuery());
  logger.debug('Dữ liệu cập nhật:', this.getUpdate());
  next();
});

guildSettingsSchema.post('findOneAndUpdate', function (doc) {
  if (doc) {
    logger.success(
      `Đã cập nhật guild settings thành công cho guild ${doc.guild_id}`
    );
  } else {
    logger.warn('Không tìm thấy guild settings cho thao tác cập nhật');
  }
});

const characterSystemSchema = new mongoose.Schema({
  channel_id: { type: String, required: true, unique: true },
  webhook_url: { type: String, required: true },
  characters: [
    {
      id: { type: String, required: true },
      name: { type: String, required: true },
      avatar: { type: String, required: true },
      description: { type: String, default: '' },
    },
  ],
  default_character_id: { type: String },
  created_at: { type: Date, default: Date.now },
});
// THÊM MỚI: Middleware cho ChannelConfig
channelConfigSchema.pre('save', function (next) {
  logger.database(`Đang lưu channel config cho kênh ${this.channel_id}`);
  logger.debug(`Idol: ${this.idol_name}, Fan: ${this.fan_name}`);
  next();
});

channelConfigSchema.post('save', function (doc) {
  logger.success(`Đã lưu channel config thành công cho kênh ${doc.channel_id}`);
  logger.debug(`Document ID: ${doc._id}`);
});

logger.success('Đã đăng ký database middleware hooks thành công');

logger.system('Đã export models và sẵn sàng sử dụng');

const CharacterSystem = mongoose.model(
  'CharacterSystem',
  characterSystemSchema
);

module.exports = { Confession, GuildSettings, ChannelConfig, CharacterSystem };
