import os
import tempfile

os.environ["PATH"] += r";C:\Users\Youssef Khaled\Downloads\ffmpeg-8.1-essentials_build\ffmpeg-8.1-essentials_build\bin"

import ffmpeg
import librosa
import noisereduce as nr
import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydub import AudioSegment
from scipy.io import wavfile as scipy_wavfile
from scipy.signal import butter, filtfilt
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
N_MELS = 128
N_FFT = 2048
HOP_LENGTH = 512

BANDPASS_LOW_HZ = 100.0
BANDPASS_HIGH_HZ = 8000.0
# Target RMS for float waveforms (typical comfortable range ~0.1–0.2).
TARGET_RMS = 0.15


def bandpass_100_8000_hz(y: np.ndarray, sr: int) -> np.ndarray:
    """Bandpass 100–8000 Hz using Butterworth + zero-phase filtfilt."""
    high_hz = min(BANDPASS_HIGH_HZ, 0.499 * sr)
    low_hz = max(BANDPASS_LOW_HZ, 1.0)
    if low_hz >= high_hz:
        return np.asarray(y, dtype=np.float32)
    b, a = butter(4, [low_hz, high_hz], btype="band", fs=sr)
    y64 = np.asarray(y, dtype=np.float64)
    out = filtfilt(b, a, y64)
    return out.astype(np.float32)


def load_model_and_classes(checkpoint_path: str = MODEL_PATH):
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    class_names = checkpoint["class_names"]

    model = models.resnet18(weights=None)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, len(class_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to("cpu")
    model.eval()

    return model, class_names


def load_audio_robust(audio_path: str, sr: int) -> np.ndarray:
    """
    Robust audio loading for uploads.

    Try soundfile first (best for WAV from browser), then scipy WAV parser,
    then librosa fallback for compressed formats.
    """
    errors = []

    try:
        y, native_sr = sf.read(audio_path, dtype="float32", always_2d=False)
        if y.ndim > 1:
            y = np.mean(y, axis=1)
        if native_sr != sr:
            y = librosa.resample(y.astype(np.float32), orig_sr=native_sr, target_sr=sr)
        return np.asarray(y, dtype=np.float32)
    except Exception as exc:
        errors.append(f"soundfile={type(exc).__name__}: {exc}")

    try:
        native_sr, y = scipy_wavfile.read(audio_path)
        y = np.asarray(y)
        if y.ndim > 1:
            y = np.mean(y, axis=1)
        if np.issubdtype(y.dtype, np.integer):
            maxv = max(abs(np.iinfo(y.dtype).min), np.iinfo(y.dtype).max)
            y = y.astype(np.float32) / float(maxv)
        else:
            y = y.astype(np.float32)
        if native_sr != sr:
            y = librosa.resample(y, orig_sr=native_sr, target_sr=sr)
        return np.asarray(y, dtype=np.float32)
    except Exception as exc:
        errors.append(f"scipy_wav={type(exc).__name__}: {exc}")

    try:
        y, _ = librosa.load(audio_path, sr=sr)
        return np.asarray(y, dtype=np.float32)
    except Exception as exc:
        errors.append(f"librosa={type(exc).__name__}: {exc}")
        raise ValueError("Unable to decode audio upload. " + " | ".join(errors)) from exc


def ensure_wav_input(audio_path: str, content_type: str | None) -> tuple[str, bool]:
    """
    Return a WAV path for downstream loading.
    If input is not WAV, convert with ffmpeg (fallback: pydub).
    """
    lower_path = audio_path.lower()
    is_wav_ext = lower_path.endswith(".wav")
    is_wav_ct = (content_type or "").lower() in {"audio/wav", "audio/x-wav", "audio/wave"}
    if is_wav_ext or is_wav_ct:
        return audio_path, False

    fd, wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)

    errors = []
    try:
        (
            ffmpeg
            .input(audio_path)
            .output(wav_path, acodec="pcm_s16le", ac=1, ar=str(SAMPLE_RATE), format="wav")
            .overwrite_output()
            .run(quiet=True)
        )
        return wav_path, True
    except Exception as exc:
        errors.append(f"ffmpeg={type(exc).__name__}: {exc}")

    try:
        audio = AudioSegment.from_file(audio_path)
        audio = audio.set_channels(1).set_frame_rate(SAMPLE_RATE)
        audio.export(wav_path, format="wav")
        return wav_path, True
    except Exception as exc:
        errors.append(f"pydub={type(exc).__name__}: {exc}")
        if os.path.exists(wav_path):
            os.remove(wav_path)
        raise ValueError("Failed to convert upload to WAV. " + " | ".join(errors)) from exc


def preprocess_audio(audio_path: str, sr: int = SAMPLE_RATE) -> np.ndarray:
    y = load_audio_robust(audio_path, sr)
    if len(y) == 0:
        raise ValueError("Loaded audio is empty.")

    target_len = SEGMENT_SECONDS * sr
    if len(y) > target_len:
        y = y[:target_len]
    elif len(y) < target_len:
        y = np.pad(y, (0, target_len - len(y)), mode="constant")

    # Audio is at target sr (resampling happened in load_audio_robust).
    y = bandpass_100_8000_hz(y, sr)

    y = np.asarray(y, dtype=np.float32)
    try:
        # Stationary gate: use the same clip for noise statistics (simple baseline).
        y = nr.reduce_noise(
            y=y,
            sr=sr,
            stationary=True,
            y_noise=y,
            prop_decrease=0.75,
        )
        y = np.asarray(y, dtype=np.float32)
    except Exception:
        pass

    y = np.asarray(y, dtype=np.float32)
    rms = float(np.sqrt(np.mean(np.square(y))))
    # RMS normalization to ~0.1–0.2 (TARGET_RMS).
    #
    # Why not peak (max-abs) normalization?
    # Peak gain is set by a single sample (clicks, pops, one loud hit). That
    # makes quiet passages over-amplified and makes loudness between clips
    # unstable. RMS reflects average energy over the window, so levels track
    # perceived loudness more consistently and are less sensitive to outliers.
    if rms > 1e-10:
        y = y * (TARGET_RMS / rms)
    y = np.clip(y, -1.0, 1.0)
    return y.astype(np.float32)


def audio_to_image(y: np.ndarray, sr: int = SAMPLE_RATE) -> Image.Image:
    mel_spec = generate_mel_spectrogram(
        y=y,
        sr=sr,
        n_mels=N_MELS,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )
    mel_spec_db = convert_to_decibels(mel_spec)

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_png:
        tmp_png_path = tmp_png.name
    try:
        save_spectrogram(mel_spec_db, tmp_png_path, sr=sr, hop_length=HOP_LENGTH)
        image = Image.open(tmp_png_path).convert("RGB")
        image = image.resize((224, 224), Image.BILINEAR)
    finally:
        if os.path.exists(tmp_png_path):
            os.remove(tmp_png_path)

    return image


app = FastAPI(title="Music Genre Classifier API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")

model, class_names = load_model_and_classes(MODEL_PATH)
image_transform = transforms.Compose([transforms.ToTensor()])


@app.get("/")
async def root():
    if os.path.isdir(_static_dir):
        return RedirectResponse(url="/static/gen_scope.html")
    return {"message": "Music Genre Classifier API is running"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_audio:
        tmp_audio_path = tmp_audio.name
        payload = await file.read()
        if not payload:
            raise HTTPException(status_code=400, detail="Empty upload payload")
        tmp_audio.write(payload)

    converted_wav_path = None
    try:
        input_path, was_converted = ensure_wav_input(tmp_audio_path, file.content_type)
        if was_converted:
            converted_wav_path = input_path
        y = preprocess_audio(input_path, SAMPLE_RATE)
        image = audio_to_image(y, SAMPLE_RATE)
        input_tensor = image_transform(image).unsqueeze(0).to("cpu")

        with torch.no_grad():
            logits = model(input_tensor)
            pred_idx = int(torch.argmax(logits, dim=1).item())

        label = class_names[pred_idx]
        return {"predicted_genre": label, "genre": label}
    except Exception as exc:
        detail = f"{type(exc).__name__}: {exc}"
        raise HTTPException(status_code=400, detail=detail) from exc
    finally:
        if os.path.exists(tmp_audio_path):
            os.remove(tmp_audio_path)
        if converted_wav_path and os.path.exists(converted_wav_path):
            os.remove(converted_wav_path)
