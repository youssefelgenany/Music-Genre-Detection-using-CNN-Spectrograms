export const LIBRARY_ARTIST = "Gen Scope Library";

export function formatScanTitle(timestamp) {
  try {
    return `Scan · ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp))}`;
  } catch {
    return "Scan";
  }
}

/**
 * @param {Array<{ id: string, audioUrl: string, timestamp: number, cover?: string }>} tracks
 * @param {string} coverGradientClass
 */
export function buildQueueFromScanned(tracks, coverGradientClass) {
  return tracks.map((t) => ({
    id: t.id,
    audioUrl: t.audioUrl,
    title: formatScanTitle(t.timestamp),
    artist: LIBRARY_ARTIST,
    cover:
      typeof t.cover === "string" && t.cover.trim().startsWith("/")
        ? t.cover
        : "/covers/default.jpg",
    coverGradientClass,
  }));
}

/**
 * @param {Array<{ id: string, title: string, artist: string, audioUrl: string, cover?: string }>} songs
 * @param {string} defaultCoverGradient
 */
export function buildQueueFromMixtapeSongs(songs, defaultCoverGradient) {
  return songs.map((s) => ({
    id: s.id,
    audioUrl: s.audioUrl,
    title: s.title,
    artist: s.artist,
    cover:
      typeof s.cover === "string" && s.cover.trim().startsWith("/")
        ? s.cover
        : "/covers/default.jpg",
    coverGradientClass:
      typeof s.cover === "string" && s.cover.trim().startsWith("from-")
        ? s.cover
        : defaultCoverGradient,
  }));
}
