/**
 * 简易内存限流：防止登录 / 注册接口被暴力尝试
 * 说明：单机内存实现，重启后计数清零，实验环境下足够。
 */
function rateLimit({ windowMs = 10 * 60 * 1000, max = 30, message = "操作过于频繁，请稍后再试" } = {}) {
  const buckets = new Map();

  // 定期清理过期计数，避免内存无限增长
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs);
  if (typeof timer.unref === "function") timer.unref();

  return function rateLimitMiddleware(req, res, next) {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

module.exports = { rateLimit };
