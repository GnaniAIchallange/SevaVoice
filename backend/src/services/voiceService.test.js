import assert from "node:assert/strict";
import test from "node:test";
import { createVoiceService, VoiceUnavailableError } from "./voiceService.js";

test("does not call Gnani when the key is missing or a placeholder", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    throw new Error("fetch should not be called");
  };

  for (const apiKey of ["", "replace-with-your-key", "<API_KEY>"]) {
    const service = createVoiceService({ apiKey, fetchImpl });
    assert.equal(service.isConfigured(), false);
    await assert.rejects(
      service.synthesize({ text: "नमस्ते", language: "hi-IN" }),
      VoiceUnavailableError,
    );
  }

  assert.equal(calls, 0);
});

test("sends the documented TTS request and caches identical audio", async () => {
  let calls = 0;
  const bytes = new Uint8Array([82, 73, 70, 70, 1, 2, 3]);
  const service = createVoiceService({
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.equal(url, "https://api.vachana.ai/api/v1/tts/inference");
      assert.equal(options.method, "POST");
      assert.equal(options.headers["X-API-Key-ID"], "test-key");
      const payload = JSON.parse(options.body);
      assert.deepEqual(payload, {
        text: "नमस्ते",
        voice: "Nalini",
        model: "timbre-v2.5",
        language: "hi-IN",
        speed: 1,
        audio_config: {
          sample_rate: 48000,
          num_channels: 1,
          sample_width: 2,
          encoding: "linear_pcm",
          container: "wav",
        },
      });
      return new Response(bytes, { status: 200 });
    },
  });

  const first = await service.synthesize({ text: "नमस्ते", language: "hi-IN" });
  const second = await service.synthesize({ text: "नमस्ते", language: "hi-IN" });

  assert.deepEqual(first, Buffer.from(bytes));
  assert.deepEqual(second, Buffer.from(bytes));
  assert.equal(calls, 1);
});

test("sends the documented STT multipart fields and reads the transcript", async () => {
  let calls = 0;
  const service = createVoiceService({
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.equal(url, "https://api.vachana.ai/stt/v3");
      assert.equal(options.method, "POST");
      assert.equal(options.headers["X-API-Key-ID"], "test-key");
      assert.equal(options.body.get("language_code"), "mr-IN");
      assert.equal(options.body.get("format"), "transcribe");
      assert.equal(options.body.get("audio_file").name, "recording.wav");
      return Response.json({ transcript: "नमस्कार" });
    },
  });

  const transcript = await service.transcribe({
    language: "mr-IN",
    file: {
      buffer: Buffer.from([1, 2, 3]),
      mimetype: "audio/wav",
      originalname: "recording.wav",
    },
  });

  assert.equal(transcript, "नमस्कार");
  assert.equal(calls, 1);
});

test("uses only catalogued voices for each supported language", async () => {
  let calls = 0;
  const service = createVoiceService({
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      calls += 1;
      const request = JSON.parse(options.body);
      assert.equal(request.model, "timbre-v2.5");
      assert.deepEqual(
        [request.language, request.voice],
        [
          ["mr-IN", "Ishaan"],
          ["hi-IN", "Nalini"],
          ["en-IN", "Kaveri"],
        ][calls - 1],
      );
      return new Response(Buffer.from("audio"));
    },
  });

  for (const language of ["mr-IN", "hi-IN", "en-IN"]) {
    await service.synthesize({ text: `Hello ${language}`, language });
  }
  assert.equal(calls, 3);
});
