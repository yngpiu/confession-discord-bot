const logger = require('../bot/logger');

function setupRoutes(app, client) {
  logger.system('Đang thiết lập web routes...');
  logger.system('Đã cung cấp client cho route setup');

  // Home page - Bot invite
  app.get('/', (req, res) => {
    logger.api('Nhận được request trang chủ');
    logger.debug(`Chi tiết request:`);
    logger.debug(`  IP: ${req.ip || req.connection.remoteAddress}`);
    logger.debug(`  User-Agent: ${req.get('User-Agent') || 'Không xác định'}`);
    logger.debug(`  Timestamp: ${new Date().toISOString()}`);

    const clientId = process.env.CLIENT_ID;
    logger.system(`Client ID: ${clientId ? 'Đã thiết lập' : 'Chưa thiết lập'}`);

    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=326417787968&scope=bot%20applications.commands`;

    logger.system('Đã tạo invite URL');
    logger.debug(`Kiểm tra trạng thái bot:`);

    const botName = client.user?.tag || 'VNMIXX Confession Bot';
    const isOnline = client.isReady();

    logger.debug(`  Tên bot: ${botName}`);
    logger.debug(`  Đang online: ${isOnline}`);
    logger.debug(`  Client ready: ${client.readyAt ? 'Có' : 'Không'}`);

    const renderData = {
      botName: botName,
      inviteUrl: inviteUrl,
      isOnline: isOnline,
    };

    logger.api('Đang render index.ejs với dữ liệu:', renderData);

    try {
      res.render('index', renderData);
      logger.success('Đã render trang chủ thành công');
    } catch (error) {
      logger.error('Lỗi khi render trang chủ:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  logger.success('Đã đăng ký home route (/)');

  // API endpoint for bot status
  app.get('/api/status', (req, res) => {
    logger.api('Nhận được API status request');
    logger.debug(`Chi tiết request:`);
    logger.debug(`  IP: ${req.ip || req.connection.remoteAddress}`);
    logger.debug(`  User-Agent: ${req.get('User-Agent') || 'Không xác định'}`);
    logger.debug(`  Timestamp: ${new Date().toISOString()}`);

    logger.api('Đang thu thập thống kê bot...');

    const isOnline = client.isReady();
    const guildsCount = client.guilds.cache.size;

    logger.api(`Thống kê bot:`);
    logger.debug(`  Online: ${isOnline}`);
    logger.debug(`  Guilds: ${guildsCount}`);

    let totalUsers = 0;
    try {
      totalUsers = client.guilds.cache.reduce((acc, guild) => {
        const memberCount = guild.memberCount || 0;
        logger.debug(`  Guild "${guild.name}": ${memberCount} thành viên`);
        return acc + memberCount;
      }, 0);
      logger.debug(`  Tổng người dùng trên tất cả guilds: ${totalUsers}`);
    } catch (error) {
      logger.error('Lỗi khi tính tổng người dùng:', error);
      totalUsers = 0;
    }

    const statusData = {
      online: isOnline,
      guilds: guildsCount,
      users: totalUsers,
    };

    logger.api('Đang gửi API response:', statusData);

    try {
      res.json(statusData);
      logger.success('Đã gửi API status response thành công');
    } catch (error) {
      logger.error('Lỗi khi gửi API response:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  logger.success('Đã đăng ký API status route (/api/status)');

  // Add 404 handler
  app.use('*', (req, res) => {
    logger.warn('404 - Không tìm thấy route');
    logger.debug(`Chi tiết request:`);
    logger.debug(`  Method: ${req.method}`);
    logger.debug(`  URL: ${req.originalUrl}`);
    logger.debug(`  IP: ${req.ip || req.connection.remoteAddress}`);
    logger.debug(`  User-Agent: ${req.get('User-Agent') || 'Không xác định'}`);

    res.status(404).json({
      error: 'Route not found',
      requested: req.originalUrl,
      method: req.method,
    });

    logger.api('Đã gửi 404 response');
  });

  logger.success('Đã đăng ký 404 handler');
  logger.success('Hoàn thành thiết lập tất cả web routes thành công');
}

logger.system('Đã load Routes module thành công');

module.exports = { setupRoutes };
