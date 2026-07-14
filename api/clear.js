// api/clear.js
import { clearMultipliers } from "../lib/kv.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning");
    return res.status(200).end();
  }

  try {
    const deletedCount = await clearMultipliers();
    return res.status(200).json({ success: true, deletedCount });
  } catch (err) {
    console.error("KV clear error:", err);
    return res.status(500).json({ error: err.message || "Failed to clear multipliers" });
  }
}
