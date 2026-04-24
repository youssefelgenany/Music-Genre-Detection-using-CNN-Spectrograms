import MadeForYouPlaylistView from "@/components/MadeForYouPlaylistView";

export const metadata = {
  title: "Made For You · Gen Scope",
  description: "Personalized playlist based on your scanned genres",
};

export default function MadeForYouPage() {
  return <MadeForYouPlaylistView />;
}
