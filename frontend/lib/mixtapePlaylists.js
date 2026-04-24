/**
 * Predefined mixtape playlists per genre. Replace `audioUrl` with real file URLs when ready.
 * `cover` is a Tailwind gradient fragment (e.g. from-stone-900 to-amber-800) or falls back to genre art.
 *
 * Conceptual shape (genre keys match SCANNED_GENRES names, e.g. "Rock" not "rock"):
 * [
 *   { genre: "Rock", playlistTitle: "...", songs: [{ title, artist, audioUrl, cover }] },
 * ]
 */

import { SCANNED_GENRES } from "@/lib/libraryData";

/**
 * @typedef {{ id: string, title: string, artist: string, audioUrl: string, cover?: string }} MixtapeSong
 * @typedef {{ genre: string, playlistTitle: string, songs: MixtapeSong[] }} MixtapePlaylist
 */

/** @type {MixtapePlaylist[]} */
export const MIXTAPE_PLAYLISTS = [
  {
    genre: "Blues",
    playlistTitle: "Delta Crossroads",
    songs: [
      {
        id: "mixtape-blues-1",
        title: "Midnight Slide",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-sky-950 to-blue-700",
      },
      {
        id: "mixtape-blues-2",
        title: "Smokestack Soul",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-sky-950 to-blue-700",
      },
    ],
  },
  {
    genre: "Classical",
    playlistTitle: "Hall of Echoes",
    songs: [
      {
        id: "mixtape-classical-1",
        title: "Adagio for Strings",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-violet-950 to-indigo-600",
      },
      {
        id: "mixtape-classical-2",
        title: "Nocturne in Blue",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-violet-950 to-indigo-600",
      },
    ],
  },
  {
    genre: "Country",
    playlistTitle: "Dust & Steel",
    songs: [
      {
        id: "mixtape-country-1",
        title: "Two-Lane Sunset",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-amber-950 to-orange-700",
      },
      {
        id: "mixtape-country-2",
        title: "Porchlight Serenade",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-amber-950 to-orange-700",
      },
    ],
  },
  {
    genre: "Disco",
    playlistTitle: "Mirrorball Nights",
    songs: [
      {
        id: "mixtape-disco-1",
        title: "Velvet Floor",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-fuchsia-950 to-pink-600",
      },
      {
        id: "mixtape-disco-2",
        title: "Chrome Heartbeat",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-fuchsia-950 to-pink-600",
      },
    ],
  },
  {
    genre: "Hip-hop",
    playlistTitle: "Block Party Vol. 1",
    songs: [
      {
        id: "mixtape-hiphop-1",
        title: "808 Alleys",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-zinc-900 to-neutral-600",
      },
      {
        id: "mixtape-hiphop-2",
        title: "Cipher Dawn",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-zinc-900 to-neutral-600",
      },
    ],
  },
  {
    genre: "Jazz",
    playlistTitle: "Blue Note Sessions",
    songs: [
      {
        id: "mixtape-jazz-1",
        title: "Rain on Brass",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-emerald-950 to-teal-600",
      },
      {
        id: "mixtape-jazz-2",
        title: "Afterhours Trio",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-emerald-950 to-teal-600",
      },
    ],
  },
  {
    genre: "Metal",
    playlistTitle: "Forge & Flame",
    songs: [
      {
        id: "mixtape-metal-1",
        title: "Iron Cathedral",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-slate-900 to-red-900",
      },
      {
        id: "mixtape-metal-2",
        title: "Anvil Choir",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-slate-900 to-red-900",
      },
    ],
  },
  {
    genre: "Pop",
    playlistTitle: "Chartbreakers",
    songs: [
      {
        id: "mixtape-pop-1",
        title: "Neon Chorus",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-rose-950 to-rose-600",
      },
      {
        id: "mixtape-pop-2",
        title: "Satellite Love",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-rose-950 to-rose-600",
      },
    ],
  },
  {
    genre: "Reggae",
    playlistTitle: "Island Pulse",
    songs: [
      {
        id: "mixtape-reggae-1",
        title: "Coral Tide",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-green-950 to-lime-700",
      },
      {
        id: "mixtape-reggae-2",
        title: "Dub Horizon",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-green-950 to-lime-700",
      },
    ],
  },
  {
    genre: "Rock",
    playlistTitle: "Amped Anthems",
    songs: [
      {
        id: "mixtape-rock-1",
        title: "Thunderstruck Alley",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-stone-900 to-amber-800",
      },
      {
        id: "mixtape-rock-2",
        title: "Amp Stack Sunday",
        artist: "Various Artists",
        audioUrl: "",
        cover: "from-stone-900 to-amber-800",
      },
    ],
  },
];

/**
 * @param {string} canonicalGenre — e.g. "Rock"
 * @returns {MixtapePlaylist | undefined}
 */
export function getMixtapePlaylistByGenre(canonicalGenre) {
  return MIXTAPE_PLAYLISTS.find((p) => p.genre === canonicalGenre);
}

export function defaultCoverForGenre(canonicalGenre) {
  const row = SCANNED_GENRES.find((x) => x.name === canonicalGenre);
  return row?.cover ?? "from-slate-900 to-slate-700";
}
