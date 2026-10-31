const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SAMPLE_RATE = 16000;

export function normalizeVoiceLanguage(language) {
  if (!language) return "en-IN";
  const trimmed = String(language).trim();
  const map = {
    mr: "mr-IN",
    hi: "hi-IN",
    en: "en-IN",
    "mr-IN": "mr-IN",
    "hi-IN": "hi-IN",
    "en-IN": "en-IN",
  };
  return map[trimmed] || (trimmed.length === 2 ? `${trimmed}-IN` : trimmed);
}

function speakWithBrowserSynthesis(text, language) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return reject(new Error("Speech synthesis not supported"));
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;

      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(
        (v) => v.lang === language || v.lang.startsWith(language.slice(0, 2)),
      );
      if (match) {
        utterance.voice = match;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        // Resolve safely on synthesis errors or cancellations to prevent crashing caller flows
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

function createSilentWavUrl() {
  const data = new ArrayBuffer(46);
  const view = new DataView(data);
  const marker = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  marker(0, "RIFF");
  view.setUint32(4, 38, true);
  marker(8, "WAVE");
  marker(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  marker(36, "data");
  view.setUint32(40, 2, true);
  view.setInt16(44, 0, true);

  return URL.createObjectURL(new Blob([data], { type: "audio/wav" }));
}

export function createVoiceApi({ fetchImpl = fetch } = {}) {
  const audioUrls = new Map();
  let silentAudioUrl = null;
  let audioUnlocked = false;
  let currentPlaybackCancel = null;
  let currentRequestController = null;
  let transcriptionController = null;
  let playbackGeneration = 0;
  let disposed = false;

  async function transcribe(audio, language) {
    const normLang = normalizeVoiceLanguage(language);
    const body = new FormData();
    body.append("audio_file", audio, "recording.wav");
    body.append("language_code", normLang);

    const controller = new AbortController();
    transcriptionController = controller;
    try {
      const response = await fetchImpl(`${API_URL}/api/voice/stt`, {
        method: "POST",
        body,
        signal: controller.signal,
      });
      const result = await response.json();

      if (controller.signal.aborted || disposed) {
        throw new DOMException("Speech request stopped", "AbortError");
      }
      if (!response.ok) {
        throw new Error(result.error || "Speech recognition is unavailable");
      }

      return typeof result.transcript === "string"
        ? result.transcript.trim()
        : "";
    } finally {
      if (transcriptionController === controller) {
        transcriptionController = null;
      }
    }
  }

  function cancelPlayback(audioElement, invalidate = true) {
    if (invalidate) {
      playbackGeneration += 1;
    }
    currentRequestController?.abort();
    currentRequestController = null;
    if (currentPlaybackCancel) {
      currentPlaybackCancel(
        new DOMException("Audio playback stopped", "AbortError"),
      );
      currentPlaybackCancel = null;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore synthesis cancel error
      }
    }

    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
  }

  function waitForPlayback(audioElement) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        audioElement.removeEventListener("ended", onEnded);
        audioElement.removeEventListener("error", onError);
        currentPlaybackCancel = null;
      };
      const finish = (callback, value) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        callback(value);
      };
      const onEnded = () => finish(resolve);
      const onError = () =>
        finish(reject, new Error("Audio playback failed"));

      audioElement.addEventListener("ended", onEnded, { once: true });
      audioElement.addEventListener("error", onError, { once: true });
      currentPlaybackCancel = (error) => finish(reject, error);

      try {
        audioElement.play().catch((error) => finish(reject, error));
      } catch (error) {
        finish(reject, error);
      }
    });
  }

  async function speak(audioElement, language, text) {
    if (disposed) {
      throw new Error("Voice player has been disposed");
    }

    const cleanText = (text || "").trim().slice(0, 300);
    if (!cleanText) return;

    const normLang = normalizeVoiceLanguage(language);

    cancelPlayback(audioElement);
    const operation = playbackGeneration;
    if (audioElement && !audioUnlocked) {
      silentAudioUrl = createSilentWavUrl();
      audioElement.src = silentAudioUrl;
      audioUnlocked = true;
      try {
        audioElement.play().catch(() => {});
      } catch {
        audioUnlocked = false;
      }
    }

    const key = JSON.stringify([normLang, cleanText]);
    let audioUrl = audioUrls.get(key);

    if (!audioUrl) {
      const controller = new AbortController();
      currentRequestController = controller;
      let response;
      try {
        response = await fetchImpl(`${API_URL}/api/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText, language: normLang }),
          signal: controller.signal,
        });
      } catch (error) {
        if (
          disposed ||
          controller.signal.aborted ||
          playbackGeneration !== operation
        ) {
          throw new DOMException("Audio playback stopped", "AbortError");
        }
        // Fallback to client browser synthesis if network/server is unreachable
        return speakWithBrowserSynthesis(cleanText, normLang);
      }

      if (disposed || controller.signal.aborted || playbackGeneration !== operation) {
        throw new DOMException("Audio playback stopped", "AbortError");
      }

      if (!response.ok) {
        // Fallback to client browser synthesis if backend TTS errors
        return speakWithBrowserSynthesis(cleanText, normLang);
      }

      const blob = await response.blob();
      if (
        disposed ||
        controller.signal.aborted ||
        playbackGeneration !== operation
      ) {
        throw new DOMException("Voice player has been disposed", "AbortError");
      }
      if (currentRequestController === controller) {
        currentRequestController = null;
      }

      audioUrl = URL.createObjectURL(
        new Blob([blob], { type: "audio/wav" }),
      );
      audioUrls.set(key, audioUrl);
    }

    if (disposed || playbackGeneration !== operation) {
      throw new DOMException("Audio playback stopped", "AbortError");
    }

    if (audioElement) {
      try {
        audioElement.pause();
        audioElement.src = audioUrl;
        audioElement.currentTime = 0;
        await waitForPlayback(audioElement);
      } catch (err) {
        if (err.name === "AbortError" || err.name === "NotAllowedError") throw err;
        // If HTML5 audio playback fails (other error), fallback to browser speech synthesis
        await speakWithBrowserSynthesis(cleanText, normLang);
      }
    } else {
      await speakWithBrowserSynthesis(cleanText, normLang);
    }
  }

  async function preload(language, text) {
    if (disposed) return;
    const cleanText = (text || "").trim().slice(0, 300);
    if (!cleanText) return;
    const normLang = normalizeVoiceLanguage(language);
    const key = JSON.stringify([normLang, cleanText]);
    if (audioUrls.has(key)) return;

    try {
      const response = await fetchImpl(`${API_URL}/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, language: normLang }),
      });
      if (response.ok && !disposed) {
        const blob = await response.blob();
        audioUrls.set(key, URL.createObjectURL(new Blob([blob], { type: "audio/wav" })));
      }
    } catch {
      // Ignore background preload errors
    }
  }

  function stop(audioElement) {
    cancelPlayback(audioElement);
  }

  function dispose(audioElement) {
    disposed = true;
    cancelPlayback(audioElement);
    transcriptionController?.abort();
    transcriptionController = null;
    audioElement?.removeAttribute("src");
    audioElement?.load();

    for (const url of audioUrls.values()) {
      URL.revokeObjectURL(url);
    }
    audioUrls.clear();

    if (silentAudioUrl) {
      URL.revokeObjectURL(silentAudioUrl);
      silentAudioUrl = null;
    }
  }

  return { transcribe, speak, preload, stop, dispose };
}
