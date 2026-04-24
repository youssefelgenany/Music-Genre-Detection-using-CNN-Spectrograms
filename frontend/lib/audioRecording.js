/**
 * Prefer WebM/Opus for microphone capture; backend converts with ffmpeg.
 */
function pickWebmMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return "";
  }
  const preferred = ["audio/webm;codecs=opus", "audio/webm"];
  for (const t of preferred) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function filenameForRecordedBlob(mimeType) {
  const t = (mimeType || "").toLowerCase();
  if (t.includes("webm")) return "recording.webm";
  if (t.includes("ogg")) return "recording.ogg";
  if (t.includes("mp4") || t.includes("aac") || t.includes("mpeg")) {
    return "recording.m4a";
  }
  return "recording.webm";
}

/**
 * Records from the microphone for `durationMs` using MediaRecorder (WebM when supported).
 * Does not encode WAV in the browser — upload as-is for server-side conversion.
 *
 * @param {(recording: boolean) => void} [onRecordingChange] — true after stream is acquired, false when capture ends.
 * @returns {Promise<File>}
 */
export async function recordMicAsWebmFile(durationMs, onRecordingChange) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  onRecordingChange?.(true);

  const mimeType = pickWebmMimeType();
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined
  );
  const chunks = [];

  recorder.addEventListener("dataavailable", (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  });

  try {
    const file = await new Promise((resolve, reject) => {
      recorder.addEventListener("error", (ev) => {
        reject(ev.error || new Error("MediaRecorder error"));
      });

      recorder.addEventListener("stop", () => {
        try {
          const type =
            recorder.mimeType || mimeType || "audio/webm";
          const blob = new Blob(chunks, { type });
          if (!blob.size) {
            reject(new Error("Empty recording"));
            return;
          }
          const name = filenameForRecordedBlob(type);
          resolve(new File([blob], name, { type: blob.type || type }));
        } catch (err) {
          reject(err);
        }
      });

      recorder.start(250);

      setTimeout(() => {
        if (recorder.state === "recording") {
          if (typeof recorder.requestData === "function") {
            recorder.requestData();
          }
          recorder.stop();
        } else {
          reject(new Error("Recorder was not recording"));
        }
      }, durationMs);
    });

    return file;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    onRecordingChange?.(false);
  }
}
