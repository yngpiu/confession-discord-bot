function setupRoutes(app, client) {
  // Home page - Bot invite
  app.get('/', (req, res) => {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=326417787968&scope=bot%20applications.commands`;

    res.render('index', {
      botName: client.user?.tag || 'VNMIXX Confession Bot',
      inviteUrl: inviteUrl,
      isOnline: client.isReady(),
    });
  });

  // API endpoint for bot status
  app.get('/api/status', (req, res) => {
    res.json({
      online: client.isReady(),
      guilds: client.guilds.cache.size,
      users: client.guilds.cache.reduce(
        (acc, guild) => acc + guild.memberCount,
        0
      ),
    });
  });
}

module.exports = { setupRoutes };
