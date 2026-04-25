import os
import tempfile

import librosa
import numpy as np
from PIL import Image

from generate_mel_spectrogram import (
    convert_to_decibels,
    generate_mel_spectrogram,
    save_spectrogram,
)


SAMPLE_RATE = 22050
SEGMENT_SECONDS = 10
N_FFT = 2048
HOP_LENGTH = 512
N_MELS = 128


def process_audio_file(file_path: str, sr: int = SAMPLE_RATE) -> Image.Image:
    """
    Shared preprocessing pipeline:
    - librosa load full audio at target sample rate
    - select centered 10-second segment (or whole clip if shorter)
    - mel spectrogram generation
    - dB conversion
    - spectrogram rendering
    - RGB conversion and resize to 224x224
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    y, _ = librosa.load(file_path, sr=sr)
    if len(y) == 0:
        raise ValueError("Loaded audio is empty.")
    total_length = len(y)
    segment_length = sr * SEGMENT_SECONDS
    start = max(0, (total_length - segment_length) // 2)
    end = start + segment_length
    y = y[start:end]

    mel_spec = generate_mel_spectrogram(
        y=y,
        sr=sr,
        n_mels=N_MELS,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )
    mel_spec_db = convert_to_decibels(mel_spec)

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_file:
        tmp_png_path = tmp_file.name
    try:
        save_spectrogram(mel_spec_db, tmp_png_path, sr=sr, hop_length=HOP_LENGTH)
        image = Image.open(tmp_png_path).convert("RGB")
        image = image.resize((224, 224), Image.BILINEAR)
    finally:
        if os.path.exists(tmp_png_path):
            os.remove(tmp_png_path)

    return image
