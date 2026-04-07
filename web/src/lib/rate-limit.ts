/**
 * In-memory rate limiter cho API routes.
 * Giới hạn request per IP trong sliding window.
 * Không cần dependency — phù hợp cho Vercel serverless.
 */

const requests = new Map<string, number[]>();

// Dọn entries cũ mỗi 5 phút
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, timestamps] of requests) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) requests.delete(key);
    else requests.set(key, valid);
  }
}

export function rateLimit(
  ip: string,
  { limit = 20, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): { allowed: boolean; remaining: number } {
  cleanup(windowMs);
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (requests.get(ip) || []).filter((t) => t > cutoff);

  if (timestamps.length >= limit) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  requests.set(ip, timestamps);
  return { allowed: true, remaining: limit - timestamps.length };
}
