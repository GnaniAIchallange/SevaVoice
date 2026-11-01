import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import farmerRoutes from "./routes/farmerRoutes.js";
import farmerWorkspaceRoutes from "./routes/farmerWorkspaceRoutes.js";
import voiceRoutes from "./routes/voiceRoutes.js";
import verifierRoutes from "./routes/verifierRoutes.js";
import donorRoutes from "./routes/donorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

app.set("trust proxy", 1);

const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const isDevelopment = process.env.NODE_ENV !== "production";

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. server-to-server, curl, tests)
      if (!origin) return cb(null, true);

      // Match explicit CLIENT_URL entries
      if (configuredOrigins.includes(origin)) return cb(null, true);

      // In local development or if CLIENT_URL is empty, allow localhost and loopback
      if (
        isDevelopment ||
        configuredOrigins.length === 0 ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return cb(null, true);
      }

      // Allow Vercel deployments (production & branch preview URLs)
      if (/\.vercel\.app$/.test(origin)) {
        return cb(null, true);
      }

      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Idempotency-Key",
      "idempotency-key",
      "X-API-Key-ID",
    ],
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/farmers", farmerRoutes);
app.use("/api/farmer", farmerWorkspaceRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/verifier", verifierRoutes);
app.use("/api/donor", donorRoutes);
app.use("/api/admin", adminRoutes);

app.use((error, _req, res, _next) => {
  if (error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ message: "Invalid request" });
  }
  console.error("Unhandled request error:", error.name || "Error");
  return res.status(500).json({ message: "Internal server error" });
});

export default app;