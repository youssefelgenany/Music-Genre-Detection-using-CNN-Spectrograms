"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

const COVER =
  "from-indigo-950 via-primary to-blue-600";

/**
 * @param {Record<string, number>} percentages
 */
function topGenreBadges(percentages, scanTotal, max = 4) {
  const entries = Object.entries(percentages || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (entries.length === 0) return [];
  if (scanTotal === 0) {
    return [{ key: "blend", label: "Balanced mix", detail: "all genres" }];
  }
  return entries.slice(0, max).map(([genre, pct]) => ({
    key: genre,
    label: `${genre}`,
    detail: `${pct}%`,
  }));
}

export default function MadeForYouCard({
  songCount,
  scanTotal,
  percentages,
  loading,
}) {
  const badges = topGenreBadges(percentages || {}, scanTotal);

  return (
    <Link
      href="/library/made-for-you"
      className="group relative col-span-2 flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 border-accent/25 bg-surface-container-low shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_8px_40px_-12px_rgba(99,102,241,0.45),0_20px_50px_-24px_rgba(15,23,42,0.5)] transition duration-300 hover:border-accent/50 hover:shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_12px_48px_-10px_rgba(99,102,241,0.55),0_24px_60px_-20px_rgba(15,23,42,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:col-span-2 lg:col-span-2"
      aria-label="Open Made For You playlist"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/15 blur-3xl transition group-hover:bg-accent/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />

      <article className="relative flex min-h-0 flex-1 flex-col md:flex-row md:items-stretch">
        {/* Art: fixed aspect on mobile; on md fills full card height so it matches the text column */}
        <div className="relative aspect-[4/3] w-full shrink-0 md:aspect-auto md:w-[40%] md:max-w-[240px] md:self-stretch md:min-h-0">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${COVER}`}
            aria-hidden
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
          <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/5" />
          <div className="relative flex h-full w-full items-center justify-center">
            <Sparkles
              className="h-14 w-14 text-white/95 drop-shadow-[0_2px_12px_rgba(255,255,255,0.35)] transition duration-300 group-hover:scale-110 group-hover:rotate-6 sm:h-16 sm:w-16"
              strokeWidth={1.35}
              aria-hidden
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/95">
            Personalized
          </p>
          <h3 className="font-headline mt-1.5 text-xl font-black tracking-tight text-on-background sm:text-2xl">
            Made For You
          </h3>
          <p className="mt-1 text-sm font-medium text-on-surface-variant">
            Based on your listening
          </p>

          <div className="mt-4 flex min-h-[1.75rem] flex-wrap gap-2">
            {loading ? (
              <span className="inline-flex h-7 w-24 animate-pulse rounded-full bg-surface-container-highest/80" />
            ) : (
              badges.map((b) => (
                <span
                  key={b.key}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-outline/25 bg-surface-container-high/90 px-2.5 py-1 text-[11px] font-semibold text-on-background shadow-sm backdrop-blur-sm"
                >
                  <span>{b.label}</span>
                  {b.detail ? (
                    <span
                      className={
                        String(b.detail).includes("%")
                          ? "font-bold tabular-nums text-accent/95"
                          : "text-[10px] font-medium text-on-surface-variant"
                      }
                    >
                      {b.detail}
                    </span>
                  ) : null}
                </span>
              ))
            )}
          </div>

          <p className="mt-4 text-sm tabular-nums text-on-surface-variant">
            <span className="font-medium text-on-background">{songCount}</span>{" "}
            songs · {scanTotal} scan{scanTotal === 1 ? "" : "s"}
          </p>
          <p className="mt-3 text-xs font-semibold text-accent transition group-hover:text-blue-300">
            Open playlist →
          </p>
        </div>
      </article>
    </Link>
  );
}
