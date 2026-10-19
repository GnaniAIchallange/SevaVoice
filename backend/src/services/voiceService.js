const GNANI_BASE_URL = "https://api.vachana.ai";
const LANGUAGES = new Set(["mr-IN", "hi-IN", "en-IN"]);
const VOICES = Object.freeze({
  "mr-IN": "Ishaan",
  "hi-IN": "Nalini",
  "en-IN": "Kaveri",
});
const MAX_TTS_CACHE_ENTRIES = 100;

export class VoiceUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "VoiceUnavailableError";
  }
}

function isPlaceholderKey(value) {
  return /^(?:<[^>]+>|placeholder(?:$|[-_ ])|(?:your|replace|insert|add|change|enter)[-_ ])/i.test(
    value,
  );
}

export function createVoiceService({
  apiKey = "",
  fetchImpl = fetch,
} = {}) {
  const key = String(apiKey).trim();
  const ttsCache = new Map();

  function isConfigured() {
    return key.length > 0 && !isPlaceholderKey(key);
  }

  function assertConfigured() {
    if (!isConfigured()) {
      throw new VoiceUnavailableError("Voice service not configured");
    }
  }

  async function transcribe({ file, language }) {
    assertConfigured();
    if (!LANGUAGES.has(language)) {
      throw new Error("Unsupported transcription language");
    }

    const form = new FormData();
    form.append(
      "audio_file",
      new Blob([file.buffer], {
        type: file.mimetype || "audio/wav",
      }),
      file.originalname || "recording.wav",
    );
    form.append("language_code", language);
    form.append("format", "transcribe");

    const response = await fetchImpl(`${GNANI_BASE_URL}/stt/v3`, {
      method: "POST",
      headers: { "X-API-Key-ID": key },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Gnani STT returned HTTP ${response.status}`);
    }

    const result = await response.json();
    if (typeof result.transcript !== "string") {
      throw new Error("Gnani STT response did not include a transcript");
    }

    return result.transcript;
  }

  async function synthesize({ text, language }) {
    assertConfigured();
    if (!LANGUAGES.has(language)) {
      throw new Error("Unsupported speech language");
    }

    const voice = VOICES[language];
    const cacheKey = JSON.stringify([language, text]);
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      ttsCache.delete(cacheKey);
      ttsCache.set(cacheKey, cached);
      return cached;
    }

    const response = await fetchImpl(`${GNANI_BASE_URL}/api/v1/tts/inference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key-ID": key,
      },
      body: JSON.stringify({
        text,
        voice,
        model: "timbre-v2.5",
        language,
        speed: 1.0,
        audio_config: {
          sample_rate: 48000,
          num_channels: 1,
          sample_width: 2,
          encoding: "linear_pcm",
          container: "wav",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gnani TTS returned HTTP ${response.status}`);
    }

    const audio = Buffer.from(await response.arrayBuffer());
    ttsCache.set(cacheKey, audio);
    if (ttsCache.size > MAX_TTS_CACHE_ENTRIES) {
      const oldestKey = ttsCache.keys().next().value;
      ttsCache.delete(oldestKey);
    }

    return audio;
  }

  return { isConfigured, transcribe, synthesize };
}
