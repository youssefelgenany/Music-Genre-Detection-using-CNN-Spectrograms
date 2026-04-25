import { mixtapes } from "@/data/mixtapes";
import { SCANNED_GENRES } from "@/lib/libraryData";

/**
 * @typedef {{ id: string, title: string, artist: string, audioUrl: string, cover?: string }} MixtapeSong
 * @typedef {{ genre: string, cover?: string, playlistTitle: string, songs: MixtapeSong[] }} MixtapePlaylist
 */

function normalizeGenreName(name) {
  if (!name) return "";
  return String(name).trim().toLowerCase();
}

function toCanonicalGenre(name) {
  const normalized = normalizeGenreName(name);
  const row = SCANNED_GENRES.find(
    ({ name: genreName }) => normalizeGenreName(genreName) === normalized,
  );
  if (row?.name) return row.name;

  return normalized
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

/** @type {MixtapePlaylist[]} */
export const MIXTAPE_PLAYLISTS = mixtapes.map((entry) => {
  const canonicalGenre = toCanonicalGenre(entry.genre);
  return {
    genre: canonicalGenre,
    cover: entry.cover,
    playlistTitle: `${canonicalGenre} Mixtape`,
    songs: (entry.songs ?? []).map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      audioUrl: song.audio,
      cover: song.cover,
    })),
  };
});

/**
 * @param {string} canonicalGenre — e.g. "Rock"
 * @returns {MixtapePlaylist | undefined}
 */
export function getMixtapePlaylistByGenre(canonicalGenre) {
  const normalized = normalizeGenreName(canonicalGenre);
  return MIXTAPE_PLAYLISTS.find((p) => normalizeGenreName(p.genre) === normalized);
}

export function defaultCoverForGenre(canonicalGenre) {
  const row = SCANNED_GENRES.find((x) => x.name === canonicalGenre);
  return row?.cover ?? "from-slate-900 to-slate-700";
}
