import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerPreviewPhoneAuthRoutes } from "./previewPhoneAuth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;

  // Explicit allowed origins from env (comma-separated, e.g., ALLOWED_ORIGINS="https://app.khanakarlo.com,https://admin.khanakarlo.com")
  const envOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (envOrigins.includes(origin)) return true;

  if (process.env.ADMIN_WEB_HOST) {
    const adminHost = process.env.ADMIN_WEB_HOST.trim().replace(/\/$/, "");
    if (origin === adminHost || origin === `https://${adminHost}` || origin === `http://${adminHost}`) {
      return true;
    }
  }

  if (process.env.EXPO_WEB_PREVIEW_URL && origin === process.env.EXPO_WEB_PREVIEW_URL.replace(/\/$/, "")) {
    return true;
  }

  // Allow local development origins (localhost, 127.0.0.1, LAN private IPs on dev ports 8081, 3000, 19006)
  try {
    const parsed = new URL(origin);
    const { hostname, port } = parsed;

    const isDevPort = port === "8081" || port === "3000" || port === "19006" || port === "";

    // Localhost / Loopback
    if ((hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") && isDevPort) {
      return true;
    }

    // Local LAN private IP ranges for development device testing
    const isPrivateIp =
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname);

    if (isPrivateIp && isDevPort) {
      return true;
    }

    // Expo tunnel domains in development
    if (hostname.endsWith(".exp.direct") && process.env.NODE_ENV !== "production") {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);

  // Restrict CORS to allowed origins only (prevent unauthorized cross-origin access)
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin) {
      res.header("Vary", "Origin");

      if (isAllowedOrigin(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.header(
          "Access-Control-Allow-Headers",
          "Origin, X-Requested-With, Content-Type, Accept, Authorization",
        );
      } else {
        // Disallowed origin
        if (req.method === "OPTIONS") {
          res.status(403).json({ error: "CORS origin denied" });
          return;
        }
      }
    }

    // Handle preflight requests for allowed or non-origin requests
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerPreviewPhoneAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
