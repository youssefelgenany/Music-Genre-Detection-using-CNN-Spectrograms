"""
Predict music genre from an audio file.

Usage:
    python predict_file.py "path/to/audio.wav"
"""

import argparse
import torch
import torch.nn as nn
from torchvision import models, transforms
from audio_pipeline import process_audio_file


MODEL_PATH = "models/music_genre_cnn.pth"
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


def predict_genre(audio_path: str) -> None:
    model, class_names = load_model_and_classes(MODEL_PATH)
    image = process_audio_file(audio_path)

    transform = transforms.Compose(
        [
            transforms.ToTensor(),
        ]
    )
    input_tensor = transform(image).unsqueeze(0).to("cpu")
    print("shape:", tuple(input_tensor.shape))
    print("min/max:", float(input_tensor.min()), float(input_tensor.max()))

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
