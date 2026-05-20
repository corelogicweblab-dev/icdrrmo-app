"""TensorFlow risk inference microservice for ICDRRMO command center."""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import tensorflow as tf
from fastapi import FastAPI
from pydantic import BaseModel, Field

MODEL_PATH = Path(os.getenv("RISK_MODEL_PATH", Path(__file__).parent / "models" / "risk_model.keras"))
model = tf.keras.models.load_model(MODEL_PATH) if MODEL_PATH.exists() else None

app = FastAPI(title="ICDRRMO Risk Inference", version="1.0.0")


class BarangayFeatures(BaseModel):
    barangay_id: str
    name: str
    is_flood_prone: bool = False
    ops_flood_active: bool = False
    ops_red_zone_active: bool = False


class PredictRequest(BaseModel):
    rain_likely: bool = False
    max_precip_prob_pct: float = Field(0, ge=0, le=100)
    open_incidents_city: int = Field(0, ge=0)
    barangays: list[BarangayFeatures]


class RiskScore(BaseModel):
    barangay_id: str
    name: str
    score: int
    level: str
    engine: str = "tensorflow-keras-v1"


def _level(score: int) -> str:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 30:
        return "moderate"
    return "routine"


def _vec(b: BarangayFeatures, rain_likely: bool, precip: float, open_norm: float) -> np.ndarray:
    return np.array(
        [
            [
                1.0 if b.is_flood_prone else 0.0,
                1.0 if b.ops_flood_active else 0.0,
                1.0 if b.ops_red_zone_active else 0.0,
                1.0 if rain_likely else 0.0,
                min(1.0, precip / 100.0),
                open_norm,
            ]
        ],
        dtype=np.float32,
    )


@app.get("/health")
def health():
    return {"ok": True, "model_loaded": model is not None}


@app.post("/predict", response_model=list[RiskScore])
def predict(body: PredictRequest):
    open_norm = min(1.0, body.open_incidents_city / 25.0)
    out: list[RiskScore] = []
    for b in body.barangays:
        if model is None:
            score = int(
                min(
                    100,
                    (18 if b.is_flood_prone else 0)
                    + (28 if b.ops_flood_active else 0)
                    + (35 if b.ops_red_zone_active else 0)
                    + (22 if body.rain_likely else 0)
                    + int(body.max_precip_prob_pct * 0.15)
                    + int(open_norm * 12),
                )
            )
            engine = "rules-fallback"
        else:
            pred = model.predict(_vec(b, body.rain_likely, body.max_precip_prob_pct, open_norm), verbose=0)
            score = int(round(float(pred[0][0]) * 100))
            engine = "tensorflow-keras-v1"
        out.append(
            RiskScore(
                barangay_id=b.barangay_id,
                name=b.name,
                score=score,
                level=_level(score),
                engine=engine,
            )
        )
    return out
