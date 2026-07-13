"""
Build and save a confusion matrix from a trained checkpoint without retraining.

Uses the same song-level validation split and preprocessing as `train_model.py`
(`get_dataloaders`).

Usage:
    python generate_confusion_matrix.py

Writes `classification_report.txt` (override with ``--report``) and
``confusion_matrix.png`` (override with ``--out``).

Requires:
    - `models/music_genre_cnn.pth` (or pass --checkpoint)
    - `spectrograms_10s/` (or the same `DATA_DIR` as training) on disk
"""

import argparse
import inspect
import os
from typing import List, Tuple

# Backend before `matplotlib.pyplot` (train_model imports pyplot; keep that order here too).
import matplotlib

matplotlib.use("TkAgg")
from train_model import DATA_DIR, collect_val_labels, get_dataloaders

import torch
import torch.nn as nn
import matplotlib.pyplot as plt
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    classification_report,
    confusion_matrix,
)
from torchvision import models

DEFAULT_CHECKPOINT = os.path.join("models", "music_genre_cnn.pth")
DEFAULT_OUT = "confusion_matrix.png"
DEFAULT_REPORT = "classification_report.txt"


def _load_checkpoint(path: str, device: torch.device) -> dict:
    load_sig = inspect.signature(torch.load)
    if "weights_only" in load_sig.parameters:
        return torch.load(path, map_location=device, weights_only=False)  # type: ignore[call-overload]
    return torch.load(path, map_location=device)  # type: ignore[call-overload]


def load_model(
    checkpoint_path: str, device: torch.device
) -> Tuple[nn.Module, List[str]]:
    if not os.path.isfile(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")

    checkpoint = _load_checkpoint(checkpoint_path, device)
    if "model_state_dict" not in checkpoint or "class_names" not in checkpoint:
        raise KeyError(
            "Expected checkpoint keys: 'model_state_dict', 'class_names' "
            f"(found: {list(checkpoint.keys())})"
        )

    class_names = list(checkpoint["class_names"])
    model = models.resnet18(weights=None)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, len(class_names))
    model.load_state_dict(checkpoint["model_state_dict"], strict=True)
    model = model.to(device)
    model.eval()
    return model, class_names


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Confusion matrix from a saved ResNet18 genre model (no training)."
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default=DEFAULT_CHECKPOINT,
        help="Path to music_genre_cnn.pth",
    )
    parser.add_argument(
        "--out",
        type=str,
        default=DEFAULT_OUT,
        help="Output path for the confusion matrix image",
    )
    parser.add_argument(
        "--report",
        type=str,
        default=DEFAULT_REPORT,
        help="Output path for the classification report text file",
    )
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    if not os.path.isdir(DATA_DIR):
        raise FileNotFoundError(
            f"Data directory not found: {DATA_DIR!r}. Use the same folder as in training."
        )

    # Same split, transforms, and batching as `train_model.main`.
    _train_loader, val_loader, class_names_data = get_dataloaders(DATA_DIR)

    model, class_names_ck = load_model(args.checkpoint, device)

    if class_names_data != class_names_ck:
        raise ValueError(
            "class_names from ImageFolder must match the saved checkpoint. "
            f"Data ({DATA_DIR!r}): {class_names_data!r}. "
            f"Checkpoint: {class_names_ck!r}. Use the same spectrogram root as training."
        )
    y_true, y_pred = collect_val_labels(model, val_loader, device)

    report = classification_report(
        y_true,
        y_pred,
        target_names=class_names_ck,
        digits=4,
    )
    print(report)
    with open(args.report, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"Saved: {os.path.abspath(args.report)}")

    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(10, 10))
    disp = ConfusionMatrixDisplay(
        confusion_matrix=cm, display_labels=class_names_ck
    )
    disp.plot(cmap="Blues", ax=ax, xticks_rotation=45.0)
    plt.tight_layout()
    plt.savefig(args.out, dpi=150, bbox_inches="tight")
    print(f"Saved: {os.path.abspath(args.out)}")
    plt.show()


if __name__ == "__main__":
    main()
