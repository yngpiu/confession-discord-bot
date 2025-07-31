const winston = require('winston');
const chalk = require('chalk').default || require('chalk');

// Custom format function
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    let coloredLevel;
    let emoji;

    switch (level) {
      case 'error':
        coloredLevel = chalk.red(chalk.bold('ERROR  '));
        emoji = '❌';
        break;
      case 'warn':
        coloredLevel = chalk.yellow(chalk.bold('WARN   '));
        emoji = '⚠️';
        break;
      case 'info':
        coloredLevel = chalk.blue(chalk.bold('INFO   '));
        emoji = 'ℹ️';
        break;
      case 'success':
        coloredLevel = chalk.green(chalk.bold('SUCCESS'));
        emoji = '✅';
        break;
      case 'debug':
        coloredLevel = chalk.gray(chalk.bold('DEBUG  '));
        emoji = '🔍';
        break;
      default:
        coloredLevel = chalk.white(chalk.bold(level.toUpperCase().padEnd(7)));
        emoji = '📋';
    }

    const coloredTimestamp = chalk.gray(`[${timestamp}]`);
    const formattedMessage = stack ? `${message}\n${stack}` : message;

    return `${coloredTimestamp} ${emoji} ${coloredLevel}: ${formattedMessage}`;
  })
);

// Add custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    success: 2,
    debug: 3,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    success: 'green',
    debug: 'gray',
  },
};

winston.addColors(customLevels.colors);

// Create winston logger
const logger = winston.createLogger({
  level: 'debug',
  levels: customLevels.levels,
  format: customFormat,
  transports: [
    // Console transport only
    new winston.transports.Console(),
  ],
});

// Create enhanced logger with shortcuts
class BotLogger {
  constructor() {
    this.winston = logger;
  }

  // System events
  system(message, ...args) {
    this.winston.info(`🤖 ${message}`, ...args);
  }

  // Bot initialization
  init(message, ...args) {
    this.winston.info(`🚀 ${message}`, ...args);
  }

  // Database operations
  database(message, ...args) {
    this.winston.info(`💾 ${message}`, ...args);
  }

  // Discord interactions
  interaction(message, ...args) {
    this.winston.info(`🎯 ${message}`, ...args);
  }

  // Success operations
  success(message, ...args) {
    this.winston.log('success', `${message}`, ...args);
  }

  // Configuration changes
  config(message, ...args) {
    this.winston.info(`⚙️ ${message}`, ...args);
  }

  // Error handling
  error(message, error, ...args) {
    if (error && error.stack) {
      this.winston.error(`${message}`, error, ...args);
    } else {
      this.winston.error(`${message}`, error || '', ...args);
    }
  }

  // Warning messages
  warn(message, ...args) {
    this.winston.warn(`${message}`, ...args);
  }

  // Debug information
  debug(message, ...args) {
    this.winston.debug(`${message}`, ...args);
  }

  // Information messages
  info(message, ...args) {
    this.winston.info(`${message}`, ...args);
  }

  // Performance timing
  timing(commandName, duration) {
    this.winston.info(
      `⏱️ Command ${chalk.cyan(commandName)} executed in ${chalk.yellow(
        duration
      )}ms`
    );
  }

  // User actions
  user(action, username, guildName) {
    this.winston.info(
      `👤 ${action} from ${chalk.cyan(username)} in ${chalk.magenta(guildName)}`
    );
  }

  // Guild operations
  guild(action, guildName, details = '') {
    this.winston.info(
      `🏢 ${action} for guild ${chalk.magenta(guildName)} ${details}`
    );
  }

  // Confession operations
  confession(action, confessionId, details = '') {
    this.winston.info(
      `📨 ${action} confession #${chalk.yellow(confessionId)} ${details}`
    );
  }

  // Thread operations
  thread(action, threadName, details = '') {
    this.winston.info(
      `🧵 ${action} thread ${chalk.cyan(threadName)} ${details}`
    );
  }

  // Network operations
  network(message, ...args) {
    this.winston.info(`🌐 ${message}`, ...args);
  }

  // API operations
  api(message, ...args) {
    this.winston.info(`📡 ${message}`, ...args);
  }
}

// No file logging - console only

// Export singleton instance
const botLogger = new BotLogger();

module.exports = botLogger;
