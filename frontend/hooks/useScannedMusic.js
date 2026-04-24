"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SCANNED_MUSIC_CHANGED,
  getAllScannedWithUrls,
  groupByGenre,
  revokeScannedUrls,
} from "@/lib/scannedMusicStore";

export function useScannedMusic() {
  const [byGenre, setByGenre] = useState(
    /** @type {Record<string, Array<{ id: string, genre: string, timestamp: number, audioUrl: string }>>} */ (
      {}
    ),
  );
  const [loading, setLoading] = useState(true);
  const rowsRef = useRef([]);

  const load = useCallback(async () => {
    try {
      revokeScannedUrls(rowsRef.current);
      const rows = await getAllScannedWithUrls();
      rowsRef.current = rows;
      setByGenre(groupByGenre(rows));
    } catch (e) {
      console.error("Failed to load scanned library:", e);
      rowsRef.current = [];
      setByGenre({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handler = () => {
      setLoading(true);
      load();
    };
    window.addEventListener(SCANNED_MUSIC_CHANGED, handler);
    return () => {
      window.removeEventListener(SCANNED_MUSIC_CHANGED, handler);
      revokeScannedUrls(rowsRef.current);
    };
  }, [load]);

  return { byGenre, loading, refresh: load };
}
