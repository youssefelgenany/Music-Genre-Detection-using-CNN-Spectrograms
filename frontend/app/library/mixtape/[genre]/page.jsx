import { notFound } from "next/navigation";
import MixtapePlaylistView from "@/components/MixtapePlaylistView";
import { getMixtapePlaylistByGenre } from "@/lib/mixtapePlaylists";
import { slugToCanonicalGenre } from "@/lib/genreSlug";

export async function generateMetadata({ params }) {
  const p = await params;
  const canonical = slugToCanonicalGenre(p?.genre);
  const pl = canonical ? getMixtapePlaylistByGenre(canonical) : null;
  return {
    title: pl ? `${pl.playlistTitle} · Gen Scope` : "Mixtape · Gen Scope",
    description: pl
      ? `Mixtape: ${pl.playlistTitle} (${canonical})`
      : "Mixtape playlist",
  };
}

export default async function MixtapePage({ params }) {
  const p = await params;
  const canonical = slugToCanonicalGenre(p?.genre);
  if (!canonical) notFound();
  const pl = getMixtapePlaylistByGenre(canonical);
  if (!pl) notFound();

  return <MixtapePlaylistView genre={canonical} />;
}
