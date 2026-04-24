"use client";

import { useEffect, useState } from "react";

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—:—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Read duration from an object URL (metadata load).
 */
export function useAudioDuration(audioUrl) {
  const [label, setLabel] = useState("—:—");

  useEffect(() => {
    if (!audioUrl) return undefined;
    const a = new Audio();
    a.preload = "metadata";
    const onMeta = () => {
      setLabel(formatDuration(a.duration));
    };
    const onErr = () => setLabel("—:—");
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("error", onErr);
    a.src = audioUrl;
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("error", onErr);
      a.src = "";
    };
  }, [audioUrl]);

  return label;
}
