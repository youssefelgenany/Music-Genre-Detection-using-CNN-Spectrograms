"use client";

import Link from "next/link";
import { genreToSlug } from "@/lib/genreSlug";

export default function MixtapeCard({
  genreName,
  playlistTitle,
  trackCount,
  coverImageSrc,
  coverGradientClass,
}) {
  const href = `/library/mixtape/${genreToSlug(genreName)}`;

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-xl border border-outline/20 bg-surface-container-low transition hover:border-accent/35 hover:shadow-lg hover:shadow-accent/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <article className="flex flex-col">
        <div
          className={`relative flex aspect-square w-full shrink-0 items-center justify-center bg-gradient-to-br ${coverGradientClass}`}
        >
          <img
            src={coverImageSrc || "/covers/default.jpg"}
            alt={genreName}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "/covers/default.jpg";
            }}
          />
          <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/5" />
        </div>
        <div className="flex flex-col p-4">
          <h3 className="font-headline text-base font-bold leading-snug text-on-background">
            {playlistTitle}
          </h3>
          <p className="mt-0.5 text-xs font-medium text-on-surface-variant">
            {genreName}
          </p>
          <p className="mt-2 text-sm tabular-nums text-on-surface-variant">
            {trackCount} {trackCount === 1 ? "track" : "tracks"}
          </p>
          <p className="mt-3 text-xs font-medium text-accent">Open mixtape →</p>
        </div>
      </article>
    </Link>
  );
}
