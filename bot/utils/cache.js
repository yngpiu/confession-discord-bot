const logger = require('../logger');

/**
 * Simple in-memory cache for character systems
 * Key: guildId
 * Value: { characters: [...], lastUpdated: timestamp }
 */
class CharacterCache {
  constructor() {
    this.cache = new Map();
    this.TTL = 5 * 60 * 1000; // 5 minutes TTL
  }

  /**
   * Get cached character list for a guild
   * @param {string} guildId
   * @returns {Array|null} characters array or null if not cached/expired
   */
  get(guildId) {
    const cached = this.cache.get(guildId);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.lastUpdated > this.TTL) {
      this.cache.delete(guildId);
      logger.debug(`Cache expired for guild ${guildId}`);
      return null;
    }

    logger.debug(
      `Cache hit for guild ${guildId}, ${cached.characters.length} characters`
    );
    return cached.characters;
  }

  /**
   * Set character list cache for a guild
   * @param {string} guildId
   * @param {Array} characters
   */
  set(guildId, characters) {
    this.cache.set(guildId, {
      characters: characters || [],
      lastUpdated: Date.now(),
    });
    logger.debug(
      `Cached ${characters?.length || 0} characters for guild ${guildId}`
    );
  }

  /**
   * Invalidate cache for a guild (when characters are added/removed)
   * @param {string} guildId
   */
  invalidate(guildId) {
    if (this.cache.has(guildId)) {
      this.cache.delete(guildId);
      logger.debug(`Invalidated cache for guild ${guildId}`);
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    logger.debug(`Cleared all cache (${size} entries)`);
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      guilds: Array.from(this.cache.keys()),
      TTL: this.TTL,
    };
  }
}

// Singleton instance
const characterCache = new CharacterCache();

module.exports = { characterCache };
