// Redis Client Manager for PayPulse AI
// Supports real ioredis with fallback to an in-memory key-value cache

import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redis = null;
let isRedisConnected = false;

// Fallback in-memory cache
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, mode, duration) {
    let expiresAt = null;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    } else if (mode === 'PX' && duration) {
      expiresAt = Date.now() + duration;
    }
    this.store.set(key, { value: String(value), expiresAt });
    return 'OK';
  }

  async setnx(key, value) {
    if (this.store.has(key)) {
      const item = this.store.get(key);
      if (!item.expiresAt || Date.now() <= item.expiresAt) {
        return 0;
      }
    }
    this.store.set(key, { value: String(value), expiresAt: null });
    return 1;
  }

  async del(key) {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async flushall() {
    this.store.clear();
    return 'OK';
  }
}

const memoryCache = new MemoryCache();

export async function initRedis() {
  if (process.env.FORCE_MEMORY_REDIS === 'true') {
    console.log('[Redis] FORCE_MEMORY_REDIS enabled. Using in-memory cache.');
    isRedisConnected = false;
    return;
  }

  try {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null // don't hang if offline
    });

    await new Promise((resolve, reject) => {
      redis.on('connect', () => {
        isRedisConnected = true;
        console.log(`[Redis] Connected successfully to ${url}`);
        resolve();
      });
      redis.on('error', (err) => {
        isRedisConnected = false;
        reject(err);
      });
    });
  } catch (err) {
    console.warn(`[Redis] Redis connection not available (${err.message}). Seamlessly running on In-Memory Redis Cache Engine.`);
    isRedisConnected = false;
    redis = null;
  }
}

export function getRedis() {
  return isRedisConnected && redis ? redis : memoryCache;
}

export function isUsingRealRedis() {
  return isRedisConnected;
}
