"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import GenreScanCard from "@/components/GenreScanCard";
import MadeForYouCard from "@/components/MadeForYouCard";
import MixtapeCard from "@/components/MixtapeCard";
import { useMadeForYouPlaylist } from "@/hooks/useMadeForYouPlaylist";
import { useScannedMusic } from "@/hooks/useScannedMusic";
import { SCANNED_GENRES } from "@/lib/libraryData";
import {
  MIXTAPE_PLAYLISTS,
  defaultCoverForGenre,
} from "@/lib/mixtapePlaylists";

export default function LibraryContent() {
  const { byGenre, loading } = useScannedMusic();
  const madeForYou = useMadeForYouPlaylist();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Navbar />

      <div className="flex min-h-0 w-full flex-1">
        <Sidebar />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-6 pb-28 sm:px-6 sm:py-8 md:px-8 md:pb-10 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <h1 className="font-headline mb-10 text-3xl font-black tracking-tight text-on-background sm:mb-12 sm:text-4xl">
              Your Library
            </h1>

            <section className="mb-14 sm:mb-16">
              <h2 className="font-headline mb-6 text-xl font-bold text-on-background sm:text-2xl">
                Scanned Music
              </h2>
              {loading ? (
                <p className="text-sm text-on-surface-variant">Loading library…</p>
              ) : (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
                  {SCANNED_GENRES.map((item) => (
                    <GenreScanCard
                      key={item.name}
                      title={item.name}
                      coverGradientClass={item.cover}
                      tracks={byGenre[item.name] ?? []}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="font-headline mb-6 text-xl font-bold text-on-background sm:text-2xl">
                Mixtapes
              </h2>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
                <MadeForYouCard
                  songCount={madeForYou.songs.length}
                  scanTotal={madeForYou.scanTotal}
                  percentages={madeForYou.percentages}
                  loading={madeForYou.loading}
                />
                {MIXTAPE_PLAYLISTS.map((item) => (
                  <MixtapeCard
                    key={item.genre}
                    genreName={item.genre}
                    playlistTitle={item.playlistTitle}
                    trackCount={item.songs.length}
                    coverGradientClass={defaultCoverForGenre(item.genre)}
                  />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      <footer className="mt-auto w-full border-t border-outline/30 bg-surface py-8 md:py-10">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6 md:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            © 2024 Gen Scope. The Sonic Curator experience.
          </p>
        </div>
      </footer>
    </div>
  );
}
