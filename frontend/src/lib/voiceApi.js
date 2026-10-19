const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SAMPLE_RATE = 16000;

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
  let playbackGeneration = 0;
  let disposed = false;

  async function transcribe(audio, language) {
    const body = new FormData();
    body.append("audio_file", audio, "recording.wav");
    body.append("language_code", language);

    const response = await fetchImpl(`${API_URL}/api/voice/stt`, {
      method: "POST",
      body,
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Speech recognition is unavailable");
    }

    return typeof result.transcript === "string" ? result.transcript.trim() : "";
  }

  function cancelPlayback(audioElement, invalidate = true) {
    if (invalidate) {
      playbackGeneration += 1;
    }
    if (currentPlaybackCancel) {
      currentPlaybackCancel(
        new DOMException("Audio playback stopped", "AbortError"),
      );
      currentPlaybackCancel = null;
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

    const operation = playbackGeneration + 1;
    playbackGeneration = operation;
    cancelPlayback(audioElement, false);
    if (!audioUnlocked) {
      silentAudioUrl = createSilentWavUrl();
      audioElement.src = silentAudioUrl;
      audioUnlocked = true;
      try {
        audioElement.play().catch(() => {});
      } catch {
        audioUnlocked = false;
      }
    }

    const key = JSON.stringify([language, text]);
    let audioUrl = audioUrls.get(key);

    if (!audioUrl) {
      const response = await fetchImpl(`${API_URL}/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });

      if (!response.ok) {
        let message = "Speech playback is unavailable";
        try {
          message = (await response.json()).error || message;
        } catch {
          // Keep the generic playback message for non-JSON errors.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      if (disposed || playbackGeneration !== operation) {
        throw new DOMException("Voice player has been disposed", "AbortError");
      }

      audioUrl = URL.createObjectURL(
        new Blob([blob], { type: "audio/wav" }),
      );
      audioUrls.set(key, audioUrl);
    }

    if (disposed || playbackGeneration !== operation) {
      throw new DOMException("Audio playback stopped", "AbortError");
    }

    audioElement.pause();
    audioElement.src = audioUrl;
    audioElement.currentTime = 0;
    await waitForPlayback(audioElement);
  }

  function stop(audioElement) {
    cancelPlayback(audioElement);
  }

  function dispose(audioElement) {
    disposed = true;
    cancelPlayback(audioElement);
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

  return { transcribe, speak, stop, dispose };
}
