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

logger.database('Đang tạo Mongoose models...');

const Confession = mongoose.model('Confession', confessionSchema);
logger.success('Đã tạo Confession model thành công');
logger.debug(`Tên collection: ${Confession.collection.name}`);

const GuildSettings = mongoose.model('GuildSettings', guildSettingsSchema);
logger.success('Đã tạo GuildSettings model thành công');
logger.debug(`Tên collection: ${GuildSettings.collection.name}`);

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

// Character system now scoped by guild (server-wide). Keep legacy fields for migration compatibility.
const characterSystemSchema = new mongoose.Schema({
  guild_id: { type: String, required: true, unique: true },
  // Legacy fields (optional now):
  channel_id: { type: String, required: false },
  webhook_url: { type: String, required: false },
  characters: [
    {
      id: { type: String, required: true },
      name: { type: String, required: true },
      avatar: { type: String, required: true },
      description: { type: String, default: '' },
    },
  ],
  created_at: { type: Date, default: Date.now },
});

logger.success('Đã đăng ký database middleware hooks thành công');

logger.system('Đã export models và sẵn sàng sử dụng');

const CharacterSystem = mongoose.model(
  'CharacterSystem',
  characterSystemSchema
);

module.exports = { Confession, GuildSettings, CharacterSystem };
