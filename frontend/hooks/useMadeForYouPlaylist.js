"use client";

import { useCallback, useEffect, useState } from "react";
import { MIXTAPE_PLAYLISTS } from "@/lib/mixtapePlaylists";
import { generateMadeForYouPlaylist } from "@/lib/madeForYou";
import {
  SCANNED_MUSIC_CHANGED,
  getAllScannedRecords,
} from "@/lib/scannedMusicStore";

/**
 * Reactive "Made For You" playlist from scan counts + mixtape pools.
 * Updates when IndexedDB scans change.
 */
export function useMadeForYouPlaylist() {
  const [state, setState] = useState(() => ({
    name: "Made For You",
    songs: [],
    allocation: /** @type {Record<string, number>} */ ({}),
    percentages: /** @type {Record<string, number>} */ ({}),
    scanTotal: 0,
    loading: true,
  }));

  const refresh = useCallback(async () => {
    try {
      const records = await getAllScannedRecords();
      const next = generateMadeForYouPlaylist(records, MIXTAPE_PLAYLISTS);
      setState({ ...next, loading: false });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(SCANNED_MUSIC_CHANGED, refresh);
    return () => window.removeEventListener(SCANNED_MUSIC_CHANGED, refresh);
  }, [refresh]);

  return state;
}
