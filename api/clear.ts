// api/clear.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearMultipliers } from "../lib/kv";

export default async function handler(_: VercelRequest, res: VercelResponse) {
  try {
    const deletedCount = await clearMultipliers();
    res.status(200).json({ success: true, deletedCount });
  } catch (err: any) {
    console.error("KV clear error:", err);
    res.status(500).json({ error: err.message || "Failed to clear multipliers" });
  }
}
