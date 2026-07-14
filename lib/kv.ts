// lib/kv.ts
// Wrapper around Upstash Redis for multiplier storage.
// Uses @upstash/redis with env vars automatically injected by the Vercel Upstash integration:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const LIST_KEY = "multipliers";
const MAX_ITEMS = 1000;

/** Retrieve all multiplier records (most recent first) */
export async function getMultipliers(): Promise<any[]> {
  const items = await redis.lrange(LIST_KEY, 0, -1);
  return items
    .map((s) => {
      try {
        // Upstash may auto-parse JSON strings; handle both object and string
        if (typeof s === "object") return s;
        return JSON.parse(s as string);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/** Add a new multiplier record (newest pushed to the left so it appears first) */
export async function addMultiplier(record: any): Promise<void> {
  const payload = JSON.stringify(record);
  await redis.lpush(LIST_KEY, payload);
  // Trim list to keep only the most recent MAX_ITEMS entries
  await redis.ltrim(LIST_KEY, 0, MAX_ITEMS - 1);
}

/** Delete all multiplier records and return how many were removed */
export async function clearMultipliers(): Promise<number> {
  const count = await redis.llen(LIST_KEY);
  await redis.del(LIST_KEY);
  return count;
}
