import { notFound } from "next/navigation";
import GenrePlaylistView from "@/components/GenrePlaylistView";
import { slugToCanonicalGenre } from "@/lib/genreSlug";

export async function generateMetadata({ params }) {
  const p = await params;
  const slug = p?.genre;
  const canonical = slugToCanonicalGenre(slug);
  return {
    title: canonical ? `${canonical} · Gen Scope` : "Playlist · Gen Scope",
    description: canonical
      ? `Songs scanned as ${canonical}`
      : "Genre playlist",
  };
}

export default async function GenrePlaylistPage({ params }) {
  const p = await params;
  const canonical = slugToCanonicalGenre(p?.genre);
  if (!canonical) notFound();

  return <GenrePlaylistView genre={canonical} />;
}
