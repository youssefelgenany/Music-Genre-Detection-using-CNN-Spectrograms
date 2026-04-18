"""
Batch Mel-Spectrogram Generator for Dataset

This script walks through the GTZAN-style dataset structure:
    genres_original/<genre>/<track>.wav

For each .wav file it:
- Splits audio into 10-second segments
- Generates one Mel-spectrogram per segment
- Saves each segment as a PNG image into:
    spectrograms_10s/<genre>/<track>_part1.png
    spectrograms_10s/<genre>/<track>_part2.png

The genre folder names under `spectrograms_10s/` will match the names under
`genres_original/` (e.g. blues, classical, ...).
"""

import os
from typing import List

from generate_mel_spectrogram import process_audio_file


def resolve_dataset_root(dataset_root: str) -> str:
    """
    Resolve dataset root path, supporting common GTZAN layouts.
    """
    candidates = [dataset_root, os.path.join("dataset", "genres_original"), "genres_original"]
    for candidate in candidates:
        if os.path.isdir(candidate):
            return candidate
    raise FileNotFoundError(
        f"Dataset root folder not found: {dataset_root}. "
        "Checked: " + ", ".join(candidates)
    )


def get_genre_folders(dataset_root: str) -> List[str]:
    """
    Get a sorted list of genre subfolder names under the dataset root.

    Args:
        dataset_root (str): Path to the 'genres_original' folder.

    Returns:
        List[str]: List of genre folder names (e.g. ['blues', 'classical', ...]).
    """
    if not os.path.isdir(dataset_root):
        raise FileNotFoundError(f"Dataset root folder not found: {dataset_root}")

    genres = [
        name
        for name in os.listdir(dataset_root)
        if os.path.isdir(os.path.join(dataset_root, name))
    ]
    genres.sort()
    return genres


def ensure_genre_output_folders(spectrogram_root: str, genres: List[str]) -> None:
    """
    Ensure there is one subfolder per genre under the spectrogram root.

    Args:
        spectrogram_root (str): Base folder where spectrograms will be saved.
        genres (List[str]): List of genre folder names.
    """
    os.makedirs(spectrogram_root, exist_ok=True)
    for genre in genres:
        genre_path = os.path.join(spectrogram_root, genre)
        os.makedirs(genre_path, exist_ok=True)


def generate_dataset_spectrograms(
    dataset_root: str = "genres_original",
    spectrogram_root: str = "spectrograms_10s",
    sr: int = 22050,
    n_mels: int = 128,
    n_fft: int = 2048,
    hop_length: int = 512,
) -> None:
    """
    Generate and save Mel-spectrograms for all .wav files in the dataset.

    The directory layout is assumed to be:
        dataset_root/<genre>/<track>.wav

    Output layout:
        spectrogram_root/<genre>/<track>_part1.png
        spectrogram_root/<genre>/<track>_part2.png

    Args:
        dataset_root (str): Path to the genres_original folder.
        spectrogram_root (str): Path to the output spectrograms folder.
        sr (int): Sample rate used when loading audio.
        n_mels (int): Number of Mel bands.
        n_fft (int): FFT window size.
        hop_length (int): Hop length between frames.
    """
    dataset_root = resolve_dataset_root(dataset_root)
    print(f"Dataset root : {dataset_root}")
    print(f"Output root  : {spectrogram_root}")

    genres = get_genre_folders(dataset_root)
    print(f"Found genres : {genres}")

    ensure_genre_output_folders(spectrogram_root, genres)

    total_files = 0
    files_per_genre = {}
    for genre in genres:
        genre_input_dir = os.path.join(dataset_root, genre)
        wav_files = [f for f in os.listdir(genre_input_dir) if f.lower().endswith(".wav")]
        wav_files.sort()
        files_per_genre[genre] = wav_files
        total_files += len(wav_files)

    attempted_files = 0
    processed_files = 0
    total_segments = 0
    failed_files: List[str] = []

    for genre in genres:
        genre_input_dir = os.path.join(dataset_root, genre)
        genre_output_dir = os.path.join(spectrogram_root, genre)

        wav_files = files_per_genre[genre]

        print(f"\nProcessing genre '{genre}' ({len(wav_files)} files)...")

        for idx, wav_file in enumerate(wav_files, start=1):
            attempted_files += 1
            audio_path = os.path.join(genre_input_dir, wav_file)

            base_name, _ = os.path.splitext(wav_file)
            output_filename = f"{base_name}.png"
            output_path = os.path.join(genre_output_dir, output_filename)

            # Always regenerate (overwrite any old spectrograms)
            print(
                f"[{genre}] File {idx}/{len(wav_files)} "
                f"(overall {attempted_files}/{total_files}) -> {wav_file}"
            )
            try:
                # Use display=False for speed; save=True to write PNG
                segment_specs = process_audio_file(
                    audio_path=audio_path,
                    output_path=output_path,
                    sr=sr,
                    n_mels=n_mels,
                    n_fft=n_fft,
                    hop_length=hop_length,
                    segment_seconds=10,
                    display=False,
                    save=True,
                )
                processed_files += 1
                generated_segments = len(segment_specs)
                total_segments += generated_segments
                print(f"  Saved {generated_segments} segment spectrogram(s).")
            except Exception as e:  # noqa: BLE001
                # Continue with other files even if one fails
                print(f"  -> Error processing {audio_path}: {e}")
                failed_files.append(audio_path)

    print("\nProcessing summary")
    print(f"  Files found      : {total_files}")
    print(f"  Files attempted  : {attempted_files}")
    print(f"  Files processed  : {processed_files}")
    print(f"  Files failed     : {len(failed_files)}")
    print(f"  Images generated : {total_segments}")

    if failed_files:
        print("\nFailed files:")
        for failed_path in failed_files:
            print(f"  - {failed_path}")
        print("\nWarning: Some files failed, so not all dataset files were processed.")
    elif attempted_files != total_files:
        print("\nWarning: Attempted file count does not match discovered file count.")
    else:
        print("\nSuccess: All discovered files were processed.")


if __name__ == "__main__":
    # Default paths based on your current project layout
    default_dataset_root = os.path.join("dataset", "genres_original")
    default_spectrogram_root = "spectrograms_10s"

    generate_dataset_spectrograms(
        dataset_root=default_dataset_root,
        spectrogram_root=default_spectrogram_root,
    )

