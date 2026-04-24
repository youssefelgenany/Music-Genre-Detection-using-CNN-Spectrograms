"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import PlaylistSongRow from "@/components/PlaylistSongRow";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { buildQueueFromScanned } from "@/lib/trackFormatting";
import {
  SCANNED_MUSIC_CHANGED,
  getScannedTracksForGenre,
  revokeScannedUrls,
} from "@/lib/scannedMusicStore";
import { SCANNED_GENRES } from "@/lib/libraryData";

export default function GenrePlaylistView({ genre }) {
  const cover =
    SCANNED_GENRES.find((g) => g.name === genre)?.cover ??
    "from-slate-900 to-slate-700";

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const rowsRef = useRef([]);

  const {
    playQueue,
    togglePlayPause,
    isTrackCurrent,
    isPlaying,
  } = useMusicPlayer();

  const handleTrackActivate = useCallback(
    (trackId) => {
      const items = buildQueueFromScanned(tracks, cover);
      const idx = tracks.findIndex((t) => t.id === trackId);
      if (idx < 0) return;
      if (isTrackCurrent(trackId)) {
        togglePlayPause();
        return;
      }
      playQueue(items, idx);
    },
    [tracks, cover, playQueue, togglePlayPause, isTrackCurrent],
  );

  const load = useCallback(async () => {
    const prev = rowsRef.current;
    const next = await getScannedTracksForGenre(genre);
    revokeScannedUrls(prev);
    rowsRef.current = next;
    setTracks(next);
    setLoading(false);
  }, [genre]);

  useEffect(() => {
    setLoading(true);
    load();
    const onStore = () => {
      setLoading(true);
      load();
    };
    window.addEventListener(SCANNED_MUSIC_CHANGED, onStore);
    return () => {
      window.removeEventListener(SCANNED_MUSIC_CHANGED, onStore);
      revokeScannedUrls(rowsRef.current);
    };
  }, [load]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Navbar />

      <div className="flex min-h-0 w-full flex-1">
        <Sidebar />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-6 pb-28 sm:px-6 sm:py-8 md:px-8 md:pb-10 lg:px-10">
          <div className="mx-auto w-full max-w-3xl">
            <Link
              href="/library"
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-accent transition hover:text-blue-300"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Your Library
            </Link>

            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8">
              <div
                className={`mx-auto h-40 w-40 shrink-0 rounded-lg bg-gradient-to-br shadow-2xl sm:mx-0 sm:h-48 sm:w-48 ${cover}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1 text-center sm:pb-2 sm:text-left">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Playlist
                </p>
                <h1 className="font-headline text-3xl font-black tracking-tight text-on-background sm:text-4xl md:text-5xl">
                  {genre}
                </h1>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {loading
                    ? "Loading…"
                    : `${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-outline/20 bg-surface-container-low/90 px-1 py-0.5 sm:px-2">
              {loading ? (
                <p className="py-10 text-center text-sm text-on-surface-variant">
                  Loading playlist…
                </p>
              ) : null}
              {!loading && tracks.length === 0 ? (
                <p className="py-10 text-center text-sm text-on-surface-variant">
                  No scans in this playlist yet. Analyze a track on the home page
                  to add it here.
                </p>
              ) : null}
              {!loading && tracks.length > 0
                ? tracks.map((t, i) => (
                    <PlaylistSongRow
                      key={t.id}
                      trackId={t.id}
                      index={i}
                      timestamp={t.timestamp}
                      audioUrl={t.audioUrl}
                      coverGradientClass={cover}
                      isCurrent={isTrackCurrent(t.id)}
                      isPlaying={isTrackCurrent(t.id) && isPlaying}
                      onActivate={handleTrackActivate}
                    />
                  ))
                : null}
            </div>
          </div>
        </main>
      </div>

      <footer className="mt-auto w-full border-t border-outline/30 bg-surface py-8 md:py-10">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6 md:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            © 2024 Gen Scope. The Sonic Curator experience.
          </p>
        </div>
      </footer>
    </div>
  );
}
