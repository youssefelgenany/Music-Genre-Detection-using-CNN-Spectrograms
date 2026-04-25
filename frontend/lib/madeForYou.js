import { SCANNED_GENRES } from "@/lib/libraryData";

export const MADE_FOR_YOU_NAME = "Made For You";
export const MADE_FOR_YOU_TOTAL = 15;

const ALL_GENRES = SCANNED_GENRES.map((g) => g.name);

/** @param {number} seed */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @param {string} s */
export function seedFromString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Stable default seed from scan counts + mixtape contents so the same library
 * yields the same picks until scans or mixtapes change.
 *
 * @param {Record<string, number>} counts
 * @param {import('@/lib/mixtapePlaylists').MixtapePlaylist[]} mixtapes
 */
function deriveDefaultSeed(counts, mixtapes) {
  const countSig = ALL_GENRES.map((g) => `${g}:${counts[g] ?? 0}`).join("|");
  const mixSig = mixtapes
    .map((m) => `${m.genre}:${[...(m.songs || [])].map((s) => s.id).sort().join(",")}`)
    .sort()
    .join(";");
  return seedFromString(`mfy|v1|${countSig}|${mixSig}`);
}

/**
 * @template T
 * @param {T[]} arr
 * @param {() => number} rng
 */
function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {Array<{ genre?: string }>} records
 * @returns {Record<string, number>}
 */
export function countScansByGenre(records) {
  const counts = Object.fromEntries(ALL_GENRES.map((g) => [g, 0]));
  for (const r of records) {
    const g = r && r.genre;
    if (g && Object.prototype.hasOwnProperty.call(counts, g)) counts[g]++;
  }
  return counts;
}

/**
 * @param {Record<string, number>} counts
 * @returns {{ total: number, percentages: Record<string, number> }}
 */
export function computePercentages(counts) {
  const total = ALL_GENRES.reduce((s, g) => s + (counts[g] || 0), 0);
  const percentages = Object.fromEntries(ALL_GENRES.map((g) => [g, 0]));
  if (total === 0) {
    const p = 100 / ALL_GENRES.length;
    for (const g of ALL_GENRES) percentages[g] = Math.round(p * 10) / 10;
    return { total: 0, percentages };
  }
  for (const g of ALL_GENRES) {
    percentages[g] = Math.round(((counts[g] || 0) / total) * 1000) / 10;
  }
  return { total, percentages };
}

/**
 * Largest-remainder style integer allocation summing to `totalSlots`.
 * @param {Record<string, number>} counts
 * @param {number} totalSlots
 * @returns {Record<string, number>}
 */
export function allocateSlotsByProportion(counts, totalSlots) {
  const sum = ALL_GENRES.reduce((s, g) => s + (counts[g] || 0), 0);

  if (sum === 0) {
    const n = ALL_GENRES.length;
    const base = Math.floor(totalSlots / n);
    let rem = totalSlots % n;
    const alloc = {};
    for (let i = 0; i < n; i++) {
      alloc[ALL_GENRES[i]] = base + (rem-- > 0 ? 1 : 0);
    }
    return alloc;
  }

  const active = ALL_GENRES.filter((g) => (counts[g] || 0) > 0);
  const raw = active.map((g) => ({
    g,
    v: (counts[g] / sum) * totalSlots,
  }));
  const floors = raw.map(({ g, v }) => ({
    g,
    f: Math.floor(v),
    frac: v - Math.floor(v),
  }));
  let used = floors.reduce((s, x) => s + x.f, 0);
  let rem = totalSlots - used;
  floors.sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (rem > 0 && floors.length) {
    floors[i % floors.length].f++;
    rem--;
    i++;
  }
  const alloc = Object.fromEntries(ALL_GENRES.map((g) => [g, 0]));
  for (const { g, f } of floors) alloc[g] = f;
  return alloc;
}

/**
 * Spread `totalSlots` across genres with available pool, round-robin in name order.
 * @param {Record<string, number>} poolSizes
 * @param {number} totalSlots
 */
function allocateBalancedAmongEligible(poolSizes, totalSlots) {
  const alloc = Object.fromEntries(ALL_GENRES.map((g) => [g, 0]));
  const eligible = ALL_GENRES.filter((g) => (poolSizes[g] || 0) > 0).sort((a, b) =>
    a.localeCompare(b),
  );
  if (eligible.length === 0) return alloc;

  let remaining = totalSlots;
  while (remaining > 0) {
    let placed = false;
    for (const g of eligible) {
      if (remaining <= 0) break;
      if (alloc[g] < (poolSizes[g] || 0)) {
        alloc[g]++;
        remaining--;
        placed = true;
      }
    }
    if (!placed) break;
  }
  return alloc;
}

/**
 * Cap allocation to pool size and push surplus to genres that still have room (deterministic round-robin).
 * @param {Record<string, number>} alloc
 * @param {Record<string, number>} poolSizes
 */
function capAndRedistributeSurplus(alloc, poolSizes) {
  const out = { ...alloc };
  let surplus = 0;
  for (const g of ALL_GENRES) {
    const cap = poolSizes[g] || 0;
    const want = out[g] || 0;
    if (want > cap) {
      surplus += want - cap;
      out[g] = cap;
    }
  }
  while (surplus > 0) {
    const eligible = ALL_GENRES.filter(
      (g) => (poolSizes[g] || 0) - (out[g] || 0) > 0,
    );
    if (eligible.length === 0) break;
    let progressed = false;
    for (const g of eligible) {
      if (surplus <= 0) break;
      out[g]++;
      surplus--;
      progressed = true;
    }
    if (!progressed) break;
  }
  return out;
}

/**
 * @typedef {import('@/lib/mixtapePlaylists').MixtapePlaylist} MixtapePlaylist
 * @typedef {import('@/lib/mixtapePlaylists').MixtapeSong} MixtapeSong
 */

/**
 * Build a personalized playlist from stored scans and hardcoded mixtape pools.
 *
 * 1. Count genres in `scannedSongs`
 * 2. Normalize to percentages (for display; balanced if no scans)
 * 3. Allocate 15 slots by proportion; genres with no mixtape tracks are skipped and slots redistributed
 * 4. Randomly pick songs per genre (seeded for reproducibility)
 *
 * @param {Array<{ genre?: string }>} scannedSongs
 * @param {MixtapePlaylist[]} mixtapes
 * @param {{ seed?: number }} [options] — omit for default seed derived from scans + mixtape data
 * @returns {{
 *   name: string,
 *   songs: MixtapeSong[],
 *   allocation: Record<string, number>,
 *   percentages: Record<string, number>,
 *   scanTotal: number,
 *   seed: number,
 * }}
 */
export function generateMadeForYouPlaylist(scannedSongs, mixtapes, options = {}) {
  const counts = countScansByGenre(scannedSongs);
  const { total: scanTotal, percentages } = computePercentages(counts);

  const genreToPool = Object.fromEntries(
    ALL_GENRES.map((g) => {
      const pl = mixtapes.find((p) => p.genre === g);
      return [g, pl && Array.isArray(pl.songs) ? [...pl.songs] : []];
    }),
  );

  const poolSizes = Object.fromEntries(
    ALL_GENRES.map((g) => [g, genreToPool[g].length]),
  );

  const seedUsed =
    options.seed !== undefined && options.seed !== null
      ? Number(options.seed) >>> 0
      : deriveDefaultSeed(counts, mixtapes);

  const rng = mulberry32(seedUsed);

  /** Scan counts only count toward allocation if that genre has mixtape songs. */
  const effective = Object.fromEntries(
    ALL_GENRES.map((g) => [g, poolSizes[g] > 0 ? counts[g] || 0 : 0]),
  );
  const effSum = ALL_GENRES.reduce((s, g) => s + effective[g], 0);

  let allocation;
  if (effSum === 0) {
    allocation = allocateBalancedAmongEligible(poolSizes, MADE_FOR_YOU_TOTAL);
  } else {
    allocation = allocateSlotsByProportion(effective, MADE_FOR_YOU_TOTAL);
  }

  allocation = capAndRedistributeSurplus(allocation, poolSizes);

  const usedIds = new Set();
  const out = [];

  for (const g of ALL_GENRES) {
    const need = allocation[g] ?? 0;
    if (need <= 0) continue;
    const pool = genreToPool[g];
    shuffleInPlace(pool, rng);
    let taken = 0;
    for (const song of pool) {
      if (taken >= need) break;
      if (usedIds.has(song.id)) continue;
      usedIds.add(song.id);
      out.push(song);
      taken++;
    }
  }

  if (out.length < MADE_FOR_YOU_TOTAL) {
    const rest = shuffleInPlace(
      mixtapes.flatMap((p) => p.songs || []).filter((s) => !usedIds.has(s.id)),
      rng,
    );
    for (const song of rest) {
      if (out.length >= MADE_FOR_YOU_TOTAL) break;
      usedIds.add(song.id);
      out.push(song);
    }
  }

  return {
    name: MADE_FOR_YOU_NAME,
    songs: out.slice(0, MADE_FOR_YOU_TOTAL),
    allocation,
    percentages,
    scanTotal,
    seed: seedUsed,
  };
}
