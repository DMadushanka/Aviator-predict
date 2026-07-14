import express from "express";
import path from "path";
// import fs from "fs"; // removed – storage now uses Vercel KV
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function listenOnPort(app: any, requestedPort: number, host: string) {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = requestedPort + attempt;

    try {
      await new Promise<void>((resolve, reject) => {
        const server = app.listen(port, host, () => resolve());
        server.on("error", (error: NodeJS.ErrnoException) => reject(error));
      });

      return port;
    } catch (error: any) {
      if (error.code === "EADDRINUSE") {
        console.warn(`Port ${port} is busy, trying ${port + 1}...`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Unable to start the server after ${maxAttempts} attempts`);
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.text({ type: "text/plain" }));

  // Custom CORS middleware to accept multiplier records from external browser sessions
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    } else {
      res.header("Access-Control-Allow-Origin", "*");
    }
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Access-Control-Allow-Private-Network", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  const requestedPort = Number.parseInt(process.env.PORT || "3000", 10);
  const host = process.env.HOST || "0.0.0.0";

  // Storage has been moved to Vercel KV (see api/*.ts). The file‑based fallback is no longer used.

  // Serve static UI assets or Vite Dev Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const actualPort = await listenOnPort(app, requestedPort, host);
  console.log(`Server running on http://localhost:${actualPort}`);
}

startServer();
