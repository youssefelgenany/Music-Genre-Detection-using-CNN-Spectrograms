const DEFAULT_API = "http://127.0.0.1:8000";

/**
 * Base URL for the FastAPI server (override with NEXT_PUBLIC_API_URL).
 */
export function getPredictBaseUrl() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  return DEFAULT_API;
}

/**
 * POST multipart form with audio file to `/predict`.
 * @param {File | Blob} file — audio (e.g. WebM from MediaRecorder, or upload); backend converts as needed.
 * @returns {Promise<object>} Parsed JSON (e.g. genre, predicted_genre, confidence)
 */
export async function postPredictAudio(file) {
  const base = getPredictBaseUrl();
  const formData = new FormData();
  formData.append("file", file, file.name || "recording.webm");

  const res = await fetch(`${base}/predict`, {
    method: "POST",
    body: formData,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || res.statusText || "Invalid response from server");
  }

  if (!res.ok) {
    const detail = data.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => (d && d.msg ? d.msg : String(d))).join(", ")
          : text || res.statusText || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

/** @deprecated Use postPredictAudio — alias for compatibility */
export const postAudioFile = postPredictAudio;

export function genreFromJson(data) {
  if (!data || typeof data !== "object") return "";
  const g = data.genre ?? data.predicted_genre;
  return g != null ? String(g) : "";
}

/**
 * Confidence in [0, 1] from API, or null if missing.
 */
export function confidenceFromJson(data) {
  if (!data || typeof data !== "object") return null;
  const c = data.confidence ?? data.confidence_score;
  if (typeof c === "number" && Number.isFinite(c)) {
    return Math.min(1, Math.max(0, c));
  }
  return null;
}

function topPredictionsFromJson(data) {
  if (!data || typeof data !== "object") return [];
  const rows = Array.isArray(data.top_predictions) ? data.top_predictions : [];
  return rows
    .map((row) => {
      const genre = row && row.genre != null ? String(row.genre) : "";
      const confidence = row?.confidence;
      if (!genre) return null;
      if (typeof confidence !== "number" || !Number.isFinite(confidence)) return null;
      return {
        genre,
        confidence: Math.min(1, Math.max(0, confidence)),
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

export function parsePredictResponse(data) {
  return {
    genre: genreFromJson(data),
    confidence: confidenceFromJson(data),
    topPredictions: topPredictionsFromJson(data),
  };
}
