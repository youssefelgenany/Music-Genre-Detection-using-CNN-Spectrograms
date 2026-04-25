"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * @typedef {{ id: string, audioUrl: string, title: string, artist: string, cover?: string, coverGradientClass: string }} PlayerTrack
 *
 * @typedef {{
 *   currentSong: PlayerTrack | null,
 *   playlist: PlayerTrack[],
 *   isPlaying: boolean,
 *   progress: number,
 *   currentTime: number,
 *   duration: number,
 *   currentIndex: number,
 *   playQueue: (items: PlayerTrack[], startIndex?: number) => void,
 *   togglePlayPause: () => void,
 *   next: () => void,
 *   previous: () => void,
 *   seek: (seconds: number) => void,
 *   seekRatio: (ratio: number) => void,
 *   isTrackCurrent: (id: string) => boolean,
 * }} MusicPlayerState
 */

const MusicPlayerContext = createContext(
  /** @type {MusicPlayerState & { audioRef: React.RefObject<HTMLAudioElement | null> } & Record<string, unknown> | null} */ (
    null
  ),
);

function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MusicPlayerProvider({ children }) {
  const audioRef = useRef(/** @type {HTMLAudioElement | null} */ (null));
  const queueRef = useRef(/** @type {PlayerTrack[]} */ ([]));
  const [playlist, setPlaylist] = useState(/** @type {PlayerTrack[]} */ ([]));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSong, setCurrentSong] = useState(
    /** @type {PlayerTrack | null} */ (null),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const rafRef = useRef(0);
  const hasQueue = playlist.length > 0;
  const progress = duration > 0 ? currentTime / duration : 0;

  useEffect(() => {
    queueRef.current = playlist;
  }, [playlist]);

  const tick = useCallback(() => {
    const el = audioRef.current;
    if (!el || el.paused) return;
    setCurrentTime(el.currentTime);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  /** Keep current song in sync with queue index. */
  useEffect(() => {
    const track = playlist[currentIndex];
    setCurrentSong(track ?? null);
  }, [playlist, currentIndex]);

  /** Keep one managed Audio() instance alive and aligned with current song. */
  useEffect(() => {
    const src = String(currentSong?.audioUrl ?? "").trim();
    if (!src) return;
    const prev = audioRef.current;
    if (prev?.src === src) return;

    // Stop previous stream before switching songs.
    if (prev) {
      prev.pause();
      prev.currentTime = 0;
    }

    const nextAudio = new Audio(src);
    nextAudio.preload = "metadata";
    audioRef.current = nextAudio;
    setCurrentTime(0);
    setDuration(0);
  }, [currentSong?.id, currentSong?.audioUrl]);

  /** Play/pause only controls the existing audio instance (resume safe). */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) el.play().catch(() => {});
    else el.pause();
  }, [isPlaying, currentSong?.id]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;

    const onPlay = () => {
      setIsPlaying(true);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setIsPlaying(false);
      cancelAnimationFrame(rafRef.current);
      setCurrentTime(el.currentTime);
    };
    const onLoadedMeta = () => {
      const d = el.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    };
    const onDurationChange = onLoadedMeta;
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      cancelAnimationFrame(rafRef.current);
      setCurrentIndex((i) => {
        const q = queueRef.current;
        if (i < q.length - 1) {
          const ni = i + 1;
          setCurrentSong(q[ni] ?? null);
          return ni;
        }
        return i;
      });
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("loadedmetadata", onLoadedMeta);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);

    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("loadedmetadata", onLoadedMeta);
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
    };
  }, [tick, currentSong?.id, currentSong?.audioUrl]);

  const playQueue = useCallback((items, startIndex = 0) => {
    if (!items?.length) return;
    const i = Math.min(Math.max(0, startIndex), items.length - 1);
    const next = [...items];
    queueRef.current = next;
    setPlaylist(next);
    setCurrentIndex(i);
    setCurrentSong(next[i] ?? null);
    setIsPlaying(true);
  }, []);

  const togglePlayPause = useCallback(() => {
    const el = audioRef.current;
    if (!el || !queueRef.current.length) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => {
      const q = queueRef.current;
      const ni = Math.min(i + 1, q.length - 1);
      if (ni === i) return i;
      setCurrentSong(q[ni] ?? null);
      setIsPlaying(true);
      return ni;
    });
  }, []);

  const goPrevious = useCallback(() => {
    setCurrentIndex((i) => {
      const q = queueRef.current;
      const el = audioRef.current;
      if (el && el.currentTime > 3) {
        el.currentTime = 0;
        setCurrentTime(0);
        return i;
      }
      const ni = Math.max(i - 1, 0);
      if (ni === i) {
        if (el) el.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(true);
        return i;
      }
      setCurrentSong(q[ni] ?? null);
      setIsPlaying(true);
      return ni;
    });
  }, []);

  const seek = useCallback((seconds) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(seconds)) return;
    const d = el.duration;
    const next = Number.isFinite(d)
      ? Math.min(Math.max(0, seconds), d)
      : Math.max(0, seconds);
    el.currentTime = next;
    setCurrentTime(next);
  }, []);

  const seekRatio = useCallback(
    (ratio) => {
      const el = audioRef.current;
      if (!el) return;
      const d = el.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      seek(ratio * d);
    },
    [seek],
  );

  const isTrackCurrent = useCallback(
    (id) => currentSong?.id === id,
    [currentSong?.id],
  );

  const value = useMemo(
    () => ({
      audioRef,
      /** Active track (same as `current` for backward compatibility). */
      currentSong,
      /** @deprecated Use currentSong */
      current: currentSong,
      playlist,
      playlistLength: playlist.length,
      currentIndex,
      isPlaying,
      hasQueue,
      progress,
      currentTime,
      duration,
      currentTimeFormatted: formatClock(currentTime),
      durationFormatted: formatClock(duration),
      playQueue,
      togglePlayPause,
      next: goNext,
      previous: goPrevious,
      seek,
      seekRatio,
      isTrackCurrent,
      /** Queue length (alias). */
      queueLength: playlist.length,
    }),
    [
      currentSong,
      playlist,
      currentIndex,
      isPlaying,
      hasQueue,
      progress,
      currentTime,
      duration,
      playQueue,
      togglePlayPause,
      goNext,
      goPrevious,
      seek,
      seekRatio,
      isTrackCurrent,
    ],
  );

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
  }
  return ctx;
}

/**
 * Subset of global audio state: current song, play/pause, normalized progress [0,1], and playlist.
 */
export function useMusicPlayerState() {
  const {
    currentSong,
    isPlaying,
    progress,
    playlist,
  } = useMusicPlayer();
  return { currentSong, isPlaying, progress, playlist };
}

export function formatPlayerClock(seconds) {
  return formatClock(seconds);
}
