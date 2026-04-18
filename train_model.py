"""
Train a CNN to classify music genres from spectrogram images using PyTorch.

This script expects a folder structure like:

    spectrograms/
        blues/
            img1.png
            img2.png
            ...
        classical/
        ...

It uses torchvision's ImageFolder to load the spectrogram PNGs,
applies basic transforms, defines a simple CNN, and runs a training loop.

If a parallel raw-audio folder exists (e.g. genres_original/ mirroring spectrograms_10s/),
training can load waveforms, apply audio augmentation (train only), then build mel
spectrograms to match batch-generated PNGs. Validation uses clean audio with no augmentation.
"""

import matplotlib

# Interactive backend for end-of-run plots; TkAgg needs tkinter, Qt5Agg needs PyQt5/PySide.
_mpl_backend_set = False
for _mpl_backend in ("TkAgg", "Qt5Agg"):
    try:
        if _mpl_backend == "TkAgg":
            import tkinter  # noqa: F401
        matplotlib.use(_mpl_backend, force=True)
        _mpl_backend_set = True
        break
    except Exception:
        continue
if not _mpl_backend_set:
    matplotlib.use("Agg", force=True)

import matplotlib.pyplot as plt

import io
import os
import re
from typing import Dict, List, Optional, Tuple

import librosa
import librosa.display
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import torchvision
from torchvision import datasets, transforms, models
from torchvision.transforms import functional as TF


# -----------------------------
# Configuration / Hyperparameters
# -----------------------------

DATA_DIR = "spectrograms_10s"  # Root folder containing genre subfolders
# Raw audio for on-the-fly mel + audio aug (genre/<track>.wav|mp3|...). None = PNG only.
WAV_DATA_DIR: Optional[str] = "genres_original"
BATCH_SIZE = 16
NUM_EPOCHS = 30
# Smaller LR is better for fine-tuning pretrained networks
LEARNING_RATE = 5e-5
VAL_SPLIT = 0.2  # 20% of data for validation
RANDOM_SEED = 42
NUM_WORKERS = 2  # Use 0 when training with WAV+matplotlib rendering (safer on Windows)

# Mel params — must match batch_generate_spectrograms / generate_mel_spectrogram defaults
AUDIO_SR = 22050
SEGMENT_SECONDS = 10
N_MELS = 128
N_FFT = 2048
HOP_LENGTH = 512

# Training uses PNG spectrograms, not waveforms; effects approximate mic-style
# processing in image space (freq ≈ height, time ≈ width).
# Selection weights for augmentation types: noise, low-pass, echo, compression, volume.
AUG_TYPE_WEIGHTS = torch.tensor([0.5, 0.5, 0.3, 0.3, 0.5])
P_NUM_AUG_ONE = 0.5  # probability of applying 1 augmentation (else 2); never 0 or 3+


class MicLikeSpectrogramAugment:
    """
    Light mic-like degradations on spectrogram tensors [C, H, W].

    Each sample: randomly pick 1 or 2 *distinct* augmentations (weighted choice),
    never all five. Strengths are kept moderate so images stay realistic.
    """

    def __init__(self) -> None:
        self._aug_weights = AUG_TYPE_WEIGHTS.clone()

    def _apply_noise(self, x: torch.Tensor) -> torch.Tensor:
        return x + torch.randn_like(x) * 0.003

    def _apply_lowpass(self, x: torch.Tensor) -> torch.Tensor:
        return TF.gaussian_blur(x, kernel_size=[9, 3], sigma=[2.5, 0.6])

    def _apply_echo(self, x: torch.Tensor) -> torch.Tensor:
        # y + 0.15 * roll(y, 1500) → map 1500 samples @ 22050 Hz to width (~10 s PNG)
        _, _, w = x.shape
        shift = max(1, min(w - 1, int(w * 1500 / (22050.0 * 10.0))))
        return x + 0.15 * torch.roll(x, shifts=shift, dims=-1)

    def _apply_compression(self, x: torch.Tensor) -> torch.Tensor:
        return torch.tanh(x * 1.5)

    def _apply_volume(self, x: torch.Tensor) -> torch.Tensor:
        return x * float(torch.empty(1).uniform_(0.85, 1.15).item())

    def __call__(self, x: torch.Tensor) -> torch.Tensor:
        device = x.device
        w = self._aug_weights.to(device=device, dtype=torch.float32)
        k = 1 if torch.rand(1, device=device).item() < P_NUM_AUG_ONE else 2
        # Weighted sample of k distinct augmentation types (never all five at once)
        idx = torch.multinomial(w, num_samples=k, replacement=False)
        order = torch.randperm(k, device=device)
        handlers = (
            self._apply_noise,
            self._apply_lowpass,
            self._apply_echo,
            self._apply_compression,
            self._apply_volume,
        )
        for j in range(k):
            t = int(idx[order[j]].item())
            x = handlers[t](x)
        return torch.clamp(x, 0.0, 1.0)


def resolve_wav_root(explicit: Optional[str]) -> Optional[str]:
    """Return first existing raw-audio root, or None."""
    candidates: List[Optional[str]] = [explicit, "genres_original", os.path.join("dataset", "genres_original")]
    for c in candidates:
        if c and os.path.isdir(c):
            return c
    return None


def parse_spectrogram_png_name(
    png_path: str,
) -> Optional[Tuple[str, str, int]]:
    """
    Parse spectrogram PNG path into (genre, song_base, part_index_1based).

    Expects names like: <song_base>_part3.png
    """
    filename = os.path.basename(png_path)
    m = re.match(r"^(.+)_part(\d+)\.(png|jpg|jpeg)$", filename, re.IGNORECASE)
    if not m:
        return None
    song_base = m.group(1)
    part_idx = int(m.group(2))
    genre = os.path.basename(os.path.dirname(png_path))
    return genre, song_base, part_idx


def find_audio_file(wav_root: str, genre: str, song_base: str) -> Optional[str]:
    gdir = os.path.join(wav_root, genre)
    if not os.path.isdir(gdir):
        return None
    for ext in (".wav", ".mp3", ".flac", ".ogg", ".au", ".m4a"):
        p = os.path.join(gdir, song_base + ext)
        if os.path.isfile(p):
            return p
    return None


def load_wav_segment_flat(
    audio_path: str, part_index_1based: int, sr: int, segment_seconds: int
) -> np.ndarray:
    """Load one fixed-length segment matching batch_generate_spectrograms indexing."""
    y_full, _ = librosa.load(audio_path, sr=sr, mono=True)
    n = segment_seconds * sr
    start = (part_index_1based - 1) * n
    end = start + n
    if start >= len(y_full):
        seg = np.zeros(n, dtype=np.float32)
    else:
        seg = np.asarray(y_full[start : min(end, len(y_full))], dtype=np.float32)
    if len(seg) < n:
        seg = np.pad(seg, (0, n - len(seg)), mode="constant")
    return seg.astype(np.float32)


def augment_audio_waveform(y: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Train-only: Gaussian noise, random gain, small circular time shift."""
    x = np.asarray(y, dtype=np.float32)
    x = x + rng.normal(0.0, 0.002, size=x.shape).astype(np.float32)
    x = x * float(rng.uniform(0.85, 1.15))
    max_shift = int(0.18 * AUDIO_SR)
    shift = int(rng.integers(-max_shift, max_shift + 1))
    if shift != 0:
        x = np.roll(x, shift)
    return np.clip(x, -1.0, 1.0).astype(np.float32)


def waveform_to_mel_rgb_pil(y: np.ndarray, sr: int) -> Image.Image:
    """
    Mel -> PNG-style RGB image (same rendering style as save_spectrogram in generate_mel_spectrogram).
    """
    mel = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_mels=N_MELS,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )
    mel_db = librosa.power_to_db(mel, ref=np.max)
    fig, ax = plt.subplots(figsize=(12, 6))
    librosa.display.specshow(
        mel_db,
        x_axis=None,
        y_axis=None,
        sr=sr,
        hop_length=HOP_LENGTH,
        cmap="magma",
        ax=ax,
    )
    ax.set_axis_off()
    fig.tight_layout(pad=0)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=300, bbox_inches="tight", pad_inches=0)
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf).convert("RGB")


class AudioSpectrogramSubset(torch.utils.data.Dataset):
    """
    Like SpectrogramSubset, but prefers loading the matching raw-audio segment,
    optionally applying audio augmentation (train), then building a mel spectrogram image.

    Falls back to PNG + transform_png if the WAV cannot be resolved.
    """

    def __init__(
        self,
        base_dataset: datasets.ImageFolder,
        indices: torch.Tensor,
        wav_root: str,
        augment_audio: bool,
        transform_from_audio: transforms.Compose,
        transform_from_png: transforms.Compose,
    ) -> None:
        self.base_dataset = base_dataset
        self.indices = indices
        self.wav_root = wav_root
        self.augment_audio = augment_audio
        self.transform_from_audio = transform_from_audio
        self.transform_from_png = transform_from_png

    def __len__(self) -> int:  # type: ignore[override]
        return len(self.indices)

    def __getitem__(self, idx: int):  # type: ignore[override]
        path, label = self.base_dataset.samples[self.indices[idx]]
        parsed = parse_spectrogram_png_name(path)
        if parsed is not None:
            genre, song_base, part_idx = parsed
            audio_path = find_audio_file(self.wav_root, genre, song_base)
            if audio_path is not None:
                y = load_wav_segment_flat(
                    audio_path, part_idx, AUDIO_SR, SEGMENT_SECONDS
                )
                if self.augment_audio:
                    rng = np.random.default_rng()
                    y = augment_audio_waveform(y, rng)
                pil_img = waveform_to_mel_rgb_pil(y, AUDIO_SR)
                return self.transform_from_audio(pil_img), label

        image = self.base_dataset.loader(path)
        return self.transform_from_png(image), label


class SpectrogramSubset(torch.utils.data.Dataset):
    """
    Wraps an ImageFolder-style dataset with a subset of indices and a transform.

    This allows us to use different transforms for training and validation
    while sharing the same underlying file list.
    """

    def __init__(self, base_dataset: datasets.ImageFolder, indices: torch.Tensor, transform):
        self.base_dataset = base_dataset
        self.indices = indices
        self.transform = transform

    def __len__(self) -> int:  # type: ignore[override]
        return len(self.indices)

    def __getitem__(self, idx: int):  # type: ignore[override]
        path, label = self.base_dataset.samples[self.indices[idx]]
        image = self.base_dataset.loader(path)
        if self.transform is not None:
            image = self.transform(image)
        return image, label


# -----------------------------
# Data transforms and loaders
# -----------------------------

def get_dataloaders(
    data_dir: str,
    batch_size: int = BATCH_SIZE,
    val_split: float = VAL_SPLIT,
    num_workers: int = NUM_WORKERS,
    wav_data_dir: Optional[str] = WAV_DATA_DIR,
) -> Tuple[DataLoader, DataLoader, list]:
    """
    Create training and validation dataloaders from spectrogram images.

    If ``wav_data_dir`` resolves to an existing folder (e.g. genres_original/), training
    loads matching waveforms, applies **audio** augmentation on the waveform (train only),
    then builds mel spectrograms. Validation uses clean waveforms with no augmentation.
    Otherwise falls back to pre-rendered PNGs + image-space augmentation (train only).
    """
    # PNG path: image-space mic-like aug on train only
    train_transform_png = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            MicLikeSpectrogramAugment(),
        ]
    )
    val_transform_png = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
        ]
    )
    # WAV path: audio aug is applied before mel; only resize + tensorize the image
    transform_mel_image = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
        ]
    )

    wav_root = resolve_wav_root(wav_data_dir)
    workers_train = num_workers
    workers_val = num_workers
    if wav_root is not None:
        print(
            f"WAV root found: {wav_root} — on-the-fly mel + audio aug (train). "
            f"Setting DataLoader num_workers=0 for stable matplotlib rendering."
        )
        workers_train = 0
        workers_val = 0
    else:
        print(
            "No WAV root found — training from pre-rendered PNGs only "
            "(set WAV_DATA_DIR or add genres_original/)."
        )

    # Base dataset (no transform yet)
    base_dataset = datasets.ImageFolder(root=data_dir)
    class_names = base_dataset.classes
    print(f"Found {len(base_dataset)} images across {len(class_names)} genres: {class_names}")

    # Deterministic train/val split by original song (before "_part")
    # to avoid leakage between train and validation sets.
    song_to_indices: Dict[str, List[int]] = {}
    for sample_idx, (path, label) in enumerate(base_dataset.samples):
        filename = os.path.basename(path)
        song_base = filename.split("_part", maxsplit=1)[0]
        song_id = f"{base_dataset.classes[label]}/{song_base}"
        song_to_indices.setdefault(song_id, []).append(sample_idx)

    unique_song_ids = sorted(song_to_indices.keys())
    torch.manual_seed(RANDOM_SEED)
    shuffled_song_order = torch.randperm(len(unique_song_ids)).tolist()
    shuffled_song_ids = [unique_song_ids[i] for i in shuffled_song_order]

    val_song_count = int(len(unique_song_ids) * val_split)
    val_song_ids = set(shuffled_song_ids[:val_song_count])
    train_song_ids = set(shuffled_song_ids[val_song_count:])

    if train_song_ids & val_song_ids:
        raise RuntimeError("Data leakage detected: train/validation song overlap.")

    train_index_list: List[int] = []
    val_index_list: List[int] = []
    for song_id, sample_indices in song_to_indices.items():
        if song_id in val_song_ids:
            val_index_list.extend(sample_indices)
        else:
            train_index_list.extend(sample_indices)

    train_indices = torch.tensor(train_index_list, dtype=torch.long)
    val_indices = torch.tensor(val_index_list, dtype=torch.long)

    print(
        f"Split by songs: {len(train_song_ids)} train songs, "
        f"{len(val_song_ids)} val songs."
    )
    print(
        f"Split by images: {len(train_indices)} train images, "
        f"{len(val_indices)} val images."
    )

    if wav_root is not None:
        train_dataset = AudioSpectrogramSubset(
            base_dataset,
            train_indices,
            wav_root=wav_root,
            augment_audio=True,
            transform_from_audio=transform_mel_image,
            transform_from_png=train_transform_png,
        )
        val_dataset = AudioSpectrogramSubset(
            base_dataset,
            val_indices,
            wav_root=wav_root,
            augment_audio=False,
            transform_from_audio=transform_mel_image,
            transform_from_png=val_transform_png,
        )
    else:
        train_dataset = SpectrogramSubset(
            base_dataset, train_indices, transform=train_transform_png
        )
        val_dataset = SpectrogramSubset(
            base_dataset, val_indices, transform=val_transform_png
        )

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=workers_train,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=workers_val,
    )

    return train_loader, val_loader, class_names


# -----------------------------
# CNN model definition
# -----------------------------

class MusicGenreCNN(nn.Module):
    """
    Custom Convolutional Neural Network for music genre classification.

    Architecture:
      - 3 convolution layers (Conv2d) with ReLU activations
      - MaxPooling layers after each conv block
      - Flatten layer
      - Fully connected layers
      - Output layer with 10 classes (one per genre)
    """

    def __init__(self, num_classes: int = 10) -> None:
        super().__init__()

        # Feature extractor: 3 convolutional blocks
        self.features = nn.Sequential(
            # Block 1: input 3 x 224 x 224 -> 16 x 112 x 112
            nn.Conv2d(in_channels=3, out_channels=16, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),

            # Block 2: 16 x 112 x 112 -> 32 x 56 x 56
            nn.Conv2d(in_channels=16, out_channels=32, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),

            # Block 3: 32 x 56 x 56 -> 64 x 28 x 28
            nn.Conv2d(in_channels=32, out_channels=64, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )

        # After 3 blocks, feature map size is 64 x 28 x 28
        flattened_dim = 64 * 28 * 28

        # Classifier: fully connected layers + output
        self.classifier = nn.Sequential(
            nn.Flatten(),                     # Flatten feature maps
            nn.Linear(flattened_dim, 256),    # First FC layer
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),      # Output layer (10 classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass: input image tensor -> class logits.
        """
        x = self.features(x)
        x = self.classifier(x)
        return x


# -----------------------------
# Training and validation loops
# -----------------------------

def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    device: torch.device,
) -> Tuple[float, float]:
    """
    Train the model for one epoch.

    Returns:
        (train_loss, train_accuracy)
    """
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (inputs, targets) in enumerate(dataloader, start=1):
        inputs = inputs.to(device)
        targets = targets.to(device)

        # Forward pass
        outputs = model(inputs)
        loss = criterion(outputs, targets)

        # Backward + optimize
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        running_loss += loss.item()

        # Compute training accuracy
        _, predicted = torch.max(outputs, dim=1)
        total += targets.size(0)
        correct += (predicted == targets).sum().item()

    epoch_loss = running_loss / max(len(dataloader), 1)
    epoch_acc = correct / max(total, 1)
    return epoch_loss, epoch_acc


def evaluate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float]:
    """
    Evaluate the model on the validation set.

    Returns:
        (val_loss, val_accuracy)
    """
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for inputs, targets in dataloader:
            inputs = inputs.to(device)
            targets = targets.to(device)

            outputs = model(inputs)
            loss = criterion(outputs, targets)

            running_loss += loss.item()

            # Compute accuracy
            _, predicted = torch.max(outputs, dim=1)
            total += targets.size(0)
            correct += (predicted == targets).sum().item()

    val_loss = running_loss / max(len(dataloader), 1)
    val_acc = correct / max(total, 1)
    return val_loss, val_acc


# -----------------------------
# Main training script
# -----------------------------

def main() -> None:
    """
    Entry point for training the CNN on spectrogram images.
    """
    # Pick device: use GPU if available, else CPU
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    if not os.path.isdir(DATA_DIR):
        raise FileNotFoundError(
            f"Spectrogram directory '{DATA_DIR}' not found. "
            f"Make sure you've generated spectrograms first."
        )

    # Create dataloaders
    train_loader, val_loader, class_names = get_dataloaders(DATA_DIR)

    # Create model, loss function, and optimizer
    # Use a pretrained ResNet18 backbone for stronger features.
    # We:
    #   - load ImageNet weights
    #   - freeze early layers (conv1/bn1/layer1)
    #   - fine-tune deeper layers (layer2+ and classifier)
    #   - replace the final fully connected layer with a 10-class classifier
    base_model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
    # Fully fine-tune all layers.
    for param in base_model.parameters():
        param.requires_grad = True

    num_features = base_model.fc.in_features
    base_model.fc = nn.Linear(num_features, len(class_names))
    model = base_model.to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LEARNING_RATE,
        weight_decay=1e-4,
    )

    train_losses = []
    train_accs = []
    val_losses = []
    val_accs = []

    # Early stopping settings
    patience = 5
    best_val_acc = 0.0
    epochs_no_improve = 0
    best_state = None

    for epoch in range(1, NUM_EPOCHS + 1):
        current_lr = optimizer.param_groups[0]["lr"]
        print(f"\nEpoch {epoch}/{NUM_EPOCHS}")
        print(f"  Learning rate: {current_lr:.6f}")

        # One full pass over the training set
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, device
        )
        # Evaluate on the validation set
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)

        train_losses.append(train_loss)
        train_accs.append(train_acc)
        val_losses.append(val_loss)
        val_accs.append(val_acc)

        print(f"  Train loss: {train_loss:.4f} | Train acc: {train_acc:.4f}")
        print(f"  Val   loss: {val_loss:.4f} | Val   acc: {val_acc:.4f}")

        # Track best model based on validation accuracy
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            epochs_no_improve = 0
            best_state = {
                "model_state_dict": model.state_dict(),
                "class_names": class_names,
            }
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                print(f"Early stopping: no improvement in val accuracy for {patience} epochs.")
                break

    # -----------------------------
    # Final validation summary (on best model)
    # -----------------------------
    if best_state is not None:
        model.load_state_dict(best_state["model_state_dict"])

    final_val_loss, final_val_acc = evaluate(model, val_loader, criterion, device)
    print(f"\nFinal validation loss: {final_val_loss:.4f}")
    print(f"Final validation accuracy: {final_val_acc:.4f}")

    # -----------------------------
    # Plot training curves
    # -----------------------------
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))

    axes[0].plot(train_losses, label="Train loss")
    axes[0].plot(val_losses, label="Val loss")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Loss")
    axes[0].set_title("Loss curves")
    axes[0].legend()

    axes[1].plot(train_accs, label="Train accuracy")
    axes[1].plot(val_accs, label="Val accuracy")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Accuracy")
    axes[1].set_title("Accuracy")
    axes[1].legend()

    fig.tight_layout()
    os.makedirs("models", exist_ok=True)
    curve_path = os.path.join("models", "training_curves.png")
    fig.savefig(curve_path, dpi=150, bbox_inches="tight")
    print(f"Training curves saved to: {curve_path}")
    plt.close(fig)
    plt.show()

    # -----------------------------
    # Save the trained model
    # -----------------------------
    # Save trained CNN weights (best model) so we can reuse them later for inference
    os.makedirs("models", exist_ok=True)
    model_path = os.path.join("models", "music_genre_cnn.pth")
    save_payload = {
        "model_state_dict": model.state_dict(),
        "class_names": class_names,
        "best_val_accuracy": final_val_acc,
    }
    torch.save(save_payload, model_path)
    print(f"\nModel saved to: {model_path}")


if __name__ == "__main__":
    main()

