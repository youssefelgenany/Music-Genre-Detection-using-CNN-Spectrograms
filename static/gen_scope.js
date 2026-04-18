(function () {
  "use strict";

  const micBtn = document.querySelector("button.relative.z-20");
  const heroH1 = document.querySelector(
    "section.flex-grow > div.relative.overflow-hidden h1"
  );
  const hintP = document.querySelector("div.md\\:col-span-2 > p.mt-8");
  const browseBtn = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent.trim() === "Browse Files"
  );
  const uploadPanel = document.querySelector(
    "div.grid.grid-cols-1.md\\:grid-cols-3.gap-6 > div:last-child"
  );

  if (!micBtn || !heroH1 || !hintP) {
    return;
  }

  const defaultHint = hintP.textContent.trim();

  let busy = false;

  function genreFromJson(data) {
    if (!data || typeof data !== "object") return "";
    return data.genre || data.predicted_genre || "";
  }

  async function postAudioFile(file) {
    const formData = new FormData();
    // Debug: verify what will be sent to FastAPI UploadFile
    console.log("[predict] blob size:", file.size);
    console.log("[predict] blob type:", file.type || "unknown");

    formData.append("file", file, file.name || "recording.wav");
    const res = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      body: formData,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text || res.statusText);
    }
    if (!res.ok) {
      const detail = data.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg || d).join(", ")
            : text || res.statusText;
      throw new Error(msg);
    }
    return data;
  }

  function setGenreDisplay(g) {
    const s = String(g || "").trim();
    heroH1.textContent = s ? s.toUpperCase() : "—";
  }

  function float32MonoToWavBlob(samples, sampleRate) {
    const channels = 1;
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const dataSize = samples.length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i += 1) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i += 1) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  function mergeFloat32Chunks(chunks) {
    const total = chunks.reduce((acc, ch) => acc + ch.length, 0);
    const out = new Float32Array(total);
    let offset = 0;
    for (const ch of chunks) {
      out.set(ch, offset);
      offset += ch.length;
    }
    return out;
  }

  async function recordMicAsWavFile(durationMs) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    const chunks = [];

    processor.onaudioprocess = (e) => {
      chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);

    try {
      await new Promise((resolve) => setTimeout(resolve, durationMs));
      const merged = mergeFloat32Chunks(chunks);
      const wavBlob = float32MonoToWavBlob(merged, audioCtx.sampleRate);
      return new File([wavBlob], "recording.wav", { type: "audio/wav" });
    } finally {
      source.disconnect();
      processor.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      await audioCtx.close();
    }
  }

  micBtn.addEventListener("click", async () => {
    if (busy) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      hintP.textContent = "Recording not supported in this browser.";
      return;
    }

    busy = true;
    hintP.textContent = "Recording...";

    try {
      const file = await recordMicAsWavFile(10000);
      hintP.textContent = "Analyzing...";
      console.log("[recording] wav blob size:", file.size);
      console.log("[recording] wav blob type:", file.type || "unknown");
      const data = await postAudioFile(file);
      setGenreDisplay(genreFromJson(data));
    } catch (err) {
      hintP.textContent =
        "Error: " + (err && err.message ? err.message : String(err));
      busy = false;
      return;
    }
    hintP.textContent = defaultHint;
    busy = false;
  });

  if (browseBtn) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac";
    input.style.position = "absolute";
    input.style.width = "0";
    input.style.height = "0";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    browseBtn.parentElement.appendChild(input);

    browseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (busy) return;
      input.click();
    });

    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      input.value = "";
      if (!file || busy) return;
      busy = true;
      hintP.textContent = "Analyzing...";
      try {
        const data = await postAudioFile(file);
        setGenreDisplay(genreFromJson(data));
      } catch (err) {
        hintP.textContent =
          "Error: " + (err && err.message ? err.message : String(err));
        busy = false;
        return;
      }
      hintP.textContent = defaultHint;
      busy = false;
    });
  }

  if (uploadPanel) {
    ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => {
      uploadPanel.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    uploadPanel.addEventListener("drop", async (e) => {
      if (busy) return;
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      busy = true;
      hintP.textContent = "Analyzing...";
      try {
        const data = await postAudioFile(file);
        setGenreDisplay(genreFromJson(data));
      } catch (err) {
        hintP.textContent =
          "Error: " + (err && err.message ? err.message : String(err));
        busy = false;
        return;
      }
      hintP.textContent = defaultHint;
      busy = false;
    });
  }
})();
