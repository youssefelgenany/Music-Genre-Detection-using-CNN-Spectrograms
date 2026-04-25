/**
 * Persist scanned predictions: full audio in IndexedDB; metadata index in localStorage.
 * Hydrated rows match { id, genre, timestamp, audioUrl } for UI (audioUrl from blob).
 */

const DB_NAME = "gen-scope-scanned";
const DB_VERSION = 1;
const STORE = "tracks";
const LS_META_KEY = "gen-scope-scanned-meta";

export const SCANNED_MUSIC_CHANGED = "gen-scope-scanned-music-changed";

function genreToCover(genre) {
  const slug = String(genre ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `/covers/${slug}.jpg`;
}

function dispatchChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SCANNED_MUSIC_CHANGED));
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

function readMetaIndex() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_META_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMetaIndex(entries) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_META_KEY, JSON.stringify(entries));
}

/**
 * @param {File | Blob} file
 * @param {string} genre — canonical genre folder name
 * @returns {Promise<{ id: string, genre: string, timestamp: number, audioUrl: string, cover: string }>}
 */
export async function saveScannedTrack(file, genre) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const timestamp = Date.now();
  const blob = file instanceof Blob ? file : new Blob([file]);

  const record = { id, genre, timestamp, blob };

  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(record);
  });

  const meta = readMetaIndex().filter((e) => e.id !== id);
  meta.push({ id, genre, timestamp });
  writeMetaIndex(meta);

  const audioUrl = URL.createObjectURL(blob);
  dispatchChanged();

  return { id, genre, timestamp, audioUrl, cover: genreToCover(genre) };
}

/**
 * @returns {Promise<Array<{ id: string, genre: string, timestamp: number, blob: Blob }>>}
 */
export async function getAllScannedRecords() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * @returns {Promise<Array<{ id: string, genre: string, timestamp: number, audioUrl: string, cover: string }>>}
 */
export async function getAllScannedWithUrls() {
  const rows = await getAllScannedRecords();
  return rows.map((r) => ({
    id: r.id,
    genre: r.genre,
    timestamp: r.timestamp,
    audioUrl: URL.createObjectURL(r.blob),
    cover: genreToCover(r.genre),
  }));
}

/**
 * @param {string} genre — canonical genre name
 * @returns {Promise<Array<{ id: string, genre: string, timestamp: number, audioUrl: string, cover: string }>>}
 */
export async function getScannedTracksForGenre(genre) {
  const rows = await getAllScannedWithUrls();
  return rows
    .filter((r) => r.genre === genre)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/** Group hydrated rows by genre (canonical name). */
export function groupByGenre(rows) {
  /** @type {Record<string, typeof rows>} */
  const out = {};
  for (const row of rows) {
    const g = row.genre;
    if (!out[g]) out[g] = [];
    out[g].push(row);
  }
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => b.timestamp - a.timestamp);
  }
  return out;
}

export function revokeScannedUrls(rows) {
  for (const r of rows) {
    if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
  }
}
