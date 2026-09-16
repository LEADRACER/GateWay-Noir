/**
 * Rate limiter with in-memory fallback and optional Upstash Redis support for multi-instance.
 * Uses sliding window algorithm.
 */

let RedisClass: typeof import("@upstash/redis").Redis | null = null;

async function getRedisClass() {
  if (RedisClass) return RedisClass;
  try {
    const mod = await import("@upstash/redis");
    RedisClass = mod.Redis;
    return RedisClass;
  } catch {
    return null;
  }
}

const IN_MEMORY = new Map<string, number[]>();
let redisInstance: InstanceType<typeof import("@upstash/redis").Redis> | null = null;

async function getRedis() {
  if (redisInstance) return redisInstance;
  const Redis = await getRedisClass();
  if (!Redis) return null;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redisInstance = new Redis({ url, token });
    return redisInstance;
  }
  return null;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  total: number;
}

export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const r = await getRedis();

  if (r) {
    // Use Redis sorted set for distributed rate limiting
    const redisKey = `ratelimit:${key}`;
    const pipe = r.pipeline();
    pipe.zremrangebyscore(redisKey, 0, windowStart);
    pipe.zcard(redisKey);
    pipe.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });
    pipe.expire(redisKey, Math.ceil(windowMs / 1000) + 1);
    const results = await pipe.exec();

    const currentCount = (results[1] as number) || 0;
    const allowed = currentCount < max;
    return {
      allowed,
      remaining: Math.max(0, max - currentCount - 1),
      resetTime: now + windowMs,
      total: max,
    };
  }

  // Fallback to in-memory
  const arr = (IN_MEMORY.get(key) || []).filter((t) => t > windowStart);
  const allowed = arr.length < max;
  if (allowed) arr.push(now);
  IN_MEMORY.set(key, arr);

  return {
    allowed,
    remaining: Math.max(0, max - arr.length),
    resetTime: now + windowMs,
    total: max,
  };
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function getRateLimitKey(req: Request, prefix: string): string {
  const ip = clientIp(req);
  return `${prefix}:${ip}`;
}