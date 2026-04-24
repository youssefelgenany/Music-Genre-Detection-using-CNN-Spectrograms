"""
Generate placeholder MP3/JPEG files for every path in data/mixtapes.js.
Requires ffmpeg on PATH. Run from repo: python frontend/scripts/materialize-mixtape-assets.py
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Tuple

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / "public"
DATA = ROOT / "data" / "mixtapes.js"


def ffmpeg_templates() -> Tuple[Path, Path]:
    mp3 = PUB / "_template.mp3"
    jpg = PUB / "_template.jpg"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=mono",
            "-t",
            "0.25",
            "-q:a",
            "9",
            "-acodec",
            "libmp3lame",
            str(mp3),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=gray:s=400x400",
            "-frames:v",
            "1",
            "-q:v",
            "5",
            str(jpg),
        ],
        check=True,
    )
    return mp3, jpg


def main() -> None:
    text = DATA.read_text(encoding="utf-8")
    audios = re.findall(r'audio:\s*"([^"]+)"', text)
    covers = re.findall(r'cover:\s*"([^"]+)"', text)
    PUB.mkdir(parents=True, exist_ok=True)
    mp3, jpg = ffmpeg_templates()
    try:
        for rel in audios:
            path = PUB.joinpath(*rel.lstrip("/").split("/"))
            path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(mp3, path)
        for rel in covers:
            path = PUB.joinpath(*rel.lstrip("/").split("/"))
            path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(jpg, path)
    finally:
        mp3.unlink(missing_ok=True)
        jpg.unlink(missing_ok=True)
    print(f"Wrote {len(audios)} audio + {len(covers)} cover files under public/")


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as e:
        print("ffmpeg not found — install ffmpeg and ensure it is on PATH.", file=sys.stderr)
        raise SystemExit(1) from e
    except subprocess.CalledProcessError as e:
        print("ffmpeg failed.", file=sys.stderr)
        raise SystemExit(1) from e
