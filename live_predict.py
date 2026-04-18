"""
Live genre prediction from microphone audio.

Pipeline:
1) Record microphone input (sounddevice)
2) Preprocess (noise reduction, bandpass, pre-emphasis, RMS loudness)
3) Convert to Mel spectrogram with training parameters
4) Convert spectrogram to RGB image and resize to 224x224
5) Load trained model checkpoint and class names
6) Predict genre on CPU
"""

import contextlib
import io
from collections import Counter
import librosa
import noisereduce as nr
import numpy as np
import os
import tempfile
from scipy.signal import butter, sosfiltfilt
from PIL import Image
import sounddevice as sd
import soundfile as sf
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
RECORD_SECONDS = 12
PREDICT_SECONDS = 10
N_MELS = 128
N_FFT = 2048
HOP_LENGTH = 512
DEBUG_WAV_PATH = "mic_test.wav"

# Mic preprocessing: match clean dataset loudness / spectrum; not peak-based.
BANDPASS_LOW_HZ = 100.0
BANDPASS_HIGH_HZ = 8000.0
PRE_EMPHASIS_COEF = 0.97
TARGET_RMS = 0.1


def bandpass_filter(y: np.ndarray, sr: int) -> np.ndarray:
    """Bandpass 100–8000 Hz (zero-phase SOS)."""
    high = min(BANDPASS_HIGH_HZ, 0.499 * sr)
    low = max(BANDPASS_LOW_HZ, 1.0)
    if low >= high:
        return y.astype(np.float32, copy=False)
    sos = butter(4, [low, high], btype="band", fs=sr, output="sos")
    y64 = np.asarray(y, dtype=np.float64)
    out = sosfiltfilt(sos, y64)
    return out.astype(np.float32)


def reduce_noise_spectral_gating(y: np.ndarray, sr: int) -> np.ndarray:
    """Spectral gating via noisereduce (moderate strength for music)."""
    return nr.reduce_noise(
        y=y,
        sr=sr,
        stationary=False,
        prop_decrease=0.75,
    )


def pre_emphasis(y: np.ndarray, coef: float = PRE_EMPHASIS_COEF) -> np.ndarray:
    """y[n] = y[n] - coef * y[n-1] (first-order high-frequency emphasis)."""
    y = np.asarray(y, dtype=np.float32)
    if len(y) < 2:
        return y.copy()
    out = np.empty_like(y, dtype=np.float32)
    out[0] = y[0]
    out[1:] = y[1:] - coef * y[:-1]
    return out


def normalize_rms(y: np.ndarray, target_rms: float = TARGET_RMS) -> np.ndarray:
    """Scale waveform so RMS matches target (not peak normalization)."""
    y = np.asarray(y, dtype=np.float32)
    rms = float(np.sqrt(np.mean(np.square(y))))
    if rms < 1e-10:
        return y
    return (y * (target_rms / rms)).astype(np.float32)


def record_audio(duration_seconds: int = RECORD_SECONDS, sr: int = SAMPLE_RATE):
    used_sr = 22050
    num_samples = int(duration_seconds * used_sr)
    print("Recording...")
    audio = sd.rec(num_samples, samplerate=22050, channels=2, device=1)
    sd.wait()
    print("Recording finished")

    audio = np.asarray(audio, dtype=np.float32)

    left_max = float(np.max(np.abs(audio[:, 0])))
    right_max = float(np.max(np.abs(audio[:, 1])))
    print(f"Left channel max: {left_max}")
    print(f"Right channel max: {right_max}")

    if right_max > left_max:
        audio = audio[:, 1]
    else:
        audio = audio[:, 0]

    max_amp = float(np.max(np.abs(audio)))
    print(f"Max amplitude: {max_amp}")

    if max_amp < 1e-4:
        print("WARNING: Mic is recording silence")

    sf.write(DEBUG_WAV_PATH, audio, used_sr)
    print("Saved mic_test.wav successfully")

    return audio, used_sr


def preprocess_audio(y: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    """
    Mic path: bring recording closer to clean dataset audio.

    Order: mono → resample → spectral noise reduction → bandpass (100–8000 Hz) →
    pre-emphasis → trim/pad → RMS loudness (not peak).
    """
    if y.ndim > 1:
        y = np.mean(y, axis=1)

    y = y.astype(np.float32, copy=False)

    y = librosa.resample(
        y,
        orig_sr=sr,
        target_sr=SAMPLE_RATE,
        res_type="soxr_hq",
    )
    sr = SAMPLE_RATE

    y = reduce_noise_spectral_gating(y, sr)
    y = bandpass_filter(y, sr)
    y = pre_emphasis(y, PRE_EMPHASIS_COEF)

    y = y[: PREDICT_SECONDS * SAMPLE_RATE]
    if len(y) < PREDICT_SECONDS * SAMPLE_RATE:
        y = np.pad(y, (0, (PREDICT_SECONDS * SAMPLE_RATE) - len(y)), mode="constant")

    y = normalize_rms(y, TARGET_RMS)
    return y.astype(np.float32)


def audio_to_mel_image(y: np.ndarray, sr: int = SAMPLE_RATE) -> Image.Image:
    """Convert waveform to image using training spectrogram functions."""
    with contextlib.redirect_stdout(io.StringIO()):
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
        with contextlib.redirect_stdout(io.StringIO()):
            save_spectrogram(mel_spec_db, tmp_png_path, sr=sr, hop_length=HOP_LENGTH)
        image = Image.open(tmp_png_path).convert("RGB")
        image = image.resize((224, 224), Image.BILINEAR)
    finally:
        if os.path.exists(tmp_png_path):
            os.remove(tmp_png_path)

    return image


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


def predict_genre() -> None:
    """Run live prediction from microphone input."""
    model, class_names = load_model_and_classes(MODEL_PATH)

    y_recorded, recorded_sr = record_audio(RECORD_SECONDS, SAMPLE_RATE)
    y_processed = preprocess_audio(y_recorded, recorded_sr)
    transform = transforms.Compose([transforms.ToTensor()])

    n_samples = len(y_processed)
    seg_len = n_samples // 5
    predictions: list[str] = []

    with torch.no_grad():
        for seg_i in range(5):
            start = seg_i * seg_len
            end = (seg_i + 1) * seg_len if seg_i < 4 else n_samples
            segment = y_processed[start:end]
            image = audio_to_mel_image(segment, SAMPLE_RATE)
            input_tensor = transform(image).unsqueeze(0).to("cpu")
            logits = model(input_tensor)
            pred_idx = int(torch.argmax(logits, dim=1).item())
            predictions.append(class_names[pred_idx])

    vote_counts = Counter(predictions)
    final_genre = vote_counts.most_common(1)[0][0]

    print("Per-segment predictions:")
    for i, genre in enumerate(predictions):
        print(f"  Segment {i}: {genre}")
    print(f"All predictions: {predictions}")
    print(f"Final predicted genre (majority vote): {final_genre}")


if __name__ == "__main__":
    predict_genre()
