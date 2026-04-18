const NodeCache = require("node-cache");

// In-memory Node Cache
// Standard TTL: 5 minutes (300 seconds)
const l1Cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

console.log("🚀 In-Memory Cache Initialized (NodeCache)");

/**
 * Get from cache (checks L1 NodeCache, then L2 Redis)
 * @param {string} key 
 */
async function getCache(key) {
  return l1Cache.get(key);
}

/**
 * Set cache (writes to L1 NodeCache, then L2 Redis)
 */
async function setCache(key, value, ttlSeconds = 300) {
  l1Cache.set(key, value, ttlSeconds);
}

/**
 * Invalidate cache dynamically
 * @param {string} keyPattern 
 */
async function invalidateCache(keyPattern) {
  if (keyPattern.endsWith("*")) {
     l1Cache.flushAll();
  } else {
     l1Cache.del(keyPattern);
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
  l1Cache
};
