import { SCANNED_GENRES } from "@/lib/libraryData";

/** URL segment for a canonical genre name, e.g. "Hip-hop" → "hip-hop" */
export function genreToSlug(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/**
 * Resolve dynamic route param to canonical genre name, or null if unknown.
 * @param {string} slug — e.g. "hip-hop", "rock"
 */
export function slugToCanonicalGenre(slug) {
  if (!slug || typeof slug !== "string") return null;
  const decoded = decodeURIComponent(slug).trim().toLowerCase();
  for (const { name } of SCANNED_GENRES) {
    if (genreToSlug(name) === decoded) return name;
  }
  return null;
}
