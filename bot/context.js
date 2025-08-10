let discordClientRef = null;

function setClient(client) {
  discordClientRef = client;
}

function getClient() {
  return discordClientRef;
}

module.exports = { setClient, getClient };
