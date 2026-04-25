"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import PlaylistSongRow from "@/components/PlaylistSongRow";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { buildQueueFromMixtapeSongs } from "@/lib/trackFormatting";
import {
  defaultCoverForGenre,
  getMixtapePlaylistByGenre,
} from "@/lib/mixtapePlaylists";

export default function MixtapePlaylistView({ genre }) {
  const playlist = useMemo(() => getMixtapePlaylistByGenre(genre), [genre]);
  const songs = playlist?.songs ?? [];
  const defaultCover = defaultCoverForGenre(genre);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[MixtapePlaylistView] song.cover values:",
        songs.map((song) => ({ id: song.id, cover: song.cover })),
      );
    }
  }, [songs]);

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

  const handleTrackActivate = useCallback(
    (trackId) => {
      const row = songs.find((s) => s.id === trackId);
      if (!row || !String(row.audioUrl ?? "").trim()) return;

      const items = buildQueueFromMixtapeSongs(playable, defaultCover);
      const idx = playable.findIndex((s) => s.id === trackId);
      if (idx < 0) return;
      if (isTrackCurrent(trackId)) {
        togglePlayPause();
        return;
      }
      playQueue(items, idx);
    },
    [songs, playable, defaultCover, playQueue, togglePlayPause, isTrackCurrent],
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
                src={playlist?.cover || "/covers/default.jpg"}
                alt={playlist?.genre || genre}
                className="mx-auto h-[200px] w-[200px] shrink-0 rounded-2xl object-cover shadow-2xl sm:mx-0 sm:h-[240px] sm:w-[240px]"
                onError={(e) => {
                  e.currentTarget.src = "/covers/default.jpg";
                }}
              />
              <div className="min-w-0 flex-1 text-center sm:pb-2 sm:text-left">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Mixtape
                </p>
                <h1 className="font-headline text-3xl font-black tracking-tight text-on-background sm:text-4xl md:text-5xl">
                  {playlist.playlistTitle}
                </h1>
                <p className="mt-2 text-sm text-on-surface-variant">{genre}</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {songs.length} {songs.length === 1 ? "song" : "songs"}
                  {playable.length < songs.length ? (
                    <span className="ml-2 text-xs opacity-80">
                      ({playable.length} with audio — add URLs to play the rest)
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-outline/20 bg-surface-container-low/90 px-1 py-0.5 sm:px-2">
              {songs.length === 0 ? (
                <p className="py-10 text-center text-sm text-on-surface-variant">
                  No songs in this mixtape yet.
                </p>
              ) : (
                songs.map((s, i) => {
                  const cover =
                    typeof s.cover === "string" && s.cover.startsWith("from-")
                      ? s.cover
                      : defaultCover;
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
                })
              )}
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
