"use client";

import Link from "next/link";
import { Music2 } from "lucide-react";
import { genreToSlug } from "@/lib/genreSlug";

export default function GenreScanCard({
  title,
  coverGradientClass,
  tracks = [],
}) {
  const count = tracks.length;
  const href = `/library/${genreToSlug(title)}`;

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-xl border border-outline/20 bg-surface-container-low transition hover:border-accent/35 hover:shadow-lg hover:shadow-accent/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <article className="flex flex-col">
        <div
          className={`relative flex aspect-square w-full shrink-0 items-center justify-center bg-gradient-to-br ${coverGradientClass}`}
        >
          <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/5" />
          <Music2
            className="relative h-12 w-12 text-white/35 transition group-hover:scale-105 group-hover:text-white/50 sm:h-14 sm:w-14"
            strokeWidth={1.25}
            aria-hidden
          />
        </div>
        <div className="flex flex-col p-4">
          <h3 className="font-headline text-base font-bold leading-snug text-on-background">
            {title}
          </h3>
          <p className="mt-2 text-sm tabular-nums text-on-surface-variant">
            {count} {count === 1 ? "track" : "tracks"}
          </p>
          <p className="mt-3 text-xs font-medium text-accent">
            Open playlist →
          </p>
        </div>
      </article>
    </Link>
  );
}
