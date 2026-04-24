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
  const [genre, setGenre] = useState("NEO-SYNTHWAVE");
  const [confidence, setConfidence] = useState(null);
  const [hintText, setHintText] = useState(DEFAULT_HINT);
  const [busy, setBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const runPredict = useCallback(async (file) => {
    setError(null);
    setIsProcessing(true);
    setHintText("Processing...");

    try {
      const data = await postPredictAudio(file);
      const { genre: g, confidence: c } = parsePredictResponse(data);
      setGenre(g || "—");
      setConfidence(c);
      try {
        const canonical = normalizeToLibraryGenreOrFallback(g);
        await saveScannedTrack(file, canonical);
      } catch (storeErr) {
        console.error("Failed to save scan to library:", storeErr);
      }
      return true;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
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

    setBusy(true);
    setError(null);
    setHintText(DEFAULT_HINT);

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
      setBusy(false);
    }
  }, [busy, runPredict]);

  const handleFileSelected = useCallback(
    async (file) => {
      if (busy) return;
      setBusy(true);
      setError(null);

      const ok = await runPredict(file);
      if (ok) {
        setHintText(DEFAULT_HINT);
      }
      setBusy(false);
    },
    [busy, runPredict]
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
              <UploadCard disabled={busy} onFileSelected={handleFileSelected} />
            </div>
          </div>

          {/* Discovery */}
          <div className="mx-auto w-full max-w-6xl">
            <h3 className="mb-6 font-headline text-2xl font-black text-on-background md:mb-8 md:text-3xl lg:text-4xl">
              Discovery Stream
            </h3>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="group rounded-xl border border-outline/20 bg-surface-container-low p-8 transition-all hover:border-accent/25 hover:bg-surface-container-high/80">
                <div className="mb-4 aspect-square w-full overflow-hidden rounded-lg">
                  <img
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    alt=""
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiCjhPpIZ-bQbC7M9gwz3qOfPDZ9dbRpzkDE33UxVnhlCqlAacicJfB_qq50Azv0pM35uTLbbJJL-wc2t6PwCItqJKeClhHYEBiGafXHV6QMW69MXelSaHvdaw-YDxuQclQqCCPNnsVONVCGVX47GzRVMnfIa7r-P0NO8DSlUjKeKEDfTMXqlypPtXi5NFQv79xfKVNmLvpKjeEMps3k1gHu8JPG3xrA0-bRoYoVIkaJiramZ7kTmEol5H1f8I_BwQZNp5iLlR7rw"
                  />
                </div>
                <h4 className="font-headline text-lg font-bold text-on-background">
                  Cyber-Jazz Fusion
                </h4>
                <p className="mb-4 text-sm text-on-surface-variant">
                  Detected 2 hours ago • Urban Cafe
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-bold text-on-secondary">
                    Experimental
                  </span>
                  <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-bold text-on-secondary">
                    High-Energy
                  </span>
                </div>
              </div>
              <div className="group rounded-xl border border-outline/20 bg-surface-container-low p-8 transition-all hover:border-accent/25 hover:bg-surface-container-high/80">
                <div className="mb-4 aspect-square w-full overflow-hidden rounded-lg">
                  <img
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    alt=""
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCip891YpBZDNdzO9_dTvyliN1m4-WjJ7b_9Xs-nuUauTMA99HcxOXYo4l-Guvz7Ckw9-dsXOEwJlbcUmh1h__L2z29jOHK9r4AnVBOl3gGEwnNnZGy9tZsSEXu5ZnhMNv9dhJVNdxQgzIPbu-d8aHxxXudRGQUDMccDH4UZalepJ0LJjB-hsHXKCoNgszbyAsavWaBFRbWf_udcjlp8GbTrAvjZjwN1dF6bMifkLiK6lxCvQ_Hr8daqLabAwmAsq7vxFZBIHUCYw"
                  />
                </div>
                <h4 className="font-headline text-lg font-bold text-on-background">
                  Industrial Techno
                </h4>
                <p className="mb-4 text-sm text-on-surface-variant">
                  Detected 5 hours ago • Studio B
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-bold text-on-secondary">
                    Electronic
                  </span>
                  <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-bold text-on-secondary">
                    Aggressive
                  </span>
                </div>
              </div>
              <div className="group rounded-xl border border-outline/20 bg-surface-container-low p-8 transition-all hover:border-accent/25 hover:bg-surface-container-high/80">
                <div className="mb-4 aspect-square w-full overflow-hidden rounded-lg">
                  <img
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    alt=""
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8iDDDLhMXNKn7nWA2Pp5-9U5qmjXQ0m7km_zlWphKUmkeZ869EtYZIEUcSlfYwQH6HEv3AGBClaKOsuO4CcYUvVEo4OyAJqxhBzcYmwUMivPgSI29tl_RSDX-zQdJVrAnPH8TmM8UDHsWcakwvLIfZaLO4yIwWC0TnUpXLAr54WBBYGqwOaaTMonlLDF5OVzKWSkCoq6ToEK87GWP2vKG2NQibkWDmR4RQpEvtlqFwp2NjGR1rwrroTmBK-E3lbbrT46j_YozI0k"
                  />
                </div>
                <h4 className="font-headline text-lg font-bold text-on-background">
                  Lo-Fi Dreamscape
                </h4>
                <p className="mb-4 text-sm text-on-surface-variant">
                  Detected yesterday • Workspace
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-bold text-on-secondary">
                    Chill
                  </span>
                  <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-bold text-on-secondary">
                    Ambient
                  </span>
                </div>
              </div>
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
