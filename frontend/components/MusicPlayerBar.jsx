"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

export default function MusicPlayerBar() {
  const {
    currentSong,
    hasQueue,
    isPlaying,
    currentTimeFormatted,
    durationFormatted,
    progress,
    togglePlayPause,
    next,
    previous,
    seekRatio,
    currentIndex,
    playlistLength,
  } = useMusicPlayer();

  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    const up = () => setIsScrubbing(false);
    window.addEventListener("pointerup", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("blur", up);
    };
  }, []);

  const onProgressChange = useCallback(
    (e) => {
      const v = Number(e.target.value);
      if (Number.isFinite(v)) seekRatio(v);
    },
    [seekRatio],
  );

  if (!hasQueue || !currentSong) {
    return null;
  }

  const canNext = currentIndex < playlistLength - 1;
  const p = Number.isFinite(progress) ? progress : 0;
  const fillTransition = isScrubbing
    ? "duration-75 ease-out"
    : isPlaying
      ? "duration-150 ease-linear"
      : "duration-200 ease-out";

  return (
    <>
      <div className="h-20 w-full max-md:h-[4.75rem] md:h-[4.5rem] shrink-0" aria-hidden />

      <div
        className="glass-card fixed left-0 right-0 z-[45] border-t border-outline/35 bg-surface/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md max-md:bottom-[4.25rem] md:bottom-0"
        role="region"
        aria-label="Now playing"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-2">
          <div className="relative py-1">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest/90 shadow-inner">
              <div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent via-sky-400 to-blue-500 shadow-[0_0_12px_-2px_rgba(59,130,246,0.55)] ${isPlaying ? "opacity-100" : "opacity-85"} ${fillTransition} transition-[width] will-change-[width]`}
                style={{ width: `${Math.max(0, Math.min(1, p)) * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={p}
              onChange={onProgressChange}
              onPointerDown={() => setIsScrubbing(true)}
              onPointerUp={() => setIsScrubbing(false)}
              className="player-progress-hitbox absolute inset-x-0 -top-2 bottom-0 z-10 h-8 w-full cursor-pointer opacity-0"
              aria-label="Seek"
            />
          </div>

          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div
                key={currentSong.id}
                className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-gradient-to-br shadow-md ring-1 ring-white/10 transition-transform duration-300 ease-out sm:h-14 sm:w-14 player-track-enter ${isPlaying ? "scale-100" : "scale-[0.98]"}`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${currentSong.coverGradientClass}`}
                  aria-hidden
                />
              </div>
              <div
                key={`meta-${currentSong.id}`}
                className="min-w-0 flex-1 player-track-enter"
              >
                <p className="truncate text-sm font-semibold text-on-background sm:text-base">
                  {currentSong.title}
                </p>
                <p className="truncate text-xs text-on-surface-variant sm:text-sm">
                  {currentSong.artist}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={previous}
                className="rounded-full p-2 text-on-background transition-transform duration-200 hover:scale-105 hover:bg-surface-container-high active:scale-95"
                aria-label="Previous track"
              >
                <SkipBack className="h-5 w-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={togglePlayPause}
                className="rounded-full bg-on-background p-2.5 text-background shadow-lg transition-transform duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" strokeWidth={0} />
                ) : (
                  <Play
                    className="h-5 w-5 translate-x-0.5 sm:h-6 sm:w-6"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                )}
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canNext}
                className="rounded-full p-2 text-on-background transition-transform duration-200 hover:scale-105 hover:bg-surface-container-high active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100"
                aria-label="Next track"
              >
                <SkipForward className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="min-w-[4.75rem] shrink-0 tabular-nums text-[11px] text-on-surface-variant sm:min-w-[5.5rem] sm:text-sm">
              <span className="text-on-background">{currentTimeFormatted}</span>
              <span className="mx-0.5 opacity-70 sm:mx-1">/</span>
              <span>{durationFormatted}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
