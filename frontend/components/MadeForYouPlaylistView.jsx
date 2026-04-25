"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import PlaylistSongRow from "@/components/PlaylistSongRow";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { buildQueueFromMixtapeSongs } from "@/lib/trackFormatting";
import { useMadeForYouPlaylist } from "@/hooks/useMadeForYouPlaylist";
import { MADE_FOR_YOU_TOTAL } from "@/lib/madeForYou";

const HERO_COVER =
  "from-indigo-950 via-primary to-blue-600";
const MADE_FOR_YOU_COVER = "/covers/made.jpg";

export default function MadeForYouPlaylistView() {
  const {
    name,
    songs,
    percentages,
    allocation,
    scanTotal,
    loading,
  } = useMadeForYouPlaylist();

  const playable = useMemo(
    () => songs.filter((s) => String(s.audioUrl ?? "").trim()),
    [songs],
  );

  const {
    playQueue,
    togglePlayPause,
    isTrackCurrent,
    isPlaying,
  } = useMusicPlayer();

  const summaryLine = useMemo(() => {
    if (scanTotal === 0) {
      return "Even blend across genres — add scans to personalize.";
    }
    const entries = Object.entries(percentages)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    return entries.map(([g, p]) => `${g} ${p}%`).join(" · ");
  }, [percentages, scanTotal]);

  const handleTrackActivate = useCallback(
    (trackId) => {
      const row = songs.find((s) => s.id === trackId);
      if (!row || !String(row.audioUrl ?? "").trim()) return;

      const items = buildQueueFromMixtapeSongs(playable, HERO_COVER);
      const idx = playable.findIndex((s) => s.id === trackId);
      if (idx < 0) return;
      if (isTrackCurrent(trackId)) {
        togglePlayPause();
        return;
      }
      playQueue(items, idx);
    },
    [songs, playable, playQueue, togglePlayPause, isTrackCurrent],
  );

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
              <img
                src={MADE_FOR_YOU_COVER}
                alt={name}
                className="mx-auto h-[200px] w-[200px] shrink-0 rounded-2xl object-cover shadow-2xl sm:mx-0 sm:h-[240px] sm:w-[240px]"
                onError={(e) => {
                  e.currentTarget.src = "/covers/default.jpg";
                }}
              />
              <div className="min-w-0 flex-1 text-center sm:pb-2 sm:text-left">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Personalized
                </p>
                <h1 className="font-headline text-3xl font-black tracking-tight text-on-background sm:text-4xl md:text-5xl">
                  {name}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {loading ? "Building playlist…" : summaryLine}
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {songs.length} / {MADE_FOR_YOU_TOTAL} songs · {scanTotal} scan
                  {scanTotal === 1 ? "" : "s"} in library
                </p>
                {!loading && scanTotal > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-on-surface-variant">
                    {Object.entries(allocation)
                      .filter(([, n]) => n > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([g, n]) => (
                        <span
                          key={g}
                          className="rounded-full bg-surface-container-high px-2 py-0.5 font-medium tabular-nums"
                        >
                          {g}: {n} song{n === 1 ? "" : "s"}
                        </span>
                      ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-outline/20 bg-surface-container-low/90 px-1 py-0.5 sm:px-2">
              {loading ? (
                <p className="py-10 text-center text-sm text-on-surface-variant">
                  Loading playlist…
                </p>
              ) : null}
              {!loading && songs.length === 0 ? (
                <p className="py-10 text-center text-sm text-on-surface-variant">
                  No mixtape songs available. Add titles in mixtape data.
                </p>
              ) : null}
              {!loading &&
                songs.map((s, i) => {
                  const cover =
                    typeof s.cover === "string" && s.cover.startsWith("from-")
                      ? s.cover
                      : HERO_COVER;
                  const hasAudio = Boolean(String(s.audioUrl ?? "").trim());
                  return (
                    <PlaylistSongRow
                      key={s.id}
                      trackId={s.id}
                      index={i}
                      audioUrl={s.audioUrl}
                      coverImageSrc={s.cover}
                      coverGradientClass={cover}
                      songTitle={s.title}
                      songArtist={s.artist}
                      playbackDisabled={!hasAudio}
                      isCurrent={isTrackCurrent(s.id)}
                      isPlaying={isTrackCurrent(s.id) && isPlaying}
                      onActivate={handleTrackActivate}
                    />
                  );
                })}
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
