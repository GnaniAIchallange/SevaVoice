const SAMPLE_RATE = 16000;

function stopTracks(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function convertRecordingToWav(recording) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const OfflineAudioContextClass =
    window.OfflineAudioContext || window.webkitOfflineAudioContext;

  if (!AudioContextClass || !OfflineAudioContextClass) {
    throw new Error("Audio conversion is not supported in this browser");
  }

  const audioContext = new AudioContextClass();
  let audioBuffer;

  try {
    audioBuffer = await audioContext.decodeAudioData(
      await recording.arrayBuffer(),
    );
  } finally {
    await audioContext.close();
  }

  const frameCount = Math.ceil(audioBuffer.duration * SAMPLE_RATE);
  const offlineContext = new OfflineAudioContextClass(
    1,
    frameCount,
    SAMPLE_RATE,
  );
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  const resampled = await offlineContext.startRendering();
  const samples = resampled.getChannelData(0);
  const wav = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(wav);

  function writeText(offset, text) {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  }

  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(
      44 + index * 2,
      sample < 0 ? sample * 32768 : sample * 32767,
      true,
    );
  }

  return new Blob([wav], { type: "audio/wav" });
}

export function createVoiceRecorder({
  maxDurationMs = 25000,
  onRecordingChange = () => {},
} = {}) {
  let stream = null;
  let recorder = null;
  let timer = null;
  let cancelled = false;
  let settled = false;
  let chunks = [];
  let resolveRecording;
  let rejectRecording;

  const recording = new Promise((resolve, reject) => {
    resolveRecording = resolve;
    rejectRecording = reject;
  });
  recording.catch(() => {});

  function cleanup() {
    clearTimeout(timer);
    timer = null;
    stopTracks(stream);
    stream = null;
    onRecordingChange(false);
  }

  function rejectOnce(error) {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
    rejectRecording(error);
  }

  function stop() {
    clearTimeout(timer);
    timer = null;
    if (recorder?.state === "recording") {
      recorder.stop();
    }
  }

  function cancel() {
    cancelled = true;
    clearTimeout(timer);

    if (recorder?.state === "recording") {
      recorder.stop();
    }

    rejectOnce(new DOMException("Recording cancelled", "AbortError"));
  }

  async function start() {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error("Microphone recording is not supported in this browser");
      }

      // Microphone access requires HTTPS or localhost.
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (cancelled) {
        stopTracks(stream);
        stream = null;
        throw new DOMException("Recording cancelled", "AbortError");
      }

      recorder = new MediaRecorder(stream);
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });
      recorder.addEventListener("error", (event) => {
        rejectOnce(event.error || new Error("Microphone recording failed"));
      });
      recorder.addEventListener("stop", async () => {
        if (settled) {
          return;
        }

        try {
          const source = new Blob(chunks, {
            type: recorder.mimeType || "audio/webm",
          });
          const wav = await convertRecordingToWav(source);
          settled = true;
          cleanup();
          resolveRecording(wav);
        } catch (error) {
          rejectOnce(error);
        }
      });

      recorder.start();
      onRecordingChange(true);
      timer = setTimeout(stop, maxDurationMs);
      return recording;
    } catch (error) {
      rejectOnce(error);
      throw error;
    }
  }

  return { start, stop, cancel };
}
