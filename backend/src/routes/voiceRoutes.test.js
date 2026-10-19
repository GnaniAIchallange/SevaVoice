import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import rateLimit from "express-rate-limit";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/sevavoice-test";
process.env.JWT_SECRET ??= "test-secret-at-least-thirty-two-characters";
process.env.GNANI_API_KEY = "";

const { createVoiceRouter } = await import("./voiceRoutes.js");
const { createVoiceService } = await import("../services/voiceService.js");
const { default: app } = await import("../app.js");

const allowRequests = (_req, _res, next) => next();

async function withServer(service, run, limiter = allowRequests) {
  const app = express();
  app.use(express.json());
  app.use("/api/voice", createVoiceRouter({ service, limiter }));
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function createService(overrides = {}) {
  return {
    isConfigured: () => true,
    transcribe: async () => "test transcript",
    synthesize: async () => Buffer.from("test wav"),
    ...overrides,
  };
}

function sttForm({ language = "hi-IN", includeFile = true, size = 4 } = {}) {
  const form = new FormData();
  form.append("language_code", language);
  if (includeFile) {
    form.append(
      "audio_file",
      new Blob([new Uint8Array(size)], { type: "audio/wav" }),
      "recording.wav",
    );
  }
  return form;
}

test("STT rejects unsupported languages and missing audio", async () => {
  await withServer(
    createService({
      transcribe: async () => {
        assert.fail("invalid request must not reach the service");
      },
    }),
    async (baseUrl) => {
      const invalidLanguage = await fetch(`${baseUrl}/api/voice/stt`, {
        method: "POST",
        body: sttForm({ language: "fr-FR" }),
      });
      assert.equal(invalidLanguage.status, 400);
      assert.deepEqual(await invalidLanguage.json(), {
        error: "Unsupported language_code",
      });

      const missingFile = await fetch(`${baseUrl}/api/voice/stt`, {
        method: "POST",
        body: sttForm({ includeFile: false }),
      });
      assert.equal(missingFile.status, 400);
      assert.deepEqual(await missingFile.json(), {
        error: "An audio_file is required",
      });

      const unexpectedField = new FormData();
      unexpectedField.append("language_code", "hi-IN");
      unexpectedField.append(
        "audio",
        new Blob([new Uint8Array(4)], { type: "audio/wav" }),
        "recording.wav",
      );
      const invalidUpload = await fetch(`${baseUrl}/api/voice/stt`, {
        method: "POST",
        body: unexpectedField,
      });
      assert.equal(invalidUpload.status, 400);
      assert.deepEqual(await invalidUpload.json(), {
        error: "Invalid audio upload",
      });
    },
  );
});

test("STT maps oversized uploads to a JSON 400 response", async () => {
  await withServer(createService(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/voice/stt`, {
      method: "POST",
      body: sttForm({ size: 5 * 1024 * 1024 + 1 }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Audio file must be 5MB or smaller",
    });
  });
});

test("TTS rejects empty, oversized, and unsupported-language requests", async () => {
  await withServer(
    createService({
      synthesize: async () => {
        assert.fail("invalid request must not reach the service");
      },
    }),
    async (baseUrl) => {
      for (const body of [
        { text: "", language: "hi-IN" },
        { text: "x".repeat(301), language: "hi-IN" },
        { text: "नमस्ते", language: "fr-FR" },
      ]) {
        const response = await fetch(`${baseUrl}/api/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), {
          error: "text must be 1-300 characters and language must be supported",
        });
      }
    },
  );
});

test("unconfigured key returns the required 503 without an upstream call", async () => {
  let upstreamCalls = 0;
  const service = createVoiceService({
    apiKey: "",
    fetchImpl: async () => {
      upstreamCalls += 1;
      throw new Error("upstream must not be contacted");
    },
  });

  await withServer(service, async (baseUrl) => {
    const tts = await fetch(`${baseUrl}/api/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "नमस्ते", language: "hi-IN" }),
    });
    assert.equal(tts.status, 503);
    assert.deepEqual(await tts.json(), {
      error: "Voice service not configured",
    });

    const stt = await fetch(`${baseUrl}/api/voice/stt`, {
      method: "POST",
      body: sttForm(),
    });
    assert.equal(stt.status, 503);
    assert.deepEqual(await stt.json(), {
      error: "Voice service not configured",
    });
  });

  assert.equal(upstreamCalls, 0);
});

test("application mounts registration and voice routes without a Gnani key", async () => {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const donor = await fetch(`${baseUrl}/api/auth/register/donor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(donor.status, 400);
    assert.deepEqual(await donor.json(), {
      message: "Check the donor registration details",
    });

    const farmer = await fetch(`${baseUrl}/api/farmers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(farmer.status, 400);
    assert.deepEqual(await farmer.json(), {
      message: "Check the farmer registration details",
    });

    const response = await fetch(
      `${baseUrl}/api/voice/tts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "नमस्ते", language: "hi-IN" }),
      },
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: "Voice service not configured",
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("rate limits voice requests", async () => {
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 1,
    standardHeaders: false,
    legacyHeaders: false,
  });
  await withServer(createService(), async (baseUrl) => {
    const request = () =>
      fetch(`${baseUrl}/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hello", language: "hi-IN" }),
      });

    assert.equal((await request()).status, 200);
    assert.equal((await request()).status, 429);
  }, limiter);
});

test("returns a generic 502 for upstream failures", async () => {
  await withServer(
    createService({
      synthesize: async () => {
        throw new Error("upstream detail should not be exposed");
      },
    }),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hello", language: "hi-IN" }),
      });
      assert.equal(response.status, 502);
      assert.deepEqual(await response.json(), {
        error: "Voice service unavailable",
      });
    },
  );
});
