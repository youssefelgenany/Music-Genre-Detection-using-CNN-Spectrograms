"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useAudioDuration } from "@/hooks/useAudioDuration";
import { formatScanTitle, LIBRARY_ARTIST } from "@/lib/trackFormatting";

export default function PlaylistSongRow({
  trackId,
  timestamp,
  audioUrl,
  coverImageSrc,
  coverGradientClass,
  index,
  isCurrent,
  isPlaying,
  onActivate,
  songTitle,
  songArtist,
  playbackDisabled = false,
}) {
  const duration = useAudioDuration(audioUrl);
  const [imageSrc, setImageSrc] = useState(
    typeof coverImageSrc === "string" && coverImageSrc.trim()
      ? coverImageSrc
      : "/covers/blues11.jpg",
  );
  const title =
    songTitle ??
    (timestamp != null ? formatScanTitle(timestamp) : "Untitled");
  const artist = songArtist ?? LIBRARY_ARTIST;
  const showPauseOnCover = isCurrent && isPlaying;
  const isActive = isCurrent && isPlaying;
  const hasCoverImage = Boolean(
    typeof imageSrc === "string" && imageSrc.trim().startsWith("/"),
  );

  useEffect(() => {
    setImageSrc(
      typeof coverImageSrc === "string" && coverImageSrc.trim()
        ? coverImageSrc
        : "/covers/blues11.jpg",
    );
  }, [coverImageSrc]);

  return (
    <button
      type="button"
      disabled={playbackDisabled}
      onClick={() => {
        if (playbackDisabled) return;
        onActivate(trackId);
      }}
      className={`group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border px-2 py-2.5 text-left transition-all duration-200 ease-out sm:gap-4 sm:px-3 ${
        playbackDisabled
          ? "cursor-not-allowed border-transparent opacity-50"
          : "border-transparent hover:-translate-y-px hover:border-outline/25 hover:bg-surface-container-high/85 hover:shadow-md active:translate-y-0"
      } ${
        isActive
          ? "border-accent/45 bg-accent/[0.12] shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_8px_24px_-8px_rgba(59,130,246,0.25)]"
          : isCurrent && !isPlaying
            ? "border-accent/25 bg-surface-container-high/70"
            : ""
      } ${!playbackDisabled ? "focus-visible:outline focus-visible:ring-2 focus-visible:ring-accent/50" : ""}`}
      aria-label={isActive ? `Pause ${title}` : `Play ${title}`}
      aria-pressed={isActive}
    >
      {isActive ? (
        <span
          className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl bg-gradient-to-b from-accent to-blue-500"
          aria-hidden
        />
      ) : null}

      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <span
          className={`hidden w-6 shrink-0 text-center text-sm tabular-nums transition-colors duration-200 sm:block ${
            isActive
              ? "font-semibold text-accent"
              : isCurrent
                ? "font-medium text-on-background"
                : "text-on-surface-variant"
          }`}
        >
          {index + 1}
        </span>

        <div
          className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-md shadow-inner ring-1 ring-white/10 transition-transform duration-300 ease-out sm:h-12 sm:w-12 ${
            isActive ? "ring-accent/40" : "group-hover:ring-outline/30"
          } group-hover:scale-[1.04]`}
        >
          {hasCoverImage ? (
            <Image
              src={imageSrc}
              alt={title}
              width={60}
              height={60}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                isActive ? "opacity-100" : "opacity-95 group-hover:opacity-100"
              }`}
              onError={() => setImageSrc("/covers/blues11.jpg")}
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-200 ${coverGradientClass} ${
                isActive ? "opacity-100" : "opacity-95 group-hover:opacity-100"
              }`}
              aria-hidden
            />
          )}
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            aria-hidden
          >
            {showPauseOnCover ? (
              <Pause className="h-5 w-5 text-white drop-shadow-md" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5 text-white drop-shadow-md" fill="currentColor" />
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 py-0.5">
          {isActive ? (
            <span
              className="flex h-[14px] shrink-0 items-end gap-px self-center"
              aria-hidden
            >
              <span className="player-eq-bar inline-block w-[3px] rounded-sm bg-accent" />
              <span className="player-eq-bar inline-block w-[3px] rounded-sm bg-accent" />
              <span className="player-eq-bar inline-block w-[3px] rounded-sm bg-accent" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-[15px] leading-tight transition-colors duration-200 sm:text-base ${
                isActive ? "font-bold text-accent" : "font-bold text-on-background"
              }`}
            >
              {title}
            </p>
            <p className="mt-0.5 truncate text-xs text-on-surface-variant transition-colors duration-200 sm:text-sm">
              {artist}
            </p>
          </div>
        </div>
      </div>

      <span
        className={`shrink-0 tabular-nums text-sm transition-colors duration-200 ${
          isActive ? "font-medium text-accent" : "text-on-surface-variant"
        }`}
      >
        {duration}
      </span>
    </button>
  );
}
