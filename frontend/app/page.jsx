"use client";

import { useCallback, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import RecordingButton from "@/components/RecordingButton";
import UploadCard from "@/components/UploadCard";
import ResultDisplay from "@/components/ResultDisplay";
import { recordMicAsWebmFile } from "@/lib/audioRecording";
import {
  parsePredictResponse,
  postPredictAudio,
} from "@/lib/predictApi";
import { normalizeToLibraryGenreOrFallback } from "@/lib/genreNormalize";
import { saveScannedTrack } from "@/lib/scannedMusicStore";

const DEFAULT_HINT =
  "Tap to analyze the sonic landscape around you in real-time.";
const RECORD_MS = 10000;

export default function Home() {
  const [genre, setGenre] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [topPredictions, setTopPredictions] = useState([]);
  const [hintText, setHintText] = useState(DEFAULT_HINT);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const busy = isRecording || isUploading || isProcessing;

  const runPredict = useCallback(async (file) => {
    setError(null);
    setIsProcessing(true);
    setHintText("Processing...");

    try {
      const data = await postPredictAudio(file);
      const {
        genre: g,
        confidence: c,
        topPredictions: top,
      } = parsePredictResponse(data);
      setGenre(g || "—");
      setConfidence(c);
      setTopPredictions(top);
      try {
        const canonical = normalizeToLibraryGenreOrFallback(g);
        await saveScannedTrack(file, canonical);
      } catch (storeErr) {
        console.error("Failed to save scan to library:", storeErr);
      }
      return true;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      setGenre(null);
      setConfidence(null);
      setTopPredictions([]);
      setError(msg);
      setHintText(`Error: ${msg}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleMicClick = useCallback(async () => {
    if (busy) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setHintText("Recording not supported in this browser.");
      setError("Recording not supported in this browser.");
      return;
    }

    setError(null);
    setGenre(null);
    setConfidence(null);
    setTopPredictions([]);
    setHintText(DEFAULT_HINT);
    setIsRecording(true);

    try {
      const file = await recordMicAsWebmFile(RECORD_MS, setIsRecording);
      const ok = await runPredict(file);
      if (ok) {
        setHintText(DEFAULT_HINT);
      }
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      setError(msg);
      setHintText(`Error: ${msg}`);
    } finally {
      setIsRecording(false);
    }
  }, [busy, runPredict]);

  const handleFileSelected = useCallback(
    async (file) => {
      if (busy) return;
      setError(null);
      setGenre(null);
      setConfidence(null);
      setTopPredictions([]);
      setIsUploading(true);
      setIsProcessing(true);
      setHintText("Uploading...");

      try {
        const ok = await runPredict(file);
        if (ok) {
          setHintText(DEFAULT_HINT);
        }
      } finally {
        setIsUploading(false);
        setIsProcessing(false);
      }
    },
    [busy, runPredict],
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Navbar />

      <div className="flex w-full flex-1 min-h-0">
        <Sidebar />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-8 px-4 py-6 pb-28 sm:px-6 sm:py-8 md:gap-8 md:px-8 md:pb-10 lg:px-10">
          {/* Hero — centered, max width */}
          <div className="mx-auto w-full max-w-6xl">
            <ResultDisplay
              genre={genre}
              confidence={confidence}
              topPredictions={topPredictions}
              isProcessing={isProcessing}
              error={error}
            />
          </div>

          {/* Recorder + upload — 3-col grid on md+ */}
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
            <div className="md:col-span-2">
              <RecordingButton
                isRecording={isRecording}
                disabled={busy}
                onClick={handleMicClick}
                buttonLabel={isRecording ? "Recording..." : "Start Recording"}
                hintText={hintText}
              />
            </div>
            <div className="md:col-span-1">
              <UploadCard
                disabled={busy}
                isUploading={isUploading}
                isProcessing={isProcessing}
                onFileSelected={handleFileSelected}
              />
            </div>
          </div>

        </main>
      </div>

      <footer className="mt-auto w-full border-t border-outline/30 bg-surface py-8 md:py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 md:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            © 2024 Gen Scope. The Sonic Curator experience.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <a
              className="rounded-lg bg-surface-container-high px-4 py-2 text-xs font-medium uppercase tracking-wide text-on-background shadow-sm transition hover:bg-surface-container-highest hover:shadow-md"
              href="#"
            >
              Privacy
            </a>
            <a
              className="rounded-lg bg-surface-container-high px-4 py-2 text-xs font-medium uppercase tracking-wide text-on-background shadow-sm transition hover:bg-surface-container-highest hover:shadow-md"
              href="#"
            >
              Terms
            </a>
            <a
              className="rounded-lg bg-surface-container-high px-4 py-2 text-xs font-medium uppercase tracking-wide text-on-background shadow-sm transition hover:bg-surface-container-highest hover:shadow-md"
              href="#"
            >
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
