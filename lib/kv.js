// lib/kv.js
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

const redis = new Redis({
  url: url,
  token: token,
});

const LIST_KEY = "multipliers";
const MAX_ITEMS = 1000;

export async function getMultipliers() {
  const items = await redis.lrange(LIST_KEY, 0, -1);
  return items
    .map((s) => {
      try {
        if (typeof s === "object") return s;
        return JSON.parse(s);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function addMultiplier(record) {
  const payload = JSON.stringify(record);
  await redis.lpush(LIST_KEY, payload);
  await redis.ltrim(LIST_KEY, 0, MAX_ITEMS - 1);
}

export async function clearMultipliers() {
  const count = await redis.llen(LIST_KEY);
  await redis.del(LIST_KEY);
  return count;
}
