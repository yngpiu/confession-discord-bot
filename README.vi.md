# VNMIXX Confession Bot — Tài liệu chi tiết (Tiếng Việt)

Bot Confession cho Discord kèm giao diện web (Express + EJS), sử dụng MongoDB để lưu trữ, và đã được tổ chức lại mã nguồn theo mô-đun để dễ bảo trì.

## Tính năng chính

- Quản lý Confession ẩn danh/hiện tên, duyệt, xóa, xem chi tiết, phân trang.
- Hệ thống Idol/Fan cho kênh: nhắn thường dưới tên Idol, lệnh `!fan` dưới tên Fan (webhook).
- Hệ thống Multi-Character cho kênh: cấu hình nhiều nhân vật, autocomplete, gửi tin nhắn dưới tên nhân vật.
- Giao diện web (EJS): trang mời bot, API status.
- Logging chi tiết bằng Winston với nhiều nhóm log (system, init, database, api, ...).

## Yêu cầu hệ thống

- Bun >= 1.1 (ưu tiên dùng Bun cho cài đặt/chạy dự án)
- MongoDB >= 6.x (hoặc MongoDB Atlas)
- Tài khoản Discord Developer và Bot Token

## Cấu trúc thư mục (sau tái tổ chức)

```
confession-bot/
  bot/
    commands/
      register.js         # Đăng ký slash commands với Discord API
    handlers/
      confession.js       # Toàn bộ xử lý logic Confession (setup, duyệt, list, ...)
      idol.js             # Xử lý hệ thống Idol/Fan (setup/xem/xoá config)
      character.js        # Xử lý hệ thống Multi-Character
      message.js          # Xử lý tin nhắn thường → gửi lại qua webhook
    utils/
      text.js             # Hàm tiện ích cắt nội dung dài (findCutPosition)
    bot.js                # Khởi tạo bot, gắn event, điều phối tới handlers
    logger.js             # Logger Winston tuỳ biến
    models.js             # Các Mongoose Schemas & Models
    context.js            # Chia sẻ tham chiếu Discord client (nếu cần)
  web/
    public/               # Static assets
    views/                # EJS templates
    routes.js             # Định nghĩa routes Express
  index.js                # Khởi động Express, kết nối DB, khởi động bot
  package.json
  README.vi.md            # Tài liệu này
```

## Biến môi trường (.env)

Tạo file `.env` ở thư mục gốc:

```
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id
MONGODB_URI=mongodb://localhost:27017/confession-bot
PORT=3000
NODE_ENV=development
```

- BOT_TOKEN: Token bot Discord
- CLIENT_ID: Application Client ID để tạo link mời bot
- MONGODB_URI: URI kết nối MongoDB
- PORT: Port web server (mặc định 3000)

## Cài đặt và chạy (Bun)

Cài dependencies:

```
bun install
```

Chạy ở chế độ dev (nếu dùng nodemon):

```
bun run dev
```

Chạy bình thường:

```
bun run start
```

Hoặc chạy trực tiếp:

```
bun index.js
```

Mặc định server sẽ lắng nghe trên `0.0.0.0:PORT`.

## Quyền và Intents Discord

Bot khởi tạo với các intents:

- Guilds
- GuildMessages
- MessageContent

Hãy bật Message Content Intent trong Discord Developer Portal nếu cần.

## Lệnh Slash (Slash Commands)

- /setup forum_channel admin_channel admin_role
  - Cấu hình kênh forum đăng confession, kênh admin duyệt, và role admin.
- /config
  - Xem cấu hình hiện tại.
- /create-guide
  - Tạo thread hướng dẫn gửi confession trong forum channel.
- /pending, /approved, /all
  - Xem danh sách confession theo trạng thái, hỗ trợ phân trang.
- /approve confession_id
  - Duyệt confession theo ID (tạo thread, thêm nút bình luận ẩn danh).
- /delete confession_id
  - Xóa confession theo ID (kèm xoá thread nếu đã đăng).
- /detail confession_id
  - Xem chi tiết confession theo ID.

Hệ thống Idol/Fan:

- /idol-setup idol_name idol_avatar fan_name fan_avatar
- /idol-config
- /idol-remove

Hệ thống Multi-Character:

- /character-config
- /character-manage action:[add|list|remove|default] name? avatar? id?
- /send character message attachment?
  - `character` là bắt buộc và hỗ trợ autocomplete.

## Hành vi tin nhắn thường (messageCreate)

- Nếu kênh có cấu hình Idol/Fan:
  - Tin nhắn thường → gửi lại qua webhook dưới tên Idol
  - Tin nhắn bắt đầu với `!fan ` → gửi lại dưới tên Fan
- Nếu không có Idol/Fan nhưng kênh có Character System và có nhân vật mặc định:
  - Tin nhắn thường → gửi lại qua webhook dưới tên nhân vật mặc định

Tệp liên quan: `bot/handlers/message.js`

## Giao diện Web

- GET `/` — Trang mời bot, hiển thị trạng thái bot.
- GET `/api/status` — Trả JSON `{ online, guilds, users }`.

Xem tệp: `web/routes.js`, `web/views/index.ejs`

## Mô hình dữ liệu (MongoDB / Mongoose)

Các models nằm ở `bot/models.js`:

- Confession
  - `confession_id:Number`, `guild_id:String`, `content:String`, `anonymous:Boolean`, `user_id:String`, `timestamp:Date`, `status:'pending'|'approved'`, `thread_id:String?`
- GuildSettings
  - `guild_id:String (unique)`, `forum_channel_id:String`, `admin_channel_id:String`, `admin_role_id:String`
- ChannelConfig (Idol/Fan)
  - `channel_id:String (unique)`, `webhook_url:String`, `idol_name:String`, `idol_avatar:String`, `fan_name:String`, `fan_avatar:String`, `created_at:Date`
- CharacterSystem
  - `channel_id:String (unique)`, `webhook_url:String`, `characters:[{id,name,avatar,description}]`, `default_character_id:String?`, `created_at:Date`

## Logging

Logger tuỳ biến tại `bot/logger.js` (Winston) với các nhóm log: `system`, `init`, `database`, `interaction`, `success`, `config`, `error`, `warn`, `debug`, `api`, `network`, `user`, `guild`, `confession`, `thread`, `timing`.

## Quy trình xử lý Confession (tóm tắt)

1. Người dùng mở modal (ẩn danh/hiện tên) từ thread hướng dẫn.
2. Nội dung lưu vào DB (trạng thái `pending`) và gửi sang admin channel kèm nút duyệt/từ chối.
3. Admin duyệt → tạo thread trong forum channel, cắt nội dung thông minh nếu > 2000 ký tự, thêm nút "Bình luận ẩn danh".
4. Admin từ chối → xóa khỏi DB và báo cho người gửi qua DM (nếu cho phép).

## Triển khai/Chạy nền (gợi ý)

- Dùng dịch vụ hệ thống (systemd) chạy `bun index.js`.
- Hoặc dùng trình quản lý tiến trình (vd. PM2) với Bun: `pm2 start bun -- index.js`.

## Khắc phục sự cố

- Lỗi kết nối MongoDB: kiểm tra `MONGODB_URI`, firewall, trạng thái server MongoDB.
- Lỗi đăng nhập Discord: kiểm tra `BOT_TOKEN`, quyền bot, intents.
- Không gửi được webhook: thiếu quyền "Manage Webhooks" tại kênh; kiểm tra URL webhook.
- Upload file thất bại: Discord giới hạn dung lượng 8MB/file (mặc định trong mã), tổng ~25MB; xem log cảnh báo.
- Autocomplete không hiển thị: cần chạy `/character-config` và thêm ít nhất một nhân vật.

## Góp ý/Phát triển

- Mã nguồn đã được tách mô-đun để tiện mở rộng.
- Thêm tính năng mới: tạo handler/module mới trong `bot/handlers/` hoặc util trong `bot/utils/`.

---

Tác giả: VNMIXX Confession Bot
