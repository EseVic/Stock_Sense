# """
# StockSense ML Service — Flask API
# Trains and serves 8 models (Decision Tree + Logistic Regression) × 4 prediction tasks
# """
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import pandas as pd
# import numpy as np
# import joblib
# import os
# import json
# from train import train_all_models, FEATURE_COLS

# app = Flask(__name__)
# CORS(app)

# MODELS = {}

# def load_models():
#     model_dir = "models"
#     if not os.path.exists(model_dir):
#         os.makedirs(model_dir)
#     tasks = ["expiry_risk", "sales_velocity", "customer_preference", "slow_mover"]
#     for task in tasks:
#         for mtype in ["dt", "lr"]:
#             path = f"{model_dir}/{task}_{mtype}.pkl"
#             if os.path.exists(path):
#                 MODELS[f"{task}_{mtype}"] = joblib.load(path)
#     scaler_path = f"{model_dir}/scaler.pkl"
#     if os.path.exists(scaler_path):
#         MODELS["scaler"] = joblib.load(scaler_path)
#     encoders_path = f"{model_dir}/encoders.pkl"
#     if os.path.exists(encoders_path):
#         MODELS["encoders"] = joblib.load(encoders_path)
#     print(f"Loaded {len(MODELS)} model objects")

# @app.route("/health", methods=["GET"])
# def health():
#     return jsonify({"status": "ok", "models_loaded": len(MODELS)})

# @app.route("/train", methods=["POST"])
# def train():
#     try:
#         result = train_all_models()
#         load_models()
#         return jsonify({"status": "success", "metrics": result})
#     except Exception as e:
#         return jsonify({"status": "error", "message": str(e)}), 500

# @app.route("/predict", methods=["POST"])
# def predict():
#     try:
#         data = request.get_json()
#         records = data.get("records", [])
#         if not records:
#             return jsonify({"error": "No records provided"}), 400

#         df = pd.DataFrame(records)

#         # Fill missing cols with 0
#         for col in FEATURE_COLS:
#             if col not in df.columns:
#                 df[col] = 0
#         df[FEATURE_COLS] = df[FEATURE_COLS].fillna(0)

#         X = df[FEATURE_COLS].values

#         results = []
#         tasks = ["expiry_risk", "sales_velocity", "customer_preference", "slow_mover"]
#         encoders = MODELS.get("encoders", {})
#         scaler   = MODELS.get("scaler")

#         X_scaled = scaler.transform(X) if scaler else X

#         for i, record in enumerate(records):
#             row_result = {"product_name": record.get("product_name", f"Product {i+1}"), "predictions": {}}

#             for task in tasks:
#                 dt_key = f"{task}_dt"
#                 lr_key = f"{task}_lr"
#                 enc    = encoders.get(task)

#                 dt_pred = lr_pred = dt_conf = lr_conf = None

#                 if dt_key in MODELS:
#                     raw = MODELS[dt_key].predict([X[i]])[0]
#                     probs = MODELS[dt_key].predict_proba([X[i]])[0]
#                     dt_pred = enc.inverse_transform([raw])[0] if enc else str(raw)
#                     dt_conf = round(float(max(probs)) * 100, 1)

#                 if lr_key in MODELS:
#                     raw = MODELS[lr_key].predict([X_scaled[i]])[0]
#                     probs = MODELS[lr_key].predict_proba([X_scaled[i]])[0]
#                     lr_pred = enc.inverse_transform([raw])[0] if enc else str(raw)
#                     lr_conf = round(float(max(probs)) * 100, 1)

#                 # Use DT as primary (interpretable), LR as secondary
#                 primary = dt_pred or lr_pred
#                 confidence = dt_conf or lr_conf or 0

#                 row_result["predictions"][task] = {
#                     "label":      primary,
#                     "confidence": confidence,
#                     "dt":         {"label": dt_pred, "confidence": dt_conf},
#                     "lr":         {"label": lr_pred, "confidence": lr_conf},
#                     "recommendation": get_recommendation(task, primary, record)
#                 }

#             results.append(row_result)

#         return jsonify({"status": "success", "results": results})

#     except Exception as e:
#         import traceback
#         return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# def get_recommendation(task, label, record):
#     name = record.get("product_name", "This product")
#     dte  = record.get("days_to_expiry", 99)
#     qty  = record.get("qty_remaining", 0)

#     recs = {
#         "expiry_risk": {
#             "High":    f"⚠️ Discount {name} immediately — expiry is very close with {qty} units still on shelf.",
#             "Medium":  f"📋 Monitor {name} closely this week. Consider a small discount to move stock faster.",
#             "Low":     f"✅ {name} expiry is not a concern right now. Continue normal sales.",
#             "Expired": f"🚫 Remove {name} from shelf immediately — batch has expired.",
#         },
#         "sales_velocity": {
#             "Fast":     f"🚀 {name} is selling fast. Reorder soon to avoid stockout.",
#             "Moderate": f"📊 {name} is moving at an average pace. Maintain current stock levels.",
#             "Slow":     f"🐢 {name} is moving slowly. Investigate demand or consider a promotion.",
#         },
#         "customer_preference": {
#             "High":   f"⭐ {name} is highly preferred by customers. Always keep it in stock.",
#             "Medium": f"👍 {name} has moderate customer demand. Stock according to season.",
#             "Low":    f"💤 {name} has low customer interest. Reduce reorder quantity.",
#         },
#         "slow_mover": {
#             "Yes": f"🔴 {name} is a slow mover. Avoid restocking until current units are sold.",
#             "No":  f"🟢 {name} is not a slow mover. Normal restocking applies.",
#         },
#     }
#     return recs.get(task, {}).get(label, "No recommendation available.")

# @app.route("/metrics", methods=["GET"])
# def metrics():
#     metrics_path = "models/metrics.json"
#     if os.path.exists(metrics_path):
#         with open(metrics_path) as f:
#             return jsonify(json.load(f))
#     return jsonify({"error": "Models not trained yet"}), 404

# if __name__ == "__main__":
#     load_models()
#     if not MODELS:
#         print("No models found — training now...")
#         train_all_models()
#         load_models()
#     app.run(host="0.0.0.0", port=5001, debug=False)



"""
StockSense ML Service — Flask API
Trains and serves 8 models (Decision Tree + Logistic Regression) × 4 prediction tasks
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import os
import json
from train import train_all_models, FEATURE_COLS

app = Flask(__name__)
CORS(app)

MODELS = {}

def load_models():
    model_dir = "models"
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
    tasks = ["expiry_risk", "sales_velocity", "customer_preference", "slow_mover"]
    for task in tasks:
        for mtype in ["dt", "lr"]:
            path = f"{model_dir}/{task}_{mtype}.pkl"
            if os.path.exists(path):
                MODELS[f"{task}_{mtype}"] = joblib.load(path)
        scaler_path = f"{model_dir}/{task}_scaler.pkl"
        if os.path.exists(scaler_path):
            MODELS[f"{task}_scaler"] = joblib.load(scaler_path)
        features_path = f"{model_dir}/{task}_features.pkl"
        if os.path.exists(features_path):
            MODELS[f"{task}_features"] = joblib.load(features_path)
    encoders_path = f"{model_dir}/encoders.pkl"
    if os.path.exists(encoders_path):
        MODELS["encoders"] = joblib.load(encoders_path)
    print(f"Loaded {len(MODELS)} model objects")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "models_loaded": len(MODELS)})

@app.route("/train", methods=["POST"])
def train():
    try:
        result = train_all_models()
        load_models()
        return jsonify({"status": "success", "metrics": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        records = data.get("records", [])
        if not records:
            return jsonify({"error": "No records provided"}), 400

        df = pd.DataFrame(records)
        for col in FEATURE_COLS:
            if col not in df.columns:
                df[col] = 0
        df[FEATURE_COLS] = df[FEATURE_COLS].fillna(0)

        tasks = ["expiry_risk", "sales_velocity", "customer_preference", "slow_mover"]
        encoders = MODELS.get("encoders", {})

        results = []
        for i, record in enumerate(records):
            row_result = {
                "product_name": record.get("product_name", f"Product {i+1}"),
                "predictions": {}
            }

            for task in tasks:
                dt_key    = f"{task}_dt"
                lr_key    = f"{task}_lr"
                scaler    = MODELS.get(f"{task}_scaler")
                feat_cols = MODELS.get(f"{task}_features", FEATURE_COLS)
                enc       = encoders.get(task)

                task_df = df.copy()
                for col in feat_cols:
                    if col not in task_df.columns:
                        task_df[col] = 0
                x_raw    = task_df[feat_cols].fillna(0).values
                x_scaled = scaler.transform(x_raw) if scaler else x_raw

                dt_pred = lr_pred = dt_conf = lr_conf = None

                if dt_key in MODELS:
                    raw     = MODELS[dt_key].predict([x_raw[i]])[0]
                    probs   = MODELS[dt_key].predict_proba([x_raw[i]])[0]
                    dt_pred = enc.inverse_transform([raw])[0] if enc else str(raw)
                    dt_conf = round(float(max(probs)) * 100, 1)

                if lr_key in MODELS:
                    raw     = MODELS[lr_key].predict([x_scaled[i]])[0]
                    probs   = MODELS[lr_key].predict_proba([x_scaled[i]])[0]
                    lr_pred = enc.inverse_transform([raw])[0] if enc else str(raw)
                    lr_conf = round(float(max(probs)) * 100, 1)

                primary    = dt_pred or lr_pred
                confidence = dt_conf or lr_conf or 0

                row_result["predictions"][task] = {
                    "label":          primary,
                    "confidence":     confidence,
                    "dt":             {"label": dt_pred, "confidence": dt_conf},
                    "lr":             {"label": lr_pred, "confidence": lr_conf},
                    "recommendation": get_recommendation(task, primary, record)
                }

            results.append(row_result)

        return jsonify({"status": "success", "results": results})

    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

def get_recommendation(task, label, record):
    name = record.get("product_name", "This product")
    qty  = record.get("qty_remaining", 0)

    recs = {
        "expiry_risk": {
            "High":    f"⚠️ Discount {name} immediately — expiry is very close with {qty} units still on shelf.",
            "Medium":  f"📋 Monitor {name} closely this week. Consider a small discount to move stock faster.",
            "Low":     f"✅ {name} expiry is not a concern right now. Continue normal sales.",
            "Expired": f"🚫 Remove {name} from shelf immediately — batch has expired.",
        },
        "sales_velocity": {
            "Fast":     f"🚀 {name} is selling fast. Reorder soon to avoid stockout.",
            "Moderate": f"📊 {name} is moving at an average pace. Maintain current stock levels.",
            "Slow":     f"🐢 {name} is moving slowly. Investigate demand or consider a promotion.",
        },
        "customer_preference": {
            "High":   f"⭐ {name} is highly preferred by customers. Always keep it in stock.",
            "Medium": f"👍 {name} has moderate customer demand. Stock according to season.",
            "Low":    f"💤 {name} has low customer interest. Reduce reorder quantity.",
        },
        "slow_mover": {
            "Yes": f"🔴 {name} is a slow mover. Avoid restocking until current units are sold.",
            "No":  f"🟢 {name} is not a slow mover. Normal restocking applies.",
        },
    }
    return recs.get(task, {}).get(label, "No recommendation available.")

@app.route("/metrics", methods=["GET"])
def metrics():
    metrics_path = "models/metrics.json"
    if os.path.exists(metrics_path):
        with open(metrics_path) as f:
            return jsonify(json.load(f))
    return jsonify({"error": "Models not trained yet"}), 404

if __name__ == "__main__":
    load_models()
    if not MODELS:
        print("No models found — training now...")
        train_all_models()
        load_models()
    app.run(host="0.0.0.0", port=5001, debug=False)