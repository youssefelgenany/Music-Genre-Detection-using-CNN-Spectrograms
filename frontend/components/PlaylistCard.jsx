export default function PlaylistCard({
  title,
  trackCount,
  subtitle,
  coverGradientClass,
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-outline/20 bg-surface-container-low transition hover:border-accent/35 hover:shadow-lg hover:shadow-accent/5">
      <div
        className={`relative flex aspect-square w-full items-center justify-center bg-gradient-to-br ${coverGradientClass}`}
      >
        <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/5" />
      </div>
      <div className="p-4">
        <h3 className="font-headline text-base font-bold leading-snug text-on-background">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs font-medium text-on-surface-variant">
            {subtitle}
          </p>
        ) : null}
        <p className="mt-2 text-sm tabular-nums text-on-surface-variant">
          {trackCount} {trackCount === 1 ? "track" : "tracks"}
        </p>
      </div>
    </article>
  );
}
