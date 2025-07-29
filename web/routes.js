function setupRoutes(app, client) {
  console.log('🛣️ Đang thiết lập web routes...');
  console.log('🤖 Đã cung cấp client cho route setup');

  // Home page - Bot invite
  app.get('/', (req, res) => {
    console.log('🏠 Nhận được request trang chủ');
    console.log(`📡 Chi tiết request:`);
    console.log(`  IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`  User-Agent: ${req.get('User-Agent') || 'Không xác định'}`);
    console.log(`  Timestamp: ${new Date().toISOString()}`);

    const clientId = process.env.CLIENT_ID;
    console.log(
      `🔑 Client ID: ${clientId ? 'Đã thiết lập' : 'Chưa thiết lập'}`
    );

    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=326417787968&scope=bot%20applications.commands`;

    console.log('🔗 Đã tạo invite URL');
    console.log(`📊 Kiểm tra trạng thái bot:`);

    const botName = client.user?.tag || 'VNMIXX Confession Bot';
    const isOnline = client.isReady();

    console.log(`  Tên bot: ${botName}`);
    console.log(`  Đang online: ${isOnline}`);
    console.log(`  Client ready: ${client.readyAt ? 'Có' : 'Không'}`);

    const renderData = {
      botName: botName,
      inviteUrl: inviteUrl,
      isOnline: isOnline,
    };

    console.log('📄 Đang render index.ejs với dữ liệu:', renderData);

    try {
      res.render('index', renderData);
      console.log('✅ Đã render trang chủ thành công');
    } catch (error) {
      console.error('❌ Lỗi khi render trang chủ:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  console.log('✅ Đã đăng ký home route (/)');

  // API endpoint for bot status
  app.get('/api/status', (req, res) => {
    console.log('📊 Nhận được API status request');
    console.log(`📡 Chi tiết request:`);
    console.log(`  IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`  User-Agent: ${req.get('User-Agent') || 'Không xác định'}`);
    console.log(`  Timestamp: ${new Date().toISOString()}`);

    console.log('🔍 Đang thu thập thống kê bot...');

    const isOnline = client.isReady();
    const guildsCount = client.guilds.cache.size;

    console.log(`📊 Thống kê bot:`);
    console.log(`  Online: ${isOnline}`);
    console.log(`  Guilds: ${guildsCount}`);

    let totalUsers = 0;
    try {
      totalUsers = client.guilds.cache.reduce((acc, guild) => {
        const memberCount = guild.memberCount || 0;
        console.log(`  Guild "${guild.name}": ${memberCount} thành viên`);
        return acc + memberCount;
      }, 0);
      console.log(`  Tổng người dùng trên tất cả guilds: ${totalUsers}`);
    } catch (error) {
      console.error('⚠️ Lỗi khi tính tổng người dùng:', error);
      totalUsers = 0;
    }

    const statusData = {
      online: isOnline,
      guilds: guildsCount,
      users: totalUsers,
    };

    console.log('📤 Đang gửi API response:', statusData);

    try {
      res.json(statusData);
      console.log('✅ Đã gửi API status response thành công');
    } catch (error) {
      console.error('❌ Lỗi khi gửi API response:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  console.log('✅ Đã đăng ký API status route (/api/status)');

  // Add 404 handler
  app.use('*', (req, res) => {
    console.log('❌ 404 - Không tìm thấy route');
    console.log(`📡 Chi tiết request:`);
    console.log(`  Method: ${req.method}`);
    console.log(`  URL: ${req.originalUrl}`);
    console.log(`  IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`  User-Agent: ${req.get('User-Agent') || 'Không xác định'}`);

    res.status(404).json({
      error: 'Route not found',
      requested: req.originalUrl,
      method: req.method,
    });

    console.log('📤 Đã gửi 404 response');
  });

  console.log('✅ Đã đăng ký 404 handler');
  console.log('🎯 Hoàn thành thiết lập tất cả web routes thành công');
}

console.log('📦 Đã load Routes module thành công');

module.exports = { setupRoutes };
