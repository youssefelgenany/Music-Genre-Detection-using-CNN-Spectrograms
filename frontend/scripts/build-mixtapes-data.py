"""Write frontend/data/mixtapes.js — 15 placeholder songs per genre; pop block preserved verbatim."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "mixtapes.js"

# User-maintained pop section (do not auto-generate).
POP_BLOCK = r"""
  {
    genre: "pop",
    songs: [
      {
        id: "pop-1",
        title: "Set Fire To The Rain",
        artist: "Adele",
        audio: "/audio/pop/Set fire to the rain.mp3",
        cover: "/covers/pop1.jpg",
        duration: "4:00",
      },
      {
        id: "pop-2",
        title: "As It Was",
        artist: "Harry Styles",
        audio: "/audio/pop/As It Was by Harry Styles .mp3",
        cover: "/covers/pop2.jpg",
        duration: "2:46",
      },
      {
        id: "pop-3",
        title: "Attention",
        artist: "Charlie Puth",
        audio: "/audio/pop/Attention by Charlie Puth.mp3",
        cover: "/covers/pop3.jpg",
        duration: "3:28",
      },
      {
        id: "pop-4",
        title: "WILDFLOWER",
        artist: "Billie Eilish",
        audio: "/audio/pop/Billie Eilish - WILDFLOWER fiinished.mp3",
        cover: "/covers/pop4.jpg",
        duration: "4:34",
      },
      {
        id: "pop-5",
        title: "BIRDS OF A FEATHER",
        artist: "Billie Eilish",
        audio: "/audio/pop/BIRDS OF A FEATHER - Billie Eilish.mp3",
        cover: "/covers/pop5.jpg",
        duration: "3:30",
      },
      {
        id: "pop-6",
        title: "End Of Beginning",
        artist: "Djo",
        audio: "/audio/pop/Djo - End Of Beginning (Official Audio).mp3",
        cover: "/covers/pop6.jpg",
        duration: "2:39",
      },
      {
        id: "pop-7",
        title: "Dusk Till Dawn",
        artist: "Zayn (feat. sia)",
        audio: "/audio/pop/Dusk Till Dawn (Official Video) ft. Sia.mp3",
        cover: "/covers/pop7.jpg",
        duration: "5:37",
      },
      {
        id: "pop-8",
        title: "Espresso",
        artist: "Sabrina Carpenter",
        audio: "/audio/pop/Espresso - Sabrina Carpenter.mp3",
        cover: "/covers/pop8.jpg",
        duration: "4:00",
      },
      {
        id: "pop-2",
        title: "As It Was",
        artist: "Harry Styles",
        audio: "/audio/pop/As It Was by Harry Styles .mp3",
        cover: "/covers/pop2.jpg",
        duration: "2:46",
      },
      {
        id: "pop-3",
        title: "Attention",
        artist: "Charlie Puth",
        audio: "/audio/pop/Attention by Charlie Puth.mp3",
        cover: "/covers/pop3.jpg",
        duration: "3:28",
      },
      {
        id: "pop-4",
        title: "WILDFLOWER",
        artist: "Billie Eilish",
        audio: "/audio/pop/Billie Eilish - WILDFLOWER fiinished.mp3",
        cover: "/covers/pop4.jpg",
        duration: "4:34",
      },
      {
        id: "pop-5",
        title: "BIRDS OF A FEATHER",
        artist: "Billie Eilish",
        audio: "/audio/pop/BIRDS OF A FEATHER - Billie Eilish.mp3",
        cover: "/covers/pop5.jpg",
        duration: "3:30",
      },
      {
        id: "pop-6",
        title: "End Of Beginning",
        artist: "Djo",
        audio: "/audio/pop/Djo - End Of Beginning (Official Audio).mp3",
        cover: "/covers/pop6.jpg",
        duration: "2:39",
      },
      {
        id: "pop-7",
        title: "Dusk Till Dawn",
        artist: "Zayn (feat. sia)",
        audio: "/audio/pop/Dusk Till Dawn (Official Video) ft. Sia.mp3",
        cover: "/covers/pop7.jpg",
        duration: "5:37",
      },
    ],
  },
""".lstrip("\n")


def songs_block(genre_slug: str, id_prefix: str, cover_prefix: str) -> str:
    lines = ["  {", f'    genre: "{genre_slug}",', "    songs: ["]
    for i in range(1, 16):
        n = f"{i:02d}"
        lines.extend(
            [
                "      {",
                f'        id: "{id_prefix}-{i}",',
                f'        title: "Track {i}",',
                '        artist: "TBD",',
                f'        audio: "/audio/{genre_slug}/track_{n}.mp3",',
                f'        cover: "/covers/{cover_prefix}{i}.jpg",',
                '        duration: "0:00",',
                "      },",
            ]
        )
    lines.extend(["    ],", "  },"])
    return "\n".join(lines) + "\n"


def main() -> None:
    header = """/**
 * Centralized mixtape catalog. Paths are served from `frontend/public/`:
 *   /audio/{genre}/{file}.mp3  \u2192  public/audio/{genre}/{file}.mp3
 *   /covers/{file}.jpg         \u2192  public/covers/{file}.jpg
 * Regenerate placeholders: `python frontend/scripts/materialize-mixtape-assets.py` (needs ffmpeg).
 * Genres use lowercase slugs; IDs are unique across the whole dataset.
 */

export const mixtapes = [
"""

    order = [
        ("blues", "blues", "blues"),
        ("classical", "classical", "classical"),
        ("country", "country", "country"),
        ("disco", "disco", "disco"),
        ("hip-hop", "hiphop", "hiphop"),
        ("jazz", "jazz", "jazz"),
        ("metal", "metal", "metal"),
    ]
    body = "".join(songs_block(s, ip, cp) for s, ip, cp in order)
    body += POP_BLOCK + "\n"
    body += songs_block("reggae", "reggae", "reggae")
    body += songs_block("rock", "rock", "rock")
    out = header + body + "];\n"
    OUT.write_text(out, encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
