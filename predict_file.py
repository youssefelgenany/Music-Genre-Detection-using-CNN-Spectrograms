"""
Predict music genre from an audio file.

Usage:
    python predict_file.py "path/to/audio.wav"
"""

import argparse
import os
import tempfile

import librosa
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from torchvision import models, transforms
from generate_mel_spectrogram import (
    convert_to_decibels,
    generate_mel_spectrogram,
    save_spectrogram,
)


MODEL_PATH = "models/music_genre_cnn.pth"
SAMPLE_RATE = 22050
SEGMENT_SECONDS = 10
N_FFT = 2048
HOP_LENGTH = 512
N_MELS = 128


def load_model_and_classes(checkpoint_path: str = MODEL_PATH):
    """Load checkpoint and rebuild model on CPU."""
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    class_names = checkpoint["class_names"]

    model = models.resnet18(weights=None)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, len(class_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to("cpu")
    model.eval()
    return model, class_names


def load_first_10_seconds(audio_path: str, sr: int = SAMPLE_RATE) -> np.ndarray:
    """Load only the first 10 seconds of audio."""
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    y, _ = librosa.load(audio_path, sr=sr, duration=SEGMENT_SECONDS)
    if len(y) == 0:
        raise ValueError("Loaded audio is empty.")
    return y


def audio_to_spectrogram_image(y: np.ndarray, sr: int = SAMPLE_RATE) -> Image.Image:
    """
    Convert audio to spectrogram image using the exact training script functions.
    """
    mel_spec = generate_mel_spectrogram(
        y=y,
        sr=sr,
        n_mels=N_MELS,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )
    mel_spec_db = convert_to_decibels(mel_spec)

    # Use the same rendering function used for training image generation.
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


def predict_genre(audio_path: str) -> None:
    model, class_names = load_model_and_classes(MODEL_PATH)
    y = load_first_10_seconds(audio_path, SAMPLE_RATE)
    image = audio_to_spectrogram_image(y, SAMPLE_RATE)

    transform = transforms.Compose(
        [
            transforms.ToTensor(),
        ]
    )
    input_tensor = transform(image).unsqueeze(0).to("cpu")

    with torch.no_grad():
        logits = model(input_tensor)
        pred_idx = int(torch.argmax(logits, dim=1).item())

    print(f"Predicted genre: {class_names[pred_idx]}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict music genre from an audio file.")
    parser.add_argument("audio_path", type=str, help="Path to the input audio file.")
    args = parser.parse_args()
    predict_genre(args.audio_path)


if __name__ == "__main__":
    main()
