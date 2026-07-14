// lib/kv.ts
// Simple wrapper around Vercel KV for multiplier storage
// Stores each multiplier as a JSON string in a Redis list "multipliers"
// The list is kept capped at 1000 items (most recent).

import { kv } from "@vercel/kv";

const LIST_KEY = "multipliers";
const MAX_ITEMS = 1000;

/** Retrieve all multiplier records (most recent first) */
export async function getMultipliers(): Promise<any[]> {
  const items = await kv.lrange(LIST_KEY, 0, -1);
  return items
    .map((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/** Add a new multiplier record */
export async function addMultiplier(record: any): Promise<void> {
  const payload = JSON.stringify(record);
  await kv.lpush(LIST_KEY, payload);
  await kv.ltrim(LIST_KEY, 0, MAX_ITEMS - 1);
}

/** Clear all multiplier records */
export async function clearMultipliers(): Promise<number> {
  const count = await kv.llen(LIST_KEY);
  await kv.del(LIST_KEY);
  return count;
}
