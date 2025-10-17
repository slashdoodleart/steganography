"""Feature-based machine learning detectors."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Tuple

import joblib
import numpy as np
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

from ..core.interfaces import Detector
from ..core.logging import log_operation

_MODEL_PATH = Path("artifacts/ml_detector.joblib")


def _extract_features(image_path: Path) -> np.ndarray:
    with Image.open(image_path) as image:
        data = np.array(image.convert("L"))
    hist, _ = np.histogram(data, bins=64, range=(0, 256), density=True)
    diff = np.diff(data.astype(np.int16), axis=1)
    coefs = np.histogram(diff, bins=32, range=(-32, 32), density=True)[0]
    return np.concatenate([hist, coefs])


@dataclass
class MLDetector(Detector):
    name: str = "ml-baseline"
    carrier: str = "image"

    def __post_init__(self) -> None:
        _MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        if _MODEL_PATH.exists():
            self.model = joblib.load(_MODEL_PATH)
        else:
            self.model = LogisticRegression(max_iter=200)

    def fit(self, cover_paths: Tuple[Path, ...], stego_paths: Tuple[Path, ...]) -> Dict[str, Any]:
        X = np.vstack([_extract_features(path) for path in (*cover_paths, *stego_paths)])
        y = np.array([0] * len(cover_paths) + [1] * len(stego_paths))
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
        self.model.fit(X_train, y_train)
        probs = self.model.predict_proba(X_test)[:, 1]
        auc = roc_auc_score(y_test, probs)
        joblib.dump(self.model, _MODEL_PATH)
        metrics = {
            "roc_auc": float(auc),
            "samples": int(len(X)),
        }
        log_operation("ml_detector_fit", **metrics)
        return metrics

    def detect(self, stego_path: str, **options: Any) -> Dict[str, Any]:
        feature = _extract_features(Path(stego_path)).reshape(1, -1)
        probability = float(self.model.predict_proba(feature)[0, 1])
        result = {
            "probability": probability,
            "threshold_flag": probability > 0.5,
        }
        log_operation("ml_detector_detect", stego_path=stego_path, **result)
        return result
