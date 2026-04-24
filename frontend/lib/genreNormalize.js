import { SCANNED_GENRES } from "@/lib/libraryData";

const CANONICAL = SCANNED_GENRES.map((g) => g.name);

/**
 * Map a raw model/API label to a canonical library genre folder (one of ten).
 */
export function normalizeToLibraryGenre(raw) {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, " ");
  if (!s || s === "—") return null;

  for (const name of CANONICAL) {
    const n = name.toLowerCase();
    if (s === n) return name;
    if (s === n.replace(/-/g, "")) return name;
  }

  if (s === "hip hop" || s === "hiphop" || s === "rap") return "Hip-hop";

  const alias = {
    hiphop: "Hip-hop",
    "hip-hop": "Hip-hop",
  };
  if (alias[s]) return alias[s];

  for (const name of CANONICAL) {
    const n = name.toLowerCase();
    if (n.length >= 3 && (s.includes(n) || n.includes(s))) return name;
  }

  const oneWord = s.replace(/[^a-z]/g, "");
  const gtzan = {
    blues: "Blues",
    classical: "Classical",
    country: "Country",
    disco: "Disco",
    hiphop: "Hip-hop",
    jazz: "Jazz",
    metal: "Metal",
    pop: "Pop",
    reggae: "Reggae",
    rock: "Rock",
  };
  if (gtzan[oneWord]) return gtzan[oneWord];

  return null;
}

/** When the model returns an unmapped label, file under Pop so the scan is still kept. */
export function normalizeToLibraryGenreOrFallback(raw) {
  return normalizeToLibraryGenre(raw) ?? "Pop";
}
