"use client";

import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import MusicPlayerBar from "@/components/MusicPlayerBar";

export function Providers({ children }) {
  return (
    <MusicPlayerProvider>
      {children}
      <MusicPlayerBar />
    </MusicPlayerProvider>
  );
}
