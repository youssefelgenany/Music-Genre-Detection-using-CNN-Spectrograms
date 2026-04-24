function formatConfidence(confidence) {
  if (confidence == null || !Number.isFinite(confidence)) return null;
  const pct = Math.round(confidence * 1000) / 10;
  return `${pct}% Confidence`;
}

export default function ResultDisplay({
  genre,
  confidence,
  isProcessing = false,
  error = null,
}) {
  const trimmed = String(genre ?? "").trim();
  const display = trimmed ? trimmed.toUpperCase() : "—";

  const confidenceLabel = formatConfidence(confidence);

  return (
    <div className="relative flex min-h-[min(48vh,20rem)] w-full flex-col justify-center overflow-hidden rounded-2xl border border-outline/25 bg-surface-container-low p-8 text-center sm:min-h-[min(44vh,24rem)] md:min-h-[min(46vh,28rem)] md:p-10 lg:rounded-3xl lg:p-12">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl sm:h-72 sm:w-72 md:right-0 md:top-0 md:h-80 md:w-80" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-secondary/40 blur-3xl md:-bottom-28 md:left-0" />
      <div className="relative z-10 mx-auto w-full max-w-4xl">
        {error ? (
          <div
            className="mb-6 rounded-xl border border-red-500/35 bg-red-950/40 px-5 py-4 text-left text-sm font-medium text-red-200 md:mb-8 md:text-base"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <span className="mb-4 block text-xs font-bold uppercase tracking-[0.2em] text-accent sm:mb-5 sm:text-sm">
          Last Detected Genre
        </span>
        <h1
          className={`mb-8 break-words font-headline text-5xl font-black leading-[0.92] tracking-tighter text-on-surface sm:mb-10 sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl ${
            isProcessing ? "animate-pulse opacity-80" : ""
          }`}
        >
          {isProcessing ? "Processing…" : display}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          <span className="rounded-full bg-gradient-to-r from-primary to-primary-container px-6 py-2.5 text-sm font-bold text-on-primary shadow-md md:text-base">
            {isProcessing ? "…" : confidenceLabel ?? "—"}
          </span>
          <span className="rounded-full bg-surface-container-highest px-6 py-2.5 text-sm font-bold text-on-surface-variant md:text-base">
            124 BPM
          </span>
          <span className="rounded-full bg-surface-container-highest px-6 py-2.5 text-sm font-bold text-on-surface-variant md:text-base">
            Key: G# Minor
          </span>
        </div>
      </div>
    </div>
  );
}
