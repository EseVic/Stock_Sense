"""
StockSense ML Service - Flask API
"""

from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import os
import json

from train import (
    train_all_models,
    FEATURE_COLS,
    CUSTOMER_CATEGORICAL_FEATURES,
)

app = Flask(__name__)
CORS(app)

# Use this value to confirm that newly deployed version is active.
SERVICE_VERSION = "phase1-preference-categorical-v4"

MODELS = {}


def safe_int(value, default=0):
    """
    Convert incoming values safely into integers.
    """
    try:
        if value is None:
            return default

        return int(float(value))

    except (TypeError, ValueError):
        return default


def calculate_days_to_expiry(record):
    """
    Calculate the number of calendar days remaining.

    Positive number:
        Expiry date is still in the future.

    Zero:
        Product expires today.

    Negative number:
        Expiry date has passed.
    """

    supplied_days = safe_int(
        record.get("days_to_expiry"),
        9999,
    )

    # The simulator is allowed to override the real expiry date.
    if record.get("use_days_to_expiry_override") is True:
        return supplied_days

    expiry_date = record.get("expiry_date")

    if not expiry_date:
        return 9999

    try:
        expiry_day = datetime.strptime(
            str(expiry_date)[:10],
            "%Y-%m-%d",
        ).date()

        today = datetime.now(timezone.utc).date()

        return (expiry_day - today).days

    except (TypeError, ValueError):
        # If parsing fails, use the value calculated by Node backend.
        return supplied_days


def normalise_record(record):
    """
    Recalculate date-dependent fields inside the ML service.

    This provides an extra safety check even if the backend
    sends an old database value.
    """

    clean = dict(record)

    days_left = calculate_days_to_expiry(clean)

    has_expiry = (
        bool(clean.get("expiry_date"))
        and days_left != 9999
    )

    shelf_life = max(
        safe_int(
            clean.get("shelf_life_days"),
            30,
        ),
        1,
    )

    clean["days_to_expiry"] = (
        days_left if has_expiry else 9999
    )

    clean["has_expiry"] = has_expiry

    clean["shelf_utilisation"] = (
        round(
            1 - (days_left / shelf_life),
            4,
        )
        if has_expiry
        else 0
    )

    return clean


def get_live_expiry_status(record):
    """
    Return the factual, current status derived from the product's live date.

    The research classifier is still evaluated and returned for audit, but an
    operational application must not call a product with 171 days remaining
    "Expired" because a historical classifier favours its majority class.
    """

    if not record.get("has_expiry"):
        return "N/A"

    days_left = safe_int(record.get("days_to_expiry"), 9999)

    if days_left < 0:
        return "Expired"
    if days_left <= 7:
        return "High"
    if days_left <= 30:
        return "Medium"
    return "Low"


def get_expiry_urgency(record):
    """
    Convert live days remaining into a 0-100 operational urgency score.

    This is deliberately named urgency, not model confidence. It gives the
    prediction card a meaningful visual scale without pretending a factual
    date calculation has a probabilistic confidence.
    """

    if not record.get("has_expiry"):
        return None

    days_left = safe_int(record.get("days_to_expiry"), 9999)
    shelf_life = max(safe_int(record.get("shelf_life_days"), 365), 1)

    if days_left < 0:
        return 100.0
    if days_left <= 7:
        return round(85 + ((7 - days_left) / 7) * 14, 1)
    if days_left <= 30:
        return round(50 + ((30 - days_left) / 23) * 34, 1)

    remaining_fraction = min(max(days_left / shelf_life, 0), 1)
    return round(max(5, 40 * (1 - remaining_fraction)), 1)


def load_models():
    """
    Load all trained ML objects into memory.
    """

    # Clear old objects before reloading after training.
    MODELS.clear()

    model_dir = "models"

    os.makedirs(
        model_dir,
        exist_ok=True,
    )

    tasks = [
        "expiry_risk",
        "sales_velocity",
        "customer_preference",
        "slow_mover",
    ]

    for task in tasks:
        for model_type in ["dt", "lr"]:
            path = (
                f"{model_dir}/"
                f"{task}_{model_type}.pkl"
            )

            if os.path.exists(path):
                MODELS[
                    f"{task}_{model_type}"
                ] = joblib.load(path)

        scaler_path = (
            f"{model_dir}/"
            f"{task}_scaler.pkl"
        )

        if os.path.exists(scaler_path):
            MODELS[
                f"{task}_scaler"
            ] = joblib.load(scaler_path)

        features_path = (
            f"{model_dir}/"
            f"{task}_features.pkl"
        )

        if os.path.exists(features_path):
            MODELS[
                f"{task}_features"
            ] = joblib.load(features_path)

        preprocessor_path = (
            f"{model_dir}/"
            f"{task}_preprocessor.pkl"
        )

        if os.path.exists(preprocessor_path):
            MODELS[
                f"{task}_preprocessor"
            ] = joblib.load(preprocessor_path)

    encoders_path = (
        f"{model_dir}/encoders.pkl"
    )

    if os.path.exists(encoders_path):
        MODELS["encoders"] = joblib.load(
            encoders_path
        )

    metrics_path = f"{model_dir}/metrics.json"

    if os.path.exists(metrics_path):
        with open(metrics_path, encoding="utf-8") as file:
            MODELS["metrics"] = json.load(file)

    print(
        f"Loaded {len(MODELS)} model objects"
    )


@app.route("/health", methods=["GET"])
def health():
    """
    Health endpoint.

    Check this after deployment to confirm that the new code is live.
    """

    return jsonify(
        {
            "status": "ok",
            "service_version": SERVICE_VERSION,
            "models_loaded": len(MODELS),
        }
    )


@app.route("/train", methods=["POST"])
def train():
    """
    Retrain all models and reload them.
    """

    try:
        result = train_all_models()

        load_models()

        return jsonify(
            {
                "status": "success",
                "metrics": result,
            }
        )

    except Exception as e:
        return jsonify(
            {
                "status": "error",
                "message": str(e),
            }
        ), 500


@app.route("/predict", methods=["POST"])
def predict():
    """
    Run predictions for one or more inventory records.
    """

    try:
        data = request.get_json(
            silent=True
        ) or {}

        records = data.get(
            "records",
            [],
        )

        if not records:
            return jsonify(
                {
                    "error": "No records provided",
                }
            ), 400

        # Recalculate expiry fields inside Python as an additional safety check.
        records = [
            normalise_record(record)
            for record in records
        ]

        df = pd.DataFrame(records)

        for col in FEATURE_COLS:
            if col not in df.columns:
                df[col] = 0

        df[FEATURE_COLS] = (
            df[FEATURE_COLS]
            .fillna(0)
        )

        tasks = [
            "expiry_risk",
            "sales_velocity",
            "customer_preference",
            "slow_mover",
        ]

        encoders = MODELS.get(
            "encoders",
            {},
        )

        results = []

        for index, record in enumerate(records):
            row_result = {
                "product_name": record.get(
                    "product_name",
                    f"Product {index + 1}",
                ),

                # Useful when debugging API responses.
                "days_to_expiry": record.get(
                    "days_to_expiry"
                ),

                "predictions": {},
            }

            for task in tasks:
                # Products without expiry dates must return N/A.
                if (
                    task == "expiry_risk"
                    and not record.get("has_expiry")
                ):
                    row_result["predictions"][task] = {
                        "label": "N/A",
                        "confidence": None,

                        "dt": {
                            "label": "N/A",
                            "confidence": None,
                        },

                        "lr": {
                            "label": "N/A",
                            "confidence": None,
                        },

                        "model": None,
                        "not_applicable": True,
                        "urgency": None,

                        "recommendation":
                            get_recommendation(
                                task,
                                "N/A",
                                record,
                            ),
                    }

                    continue

                dt_key = f"{task}_dt"
                lr_key = f"{task}_lr"

                scaler = MODELS.get(
                    f"{task}_scaler"
                )

                feat_cols = MODELS.get(
                    f"{task}_features",
                    FEATURE_COLS,
                )

                encoder = encoders.get(task)

                task_df = df.copy()

                for col in feat_cols:
                    if col not in task_df.columns:
                        task_df[col] = (
                            "Unknown"
                            if col in CUSTOMER_CATEGORICAL_FEATURES
                            else 0
                        )

                x_frame = task_df[feat_cols].copy()
                for col in feat_cols:
                    if col in CUSTOMER_CATEGORICAL_FEATURES:
                        x_frame[col] = (
                            x_frame[col]
                            .fillna("Unknown")
                            .astype(str)
                        )
                    else:
                        x_frame[col] = x_frame[col].fillna(0)

                preprocessor = MODELS.get(
                    f"{task}_preprocessor"
                )

                if preprocessor:
                    x_raw = preprocessor.transform(x_frame)
                    x_scaled = x_raw
                else:
                    x_raw = x_frame.to_numpy()
                    x_scaled = (
                        scaler.transform(x_frame)
                        if scaler
                        else x_raw
                    )

                dt_pred = None
                lr_pred = None
                dt_conf = None
                lr_conf = None

                if dt_key in MODELS:
                    raw = MODELS[
                        dt_key
                    ].predict(
                        [x_raw[index]]
                    )[0]

                    probs = MODELS[
                        dt_key
                    ].predict_proba(
                        [x_raw[index]]
                    )[0]

                    dt_pred = (
                        encoder.inverse_transform(
                            [raw]
                        )[0]
                        if encoder
                        else str(raw)
                    )

                    dt_conf = round(
                        float(max(probs)) * 100,
                        1,
                    )

                if lr_key in MODELS:
                    raw = MODELS[
                        lr_key
                    ].predict(
                        [x_scaled[index]]
                    )[0]

                    probs = MODELS[
                        lr_key
                    ].predict_proba(
                        [x_scaled[index]]
                    )[0]

                    lr_pred = (
                        encoder.inverse_transform(
                            [raw]
                        )[0]
                        if encoder
                        else str(raw)
                    )

                    lr_conf = round(
                        float(max(probs)) * 100,
                        1,
                    )

                # Use the model selected during evaluation instead of always
                # preferring the Decision Tree simply because it is present.
                best_model = (
                    MODELS.get("metrics", {})
                    .get(task, {})
                    .get("best_model", "Decision Tree")
                )

                if (
                    best_model == "Logistic Regression"
                    and lr_pred is not None
                ):
                    primary = lr_pred
                    confidence = lr_conf or 0
                    selected_model = "Logistic Regression"
                else:
                    primary = dt_pred if dt_pred is not None else lr_pred
                    confidence = dt_conf if dt_pred is not None else (lr_conf or 0)
                    selected_model = (
                        "Decision Tree"
                        if dt_pred is not None
                        else "Logistic Regression"
                    )

                ml_assessment = None
                urgency = None

                if task == "expiry_risk":
                    ml_assessment = {
                        "label": primary,
                        "confidence": confidence,
                        "model": selected_model,
                    }
                    primary = get_live_expiry_status(record)
                    confidence = None
                    selected_model = "Live expiry date"
                    urgency = get_expiry_urgency(record)

                row_result["predictions"][task] = {
                    "label": primary,

                    "confidence": confidence,

                    "dt": {
                        "label": dt_pred,
                        "confidence": dt_conf,
                    },

                    "lr": {
                        "label": lr_pred,
                        "confidence": lr_conf,
                    },

                    "model": selected_model,
                    "not_applicable": False,
                    "ml_assessment": ml_assessment,
                    "urgency": urgency,

                    "recommendation":
                        get_recommendation(
                            task,
                            primary,
                            record,
                        ),
                }

            results.append(row_result)

        return jsonify(
            {
                "status": "success",
                "results": results,
            }
        )

    except Exception as e:
        import traceback

        # Keep the diagnostic on the server. Returning a Python stack trace to
        # browsers exposes internal paths and implementation details.
        traceback.print_exc()

        return jsonify(
            {
                "error": str(e),
            }
        ), 500


def get_recommendation(task, label, record):
    """
    Return the user-facing recommendation for each prediction.
    """

    name = record.get(
        "product_name",
        "This product",
    )

    qty = record.get(
        "qty_remaining",
        0,
    )

    recs = {
        "expiry_risk": {
            "High":
                f"⚠️ Discount {name} immediately. "
                f"Expiry is very close with {qty} units still on shelf.",

            "Medium":
                f"📋 Monitor {name} closely this week. "
                f"Consider a small discount to move stock faster.",

            "Low":
                f"✅ {name} expiry is not a concern right now. "
                f"Continue normal sales.",

            "Expired":
                f"🚫 Remove {name} from shelf immediately. "
                f"This batch has expired.",

            "N/A":
                f"✅ {name} has no expiry date. "
                f"No expiry risk applies.",
        },

        "sales_velocity": {
            "Fast":
                f"🚀 {name} is selling fast. "
                f"Reorder soon to avoid stockout.",

            "Moderate":
                f"📊 {name} is moving at an average pace. "
                f"Maintain current stock levels.",

            "Slow":
                f"🐢 {name} is moving slowly. "
                f"Investigate demand or consider a promotion.",
        },

        "customer_preference": {
            "High":
                f"⭐ {name} is highly preferred by customers. "
                f"Always keep it in stock.",

            "Medium":
                f"👍 {name} has moderate customer demand. "
                f"Stock according to season.",

            "Low":
                f"💤 {name} has low customer interest. "
                f"Reduce reorder quantity.",
        },

        "slow_mover": {
            "Yes":
                f"🔴 {name} is a slow mover. "
                f"Avoid restocking until current units are sold.",

            "No":
                f"🟢 {name} is not a slow mover. "
                f"Normal restocking applies.",
        },
    }

    return (
        recs
        .get(task, {})
        .get(
            label,
            "No recommendation available.",
        )
    )


@app.route("/metrics", methods=["GET"])
def metrics():
    """
    Return saved training metrics.
    """

    metrics_path = "models/metrics.json"

    if os.path.exists(metrics_path):
        with open(metrics_path) as file:
            return jsonify(
                json.load(file)
            )

    return jsonify(
        {
            "error": "Models not trained yet",
        }
    ), 404


load_models()


if __name__ == "__main__":
    if not MODELS:
        print(
            "No models found. Training now..."
        )

        train_all_models()

        load_models()

    app.run(
        host="0.0.0.0",
        port=7860,
        debug=False,
    )
