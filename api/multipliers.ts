// api/multipliers.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMultipliers, addMultiplier } from "../lib/kv";

function setCORSHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning"
  );
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORSHeaders(res);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const data = await getMultipliers();
      return res.status(200).json(data);
    } catch (err: any) {
      console.error("KV GET error:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch multipliers" });
    }
  }

  if (req.method === "POST") {
    try {
      let body = req.body;
      // Handle text/plain bodies (sent by the scraper)
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch {
          return res.status(400).json({ error: "Invalid JSON body" });
        }
      }
      const { multiplier, source } = body || {};
      if (typeof multiplier !== "number" || isNaN(multiplier) || multiplier < 1) {
        return res.status(400).json({ error: "Invalid multiplier value. Must be >= 1" });
      }
      const record = {
        multiplier: Math.round(multiplier * 100) / 100,
        timestamp: Date.now(),
        source: source ?? "manual",
      };
      await addMultiplier(record);
      return res.status(201).json(record);
    } catch (err: any) {
      console.error("KV POST error:", err);
      return res.status(500).json({ error: err.message || "Failed to add multiplier" });
    }
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  return res.status(405).end();
}
