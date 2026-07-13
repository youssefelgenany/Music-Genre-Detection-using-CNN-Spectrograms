import os
import tempfile
import time

os.environ["PATH"] += r";C:\Users\Youssef Khaled\Downloads\ffmpeg-8.1-essentials_build\ffmpeg-8.1-essentials_build\bin"

import ffmpeg
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydub import AudioSegment
import torch
import torch.nn as nn
from torchvision import models, transforms

from audio_pipeline import SAMPLE_RATE, process_audio_file


MODEL_PATH = "models/music_genre_cnn.pth"


def model_memory_stats(m: nn.Module) -> tuple[int, float]:
    """Parameter count and approximate weight+buffer memory in MB."""
    param_count = sum(p.numel() for p in m.parameters())
    bytes_used = sum(p.numel() * p.element_size() for p in m.parameters())
    bytes_used += sum(b.numel() * b.element_size() for b in m.buffers())
    return param_count, bytes_used / (1024 * 1024)


def log_prediction_performance(
    *,
    inference_ms: float | None,
    api_ms: float,
    param_count: int,
    memory_mb: float,
) -> None:
    inference_str = (
        f"{inference_ms:.2f} ms"
        if inference_ms is not None
        else "n/a (forward pass did not run)"
    )
    print(
        "[Gen Scope performance]\n"
        f"  Inference latency (forward pass): {inference_str}\n"
        f"  API response time (/predict):       {api_ms:.2f} ms\n"
        f"  Model parameters:                 {param_count:,}\n"
        f"  Approx. model memory:             {memory_mb:.2f} MB"
    )


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
MODEL_PARAM_COUNT, MODEL_MEMORY_MB = model_memory_stats(model)
image_transform = transforms.Compose([transforms.ToTensor()])


@app.get("/")
async def root():
    if os.path.isdir(_static_dir):
        return RedirectResponse(url="/static/gen_scope.html")
    return {"message": "Music Genre Classifier API is running"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    api_start = time.perf_counter()
    inference_ms: float | None = None

    original_name = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    is_wav_ext = original_name.endswith(".wav")
    is_wav_ct = content_type in {"audio/wav", "audio/x-wav", "audio/wave"}
    is_wav_upload = is_wav_ext or is_wav_ct

    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    fd, tmp_audio_path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty upload payload")
    with open(tmp_audio_path, "wb") as f:
        f.write(payload)
        f.flush()
        os.fsync(f.fileno())

    converted_wav_path = None
    try:
        if is_wav_upload:
            input_path = tmp_audio_path
        else:
            input_path, was_converted = ensure_wav_input(tmp_audio_path, file.content_type)
            if was_converted:
                converted_wav_path = input_path
        image = process_audio_file(input_path, SAMPLE_RATE)
        input_tensor = image_transform(image).unsqueeze(0).to("cpu")

        with torch.no_grad():
            forward_start = time.perf_counter()
            logits = model(input_tensor)
            inference_ms = (time.perf_counter() - forward_start) * 1000

            probs = torch.softmax(logits, dim=1)[0]
            pred_idx = int(torch.argmax(logits, dim=1).item())
            confidence = float(probs[pred_idx].item())
            top_probs, top_indices = torch.topk(probs, 3)
            top_predictions = []
            for rank in range(3):
                idx = top_indices[rank].item()
                top_predictions.append(
                    {
                        "genre": class_names[idx],
                        "confidence": float(top_probs[rank].item()),
                    }
                )

        label = class_names[pred_idx]
        return {
            "predicted_genre": label,
            "genre": label,
            "confidence": confidence,
            "top_predictions": top_predictions,
        }
    except Exception as exc:
        detail = f"{type(exc).__name__}: {exc}"
        raise HTTPException(status_code=400, detail=detail) from exc
    finally:
        api_ms = (time.perf_counter() - api_start) * 1000
        log_prediction_performance(
            inference_ms=inference_ms,
            api_ms=api_ms,
            param_count=MODEL_PARAM_COUNT,
            memory_mb=MODEL_MEMORY_MB,
        )
        if os.path.exists(tmp_audio_path):
            os.remove(tmp_audio_path)
        if converted_wav_path and os.path.exists(converted_wav_path):
            os.remove(converted_wav_path)
