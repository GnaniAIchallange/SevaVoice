import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import { env } from "../config/env.js";
import { createVoiceService, VoiceUnavailableError } from "../services/voiceService.js";

const SUPPORTED_LANGUAGES = ["mr-IN", "hi-IN", "en-IN"];
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

const sttLanguageSchema = z.enum(SUPPORTED_LANGUAGES);
const ttsSchema = z.object({
  text: z.string().trim().min(1).max(300),
  language: z.enum(SUPPORTED_LANGUAGES),
});

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
}).single("audio_file");

function uploadMiddleware(req, res, next) {
  uploadAudio(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        error:
          error.code === "LIMIT_FILE_SIZE"
            ? "Audio file must be 5MB or smaller"
            : "Invalid audio upload",
      });
    }

    if (error) {
      return res.status(400).json({ error: "Invalid audio upload" });
    }

    return next();
  });
}

export function createVoiceRouter({
  service = createVoiceService({ apiKey: env.GNANI_API_KEY }),
  limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ error: "Too many voice requests" }),
  }),
} = {}) {
  const router = Router();
  router.use(limiter);

  router.post("/stt", uploadMiddleware, async (req, res) => {
    const languageResult = sttLanguageSchema.safeParse(req.body?.language_code);
    if (!languageResult.success) {
      return res.status(400).json({ error: "Unsupported language_code" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "An audio_file is required" });
    }

    if (!service.isConfigured()) {
      return res.status(503).json({ error: "Voice service not configured" });
    }

    try {
      const transcript = await service.transcribe({
        file: req.file,
        language: languageResult.data,
      });
      return res.json({ transcript });
    } catch (error) {
      if (error instanceof VoiceUnavailableError) {
        return res.status(503).json({ error: "Voice service not configured" });
      }

      console.error("Gnani STT request failed:", error);
      return res.status(502).json({ error: "Voice service unavailable" });
    }
  });

  router.post("/tts", async (req, res) => {
    const result = ttsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "text must be 1-300 characters and language must be supported",
      });
    }

    if (!service.isConfigured()) {
      return res.status(503).json({ error: "Voice service not configured" });
    }

    try {
      const audio = await service.synthesize(result.data);
      return res.type("audio/wav").send(audio);
    } catch (error) {
      if (error instanceof VoiceUnavailableError) {
        return res.status(503).json({ error: error.message });
      }

      console.error("Gnani TTS request failed:", error);
      return res.status(502).json({ error: "Voice service unavailable" });
    }
  });

  return router;
}

export default createVoiceRouter();
