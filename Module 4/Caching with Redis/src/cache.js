'use strict';

const Redis = require('ioredis');

// Create Redis instance
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  lazyConnect: true
});

// Implement cacheGet
async function cacheGet(key) {
  try {
    const data = await redis.get(key);

    if (data === null) {
      return null;
    }

    return JSON.parse(data);

  } catch (err) {
    console.error('[cache] GET error:', err);
    return null;
  }
}

// Implement cacheSet
async function cacheSet(key, data, ttlSeconds) {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);

  } catch (err) {
    console.error('[cache] SET error:', err);
  }
}

// Implement cacheDel
async function cacheDel(key) {
  try {
    await redis.del(key);

  } catch (err) {
    console.error('[cache] DEL error:', err);
  }
}

module.exports = { cacheGet, cacheSet, cacheDel };