const NodeCache = require("node-cache");
const Redis = require("ioredis");

// Fallback to in-memory Node Cache (L1)
// Standard TTL: 5 minutes (300 seconds)
const l1Cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

// Optional Redis (L2) configuration
let redisClient = null;
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
    });
    
    redisClient.on('error', (err) => {
        console.error("⚠️ L2 Redis Cache Error:", err.message);
    });

    redisClient.on('connect', () => {
        console.log("🚀 L2 Redis Cache Initialized & Connected");
    });
  } catch (err) {
    console.error("⚠️ L2 Redis Cache Failed to Initialize:", err.message);
  }
}

/**
 * Get from cache (checks L1 NodeCache, then L2 Redis)
 * @param {string} key 
 */
async function getCache(key) {
  // L1 Check
  const l1Data = l1Cache.get(key);
  if (l1Data) return l1Data;

  // L2 Check
  if (redisClient && redisClient.status === "ready") {
    try {
      const l2Data = await redisClient.get(key);
      if (l2Data) {
        const parsed = JSON.parse(l2Data);
        // Backfill L1 for next time
        l1Cache.set(key, parsed);
        return parsed;
      }
    } catch (e) {
      console.warn("Redis get error", e.message);
    }
  }

  return null;
}

/**
 * Set cache (writes to L1 NodeCache, then L2 Redis)
 */
async function setCache(key, value, ttlSeconds = 300) {
  l1Cache.set(key, value, ttlSeconds);

  if (redisClient && redisClient.status === "ready") {
    try {
      await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (e) {
      console.warn("Redis set error", e.message);
    }
  }
}

/**
 * Invalidate cache dynamically
 * @param {string} keyPattern 
 */
async function invalidateCache(keyPattern) {
  // Clear L1 exact matches (or wipe all if pattern)
  if (keyPattern.endsWith("*")) {
     l1Cache.flushAll(); // Force L1 clear for wide patterns
  } else {
     l1Cache.del(keyPattern);
  }

  // Clear L2
  if (redisClient && redisClient.status === "ready") {
     try {
       if (keyPattern.endsWith("*")) {
          const keys = await redisClient.keys(keyPattern);
          if (keys.length > 0) await redisClient.del(keys);
       } else {
          await redisClient.del(keyPattern);
       }
     } catch(e) {
       console.warn("Redis del error", e.message);
     }
  }
}

// Express Middleware for caching standard queries
// Usage: router.get('/jobs', cacheMiddleware(300), getJobs)
function cacheMiddleware(duration) {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `express_cache_${req.originalUrl || req.url}`;
        try {
            const cachedBody = await getCache(key);
            if (cachedBody) {
                return res.status(200).json(cachedBody);
            } else {
                // Intercept res.json to cache it
                res.originalJson = res.json;
                res.json = (body) => {
                    // Only cache successful responses
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                       setCache(key, body, duration);
                    }
                    res.originalJson(body);
                };
                next();
            }
        } catch (err) {
            next();
        }
    };
}

module.exports = {
  getCache,
  setCache,
  invalidateCache,
  cacheMiddleware,
  l1Cache,
  redisClient
};
