const Redis = require('ioredis');
require('dotenv').config();

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
};

// Create Redis client
const redis = new Redis(redisConfig);

// Redis events
redis.on('connect', () => {
  console.log('✅ Redis client connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis client error:', err);
});

redis.on('ready', () => {
  console.log('✅ Redis client ready');
});

// Create Redis Pub/Sub clients
const redisPub = new Redis(redisConfig);
const redisSub = new Redis(redisConfig);

/**
 * Test Redis connection
 */
const testRedisConnection = async () => {
  try {
    await redis.ping();
    console.log('✅ Redis connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Redis connection test failed:', error.message);
    return false;
  }
};

/**
 * Close Redis connections
 */
const closeRedisConnection = async () => {
  try {
    await redis.quit();
    await redisPub.quit();
    await redisSub.quit();
    console.log('🔌 Redis connections closed');
  } catch (error) {
    console.error('❌ Error closing Redis connections:', error.message);
  }
};

// Cache helper functions
const cache = {
  /**
   * Get value from cache
   */
  get: async (key) => {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * Set value in cache
   */
  set: async (key, value, expiryInSeconds = 3600) => {
    try {
      await redis.setex(key, expiryInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  /**
   * Delete key from cache
   */
  del: async (key) => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  /**
   * Delete multiple keys matching pattern
   */
  delPattern: async (pattern) => {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  },

  /**
   * Check if key exists
   */
  exists: async (key) => {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  },

  /**
   * Set expiry on existing key
   */
  expire: async (key, seconds) => {
    try {
      await redis.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  },

  /**
   * Increment value
   */
  incr: async (key) => {
    try {
      const value = await redis.incr(key);
      return value;
    } catch (error) {
      console.error('Cache increment error:', error);
      return null;
    }
  },

  /**
   * Get TTL of key
   */
  ttl: async (key) => {
    try {
      const ttl = await redis.ttl(key);
      return ttl;
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  }
};

module.exports = {
  redis,
  redisPub,
  redisSub,
  cache,
  testRedisConnection,
  closeRedisConnection
};