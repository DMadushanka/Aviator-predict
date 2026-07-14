// api/multipliers.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMultipliers, addMultiplier } from "../lib/kv";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const data = await getMultipliers();
      // KV stores newest first via LPUSH, so return as‑is
      res.status(200).json(data);
    } catch (err: any) {
      console.error("KV GET error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch multipliers" });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const { multiplier, source } = req.body || {};
      if (typeof multiplier !== "number" || isNaN(multiplier) || multiplier < 1) {
        return res.status(400).json({ error: "Invalid multiplier value. Must be >= 1" });
      }
      const record = {
        multiplier: Math.round(multiplier * 100) / 100,
        timestamp: Date.now(),
        source: source ?? "manual",
      };
      await addMultiplier(record);
      res.status(201).json(record);
    } catch (err: any) {
      console.error("KV POST error:", err);
      res.status(500).json({ error: err.message || "Failed to add multiplier" });
    }
    return;
  }

  // Unsupported method
  res.setHeader("Allow", "GET,POST");
  res.status(405).end();
}
