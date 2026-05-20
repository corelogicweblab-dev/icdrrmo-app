"""Train a small Keras risk scorer (6 features → score 0–100). Run before Docker build or locally."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import tensorflow as tf

OUT = Path(__file__).resolve().parent / "models"
OUT.mkdir(parents=True, exist_ok=True)

# Features: flood_prone, ops_flood, red_zone, rain_likely, precip_norm, open_incidents_norm
rng = np.random.default_rng(42)
n = 4000
x = rng.random((n, 6)).astype(np.float32)
weights = np.array([18, 28, 35, 22, 15, 12], dtype=np.float32)
y = np.clip(x @ weights + rng.normal(0, 4, n), 0, 100).astype(np.float32)

model = tf.keras.Sequential(
    [
        tf.keras.layers.Input(shape=(6,)),
        tf.keras.layers.Dense(16, activation="relu"),
        tf.keras.layers.Dense(8, activation="relu"),
        tf.keras.layers.Dense(1, activation="sigmoid"),
    ]
)
model.compile(optimizer="adam", loss="mse")
model.fit(x, y / 100.0, epochs=40, batch_size=64, verbose=1, validation_split=0.15)

model.save(OUT / "risk_model.keras")
(OUT / "feature_schema.json").write_text(
    json.dumps(
        {
            "features": [
                "is_flood_prone",
                "ops_flood_active",
                "ops_red_zone_active",
                "rain_likely",
                "max_precip_prob_norm",
                "open_incidents_norm",
            ],
            "output": "risk_score_0_100",
        },
        indent=2,
    ),
    encoding="utf-8",
)
print(f"Saved {OUT / 'risk_model.keras'}")
