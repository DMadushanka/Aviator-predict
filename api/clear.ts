// api/clear.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearMultipliers } from "../lib/kv";

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

  try {
    const deletedCount = await clearMultipliers();
    return res.status(200).json({ success: true, deletedCount });
  } catch (err: any) {
    console.error("KV clear error:", err);
    return res.status(500).json({ error: err.message || "Failed to clear multipliers" });
  }
}
