const mongoose = require('mongoose');

console.log('📦 Đã import Mongoose thành công');
console.log('🗃️ Đang khởi tạo database schemas...');

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

console.log('📋 Đã tạo Confession schema với các trường:');
console.log('  - confession_id: Number (bắt buộc)');
console.log('  - guild_id: String (bắt buộc)');
console.log('  - content: String (bắt buộc)');
console.log('  - anonymous: Boolean (bắt buộc)');
console.log('  - user_id: String (bắt buộc)');
console.log('  - timestamp: Date (mặc định: hiện tại)');
console.log('  - status: String (enum: pending, approved, mặc định: pending)');
console.log('  - thread_id: String (tùy chọn)');

const guildSettingsSchema = new mongoose.Schema({
  guild_id: { type: String, required: true, unique: true },
  forum_channel_id: { type: String, required: true },
  admin_channel_id: { type: String, required: true },
  admin_role_id: { type: String, required: true },
});

console.log('⚙️ Đã tạo GuildSettings schema với các trường:');
console.log('  - guild_id: String (bắt buộc, duy nhất)');
console.log('  - forum_channel_id: String (bắt buộc)');
console.log('  - admin_channel_id: String (bắt buộc)');
console.log('  - admin_role_id: String (bắt buộc)');

console.log('🔧 Đang tạo Mongoose models...');

const Confession = mongoose.model('Confession', confessionSchema);
console.log('✅ Đã tạo Confession model thành công');
console.log(`📊 Tên collection: ${Confession.collection.name}`);

const GuildSettings = mongoose.model('GuildSettings', guildSettingsSchema);
console.log('✅ Đã tạo GuildSettings model thành công');
console.log(`📊 Tên collection: ${GuildSettings.collection.name}`);

// Add schema middleware for logging
confessionSchema.pre('save', function (next) {
  console.log(
    `💾 Đang lưu confession #${this.confession_id} cho guild ${this.guild_id}`
  );
  console.log(`📊 Status: ${this.status}, Ẩn danh: ${this.anonymous}`);
  next();
});

confessionSchema.post('save', function (doc) {
  console.log(`✅ Đã lưu confession #${doc.confession_id} thành công`);
  console.log(`🆔 Document ID: ${doc._id}`);
});

confessionSchema.pre('findOneAndUpdate', function (next) {
  console.log('🔄 Đang cập nhật confession với query:', this.getQuery());
  console.log('📝 Dữ liệu cập nhật:', this.getUpdate());
  next();
});

confessionSchema.post('findOneAndUpdate', function (doc) {
  if (doc) {
    console.log(`✅ Đã cập nhật confession #${doc.confession_id} thành công`);
  } else {
    console.log('⚠️ Không tìm thấy confession cho thao tác cập nhật');
  }
});

confessionSchema.pre('deleteOne', function (next) {
  console.log('🗑️ Đang xóa confession với query:', this.getQuery());
  next();
});

confessionSchema.post('deleteOne', function (result) {
  console.log(
    `🗑️ Hoàn thành thao tác xóa. Số lượng đã xóa: ${result.deletedCount}`
  );
});

guildSettingsSchema.pre('save', function (next) {
  console.log(`💾 Đang lưu guild settings cho guild ${this.guild_id}`);
  console.log(
    `📋 Settings: Forum=${this.forum_channel_id}, Admin=${this.admin_channel_id}, Role=${this.admin_role_id}`
  );
  next();
});

guildSettingsSchema.post('save', function (doc) {
  console.log(`✅ Đã lưu guild settings thành công cho guild ${doc.guild_id}`);
  console.log(`🆔 Document ID: ${doc._id}`);
});

guildSettingsSchema.pre('findOneAndUpdate', function (next) {
  console.log('🔄 Đang cập nhật guild settings với query:', this.getQuery());
  console.log('📝 Dữ liệu cập nhật:', this.getUpdate());
  next();
});

guildSettingsSchema.post('findOneAndUpdate', function (doc) {
  if (doc) {
    console.log(
      `✅ Đã cập nhật guild settings thành công cho guild ${doc.guild_id}`
    );
  } else {
    console.log('⚠️ Không tìm thấy guild settings cho thao tác cập nhật');
  }
});

console.log('🎯 Đã đăng ký database middleware hooks thành công');
console.log('📤 Đã export models và sẵn sàng sử dụng');

module.exports = { Confession, GuildSettings };
