// api/multipliers.js
import { getMultipliers, addMultiplier } from "../lib/kv.js";

export default async function handler(req, res) {
  // CORS is already handled globally by vercel.json, but keep this for options requests or extra safety
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning");
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const data = await getMultipliers();
      return res.status(200).json(data);
    } catch (err) {
      console.error("KV GET error:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch multipliers" });
    }
  }

  if (req.method === "POST") {
    try {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ error: "Invalid JSON body" });
        }
      }
      const { multiplier, source } = body || {};
      if (typeof multiplier !== "number" || isNaN(multiplier) || multiplier < 1) {
        return res.status(400).json({ error: "Invalid multiplier value. Must be >= 1" });
      }
      const record = {
        id: "rec_" + Math.random().toString(36).substring(2, 11),
        multiplier: Math.round(multiplier * 100) / 100,
        timestamp: Date.now(),
        source: source ?? "manual",
      };
      await addMultiplier(record);
      return res.status(201).json(record);
    } catch (err) {
      console.error("KV POST error:", err);
      return res.status(500).json({ error: err.message || "Failed to add multiplier" });
    }
  }

  return res.status(405).end();
}
