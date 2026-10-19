import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import farmerRoutes from "./routes/farmerRoutes.js";
import voiceRoutes from "./routes/voiceRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/farmers", farmerRoutes);
app.use("/api/voice", voiceRoutes);

app.use((error, _req, res, _next) => {
  if (error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ message: "Invalid request" });
  }
  console.error("Unhandled request error:", error.name || "Error");
  return res.status(500).json({ message: "Internal server error" });
});

export default app;
