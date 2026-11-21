// Idempotency Middleware for Financial Transactions
// Prevents duplicate charges and ensures safe retries

import { getRedis } from '../services/redisClient.js';

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

export function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.header('Idempotency-Key') || req.header('X-Idempotency-Key');

  if (!idempotencyKey) {
    return next();
  }

  const redis = getRedis();
  const cacheKey = `idempotency:${req.method}:${req.baseUrl + req.path}:${idempotencyKey}`;

  redis.get(cacheKey).then(cached => {
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        return res.status(parsed.status).json(parsed.body);
      } catch (e) {
        // Fallback to next if parsing error
      }
    }

    // Capture response to cache
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      // Only cache successful or client validation responses (not 500s)
      if (res.statusCode >= 200 && res.statusCode < 500) {
        const payloadToCache = {
          status: res.statusCode,
          body
        };
        redis.set(cacheKey, JSON.stringify(payloadToCache), 'EX', IDEMPOTENCY_TTL_SECONDS).catch(err => {
          console.error('[Idempotency] Failed to cache response:', err.message);
        });
      }
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Idempotency-Key', idempotencyKey);
      return originalJson(body);
    };

    next();
  }).catch(err => {
    console.error('[Idempotency] Redis error:', err.message);
    next();
  });
}
