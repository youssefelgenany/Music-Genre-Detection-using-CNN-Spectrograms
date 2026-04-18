"""
Mel-Spectrogram Generator

This script loads an audio file, generates a Mel-spectrogram,
converts it to decibel scale, displays it, and saves it as a PNG image.
"""

import librosa
import librosa.display
import matplotlib.pyplot as plt
import numpy as np
import os
import warnings
from typing import List, Optional

# Suppress soxr import warning if not available (it's optional)
warnings.filterwarnings('ignore', category=UserWarning)
try:
    import soxr  # type: ignore[unused-import]
except ImportError:
    # On systems without soxr, librosa will fall back to resampy
    pass


def load_audio(file_path, sr=22050):
    """
    Load an audio file using librosa.
    
    Args:
        file_path (str): Path to the audio file.
        sr (int): Sample rate for loading audio (default: 22050 Hz).

    Returns:
        tuple: Audio time series (y) and sample rate (sr)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    # Load full audio file at the target sample rate.
    y, sr = librosa.load(file_path, sr=sr)

    print(f"Loaded audio: {len(y)} samples at {sr} Hz sample rate ({len(y)/sr:.2f} seconds)")
    return y, sr


def split_audio_into_segments(y: np.ndarray, sr: int, segment_seconds: int = 10) -> List[np.ndarray]:
    """
    Split audio into fixed-length segments and discard trailing remainder.

    Args:
        y (np.ndarray): Full audio time series.
        sr (int): Sample rate.
        segment_seconds (int): Segment length in seconds.

    Returns:
        List[np.ndarray]: List of exactly segment_seconds-long audio segments.
    """
    samples_per_segment = sr * segment_seconds
    total_full_segments = len(y) // samples_per_segment

    segments: List[np.ndarray] = []
    for seg_idx in range(total_full_segments):
        start = seg_idx * samples_per_segment
        end = start + samples_per_segment
        segments.append(y[start:end])

    discarded_samples = len(y) - (total_full_segments * samples_per_segment)
    print(
        f"Split into {total_full_segments} segment(s) of {segment_seconds}s; "
        f"discarded {discarded_samples / sr:.2f}s trailing audio."
    )
    return segments


def generate_mel_spectrogram(y, sr=22050, n_mels=128, n_fft=2048, hop_length=512):
    """
    Generate a Mel-spectrogram from audio signal.
    
    Args:
        y (np.ndarray): Audio time series
        sr (int): Sample rate of the audio
        n_mels (int): Number of Mel filter banks (default: 128)
        n_fft (int): Length of the windowed signal after padding (default: 2048)
        hop_length (int): Number of samples between successive frames (default: 512)
    
    Returns:
        np.ndarray: Mel-spectrogram (power spectrogram)
    """
    # Generate Mel-spectrogram
    mel_spec = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_mels=n_mels,
        n_fft=n_fft,
        hop_length=hop_length
    )
    
    print(f"Generated Mel-spectrogram with shape: {mel_spec.shape}")
    return mel_spec


def convert_to_decibels(mel_spec):
    """
    Convert Mel-spectrogram to decibel scale.
    
    Args:
        mel_spec (np.ndarray): Mel-spectrogram (power spectrogram)
    
    Returns:
        np.ndarray: Mel-spectrogram in decibel scale
    """
    # Convert to decibel scale
    mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
    
    print("Converted Mel-spectrogram to decibel scale")
    return mel_spec_db


def display_spectrogram(mel_spec_db, sr=22050, hop_length=512, title="Mel-Spectrogram"):
    """
    Display the Mel-spectrogram using matplotlib.
    
    Args:
        mel_spec_db (np.ndarray): Mel-spectrogram in decibel scale
        sr (int): Sample rate of the audio
        hop_length (int): Hop length used in spectrogram generation
        title (str): Title for the plot
    """
    plt.figure(figsize=(12, 6))
    
    # Display the spectrogram
    librosa.display.specshow(
        mel_spec_db,
        x_axis='time',
        y_axis='mel',
        sr=sr,
        hop_length=hop_length,
        cmap='magma'
    )
    
    plt.colorbar(format='%+2.0f dB', label='Decibels')
    plt.title(title)
    plt.tight_layout()
    
    print("Displaying spectrogram...")


def save_spectrogram(mel_spec_db, output_path, sr=22050, hop_length=512, dpi=300):
    """
    Save the Mel-spectrogram as a PNG image.
    
    Args:
        mel_spec_db (np.ndarray): Mel-spectrogram in decibel scale
        output_path (str): Path where the PNG image will be saved
        sr (int): Sample rate of the audio
        hop_length (int): Hop length used in spectrogram generation
        dpi (int): Resolution of the saved image (default: 300)
    """
    fig, ax = plt.subplots(figsize=(12, 6))

    # Display clean spectrogram for CNN input (no axes/colorbar/labels).
    librosa.display.specshow(
        mel_spec_db,
        x_axis=None,
        y_axis=None,
        sr=sr,
        hop_length=hop_length,
        cmap='magma',
        ax=ax,
    )
    ax.set_axis_off()
    fig.tight_layout(pad=0)

    # Save tightly cropped image with no extra margins.
    fig.savefig(output_path, dpi=dpi, bbox_inches="tight", pad_inches=0)
    plt.close(fig)

    print(f"Spectrogram saved to: {output_path}")


def process_audio_file(
    audio_path,
    output_path: Optional[str] = None,
    sr=22050,
    n_mels=128,
    n_fft=2048,
    hop_length=512,
    segment_seconds: int = 10,
    display=True,
    save=True,
):
    """
    Complete pipeline to process an audio file and generate Mel-spectrogram.

    Args:
        audio_path (str): Path to the input audio file.
        output_path (str): Path for the output PNG image (default: audio_path + '.png').
        sr (int): Sample rate for loading audio.
        n_mels (int): Number of Mel filter banks.
        n_fft (int): Length of the windowed signal after padding.
        hop_length (int): Number of samples between successive frames.
        display (bool): Whether to display the spectrogram (default: True).
        save (bool): Whether to save the spectrogram (default: True).

    Returns:
        List[np.ndarray]: List of segment Mel-spectrograms in decibel scale.
    """
    y, sr = load_audio(audio_path, sr=sr)
    segments = split_audio_into_segments(y, sr=sr, segment_seconds=segment_seconds)
    if not segments:
        print("No full segments found; skipping file.")
        return []

    mel_specs_db: List[np.ndarray] = []
    for seg_idx, segment in enumerate(segments):
        mel_spec = generate_mel_spectrogram(segment, sr, n_mels, n_fft, hop_length)
        mel_spec_db = convert_to_decibels(mel_spec)
        mel_specs_db.append(mel_spec_db)

        if output_path is None:
            base_name = os.path.splitext(audio_path)[0]
            current_output_path = f"{base_name}_part{seg_idx + 1}.png"
        else:
            base_name, ext = os.path.splitext(output_path)
            current_output_path = f"{base_name}_part{seg_idx + 1}{ext or '.png'}"

        if save:
            save_spectrogram(
                mel_spec_db,
                current_output_path,
                sr,
                hop_length,
            )

    if display:
        display_spectrogram(mel_specs_db[0], sr, hop_length, title="Mel-Spectrogram (segment 0)")
        plt.show(block=True)

    return mel_specs_db


if __name__ == "__main__":
    # Example usage
    import sys
    
    # Check if audio file path is provided as command line argument
    if len(sys.argv) > 1:
        audio_file_path = sys.argv[1]
    else:
        # Default example (user should replace with their audio file path)
        audio_file_path = "example_audio.wav"
        print(f"No audio file provided. Using default: {audio_file_path}")
        print("Usage: python generate_mel_spectrogram.py <audio_file_path>")
    
    # Optional: specify output path
    output_file_path = None
    if len(sys.argv) > 2:
        output_file_path = sys.argv[2]
    
    try:
        # Process the audio file
        mel_spectrogram = process_audio_file(
            audio_path=audio_file_path,
            output_path=output_file_path,
            sr=22050,
            n_mels=128,
            n_fft=2048,
            hop_length=512,
            segment_seconds=10,
            display=True,
            save=True
        )
        print("Processing completed successfully!")
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
    except ImportError as e:
        if 'soxr' in str(e):
            print("Warning: soxr module not found. This is optional - librosa will use resampy instead.")
            print("The script should still work. If you encounter issues, try running again.")
        else:
            print(f"Import error: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()