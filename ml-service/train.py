"""
StockSense — Model Training Script
Trains Decision Tree + Logistic Regression for all 4 prediction tasks
Run: python train.py

Dataset: StockSense-inventory.csv
Source:  Kaggle Retail Store Inventory Forecasting Dataset +
         UCI Online Retail Dataset (Nigerian market adaptation)
"""
import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, f1_score
import joblib
import json
import os
from datetime import datetime

# ── Base features safe for all tasks ─────────────────────────────────────────
BASE_FEATURES = [
    "qty_in",
    "qty_sold",
    "qty_remaining",
    "qty_damaged",
    "shelf_life_days",
    "unit_price_ngn",
    "total_revenue_ngn",
    "demand_forecast",
    "holiday_promo",
    "restock_count",
    "sell_through_rate",
    "wastage_rate",
]

TASK_FEATURES = {
    "expiry_risk": BASE_FEATURES + [
        "weekly_sales_rate",
        "purchase_frequency",
        "total_units_sold_all",
    ],
    "sales_velocity": BASE_FEATURES + [
        "days_to_expiry",
        "shelf_utilisation",
        "purchase_frequency",
        "total_units_sold_all",
    ],
    "customer_preference": BASE_FEATURES + [
        "days_to_expiry",
        "shelf_utilisation",
        "weekly_sales_rate",
    ],
    "slow_mover": BASE_FEATURES + [
        "days_to_expiry",
        "shelf_utilisation",
        "purchase_frequency",
        "total_units_sold_all",
    ],    
}

FEATURE_COLS = sorted(set(
    col
    for cols in TASK_FEATURES.values()
    for col in cols
))

TARGET_COLS = ["expiry_risk", "sales_velocity", "customer_preference", "slow_mover"]


def load_data():
    paths = [
        "data/Stocksense-Inventory.csv",
        "../data/Stocksense-Inventory.csv",
        "data/inventory_cleaned.csv",
        "../data/inventory_cleaned.csv",
    ]
    for p in paths:
        if os.path.exists(p):
            df = pd.read_csv(p)
            print(f"Loaded dataset from {p}: {df.shape}")
            return df
    raise FileNotFoundError(
        "Could not find the inventory dataset. "
        "Place StockSense-inventory.csv in the ml-service/data/ folder."
    )


def prepare_features(df, feat_cols):
    """Ensure all feature columns exist and are clean for a given task"""
    if "sell_through_rate" not in df.columns:
        df["sell_through_rate"] = df["qty_sold"] / df["qty_in"].replace(0, np.nan)
    if "wastage_rate" not in df.columns:
        df["wastage_rate"] = df["qty_damaged"] / df["qty_in"].replace(0, np.nan)
    if "shelf_utilisation" not in df.columns:
        df["shelf_utilisation"] = 1 - (
            df["days_to_expiry"] / df["shelf_life_days"].clip(1)
        )
    if "weekly_sales_rate" not in df.columns:
        df["weekly_sales_rate"] = df["qty_sold"] / 4.0
    if "purchase_frequency" not in df.columns:
        df["purchase_frequency"] = 1
    if "restock_count" not in df.columns:
        df["restock_count"] = 1
    if "demand_forecast" not in df.columns:
        df["demand_forecast"] = 0
    if "holiday_promo" not in df.columns:
        df["holiday_promo"] = 0

    for col in feat_cols:
        if col not in df.columns:
            df[col] = 0

    X = df[feat_cols].fillna(df[feat_cols].median())
    return X


def train_all_models():
    os.makedirs("models", exist_ok=True)

    df          = load_data()
    encoders    = {}
    all_metrics = {}
    scalers     = {}

    for task in TARGET_COLS:
        if task not in df.columns:
            print(f"  Skipping {task} — column not in dataset")
            continue

        feat_cols = TASK_FEATURES[task]

        print(f"\n{'='*55}")
        print(f"Training models for: {task.upper()}")
        print(f"Features ({len(feat_cols)}): {feat_cols}")
        print(f"{'='*55}")

        X = prepare_features(df.copy(), feat_cols)

        # Fit a scaler per task — each task has different features
        scaler   = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        scalers[task] = scaler
        joblib.dump(scaler, f"models/{task}_scaler.pkl")

        le = LabelEncoder()
        y  = le.fit_transform(df[task].astype(str))
        encoders[task] = le
        print(f"  Classes: {list(le.classes_)}")
        print(f"  Distribution:\n{pd.Series(df[task]).value_counts().to_string()}")

        # 70/30 stratified split
        X_tr, X_te, y_tr, y_te = train_test_split(
            X.values, y, test_size=0.30, random_state=42, stratify=y
        )
        Xs_tr, Xs_te, _, _ = train_test_split(
            X_scaled, y, test_size=0.30, random_state=42, stratify=y
        )

        print(f"  Train size: {len(y_tr):,}  |  Test size: {len(y_te):,}")

        # ── Decision Tree ─────────────────────────────────────────────────────
        dt = DecisionTreeClassifier(
            max_depth=7,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42
        )
        dt.fit(X_tr, y_tr)
        dt_pred = dt.predict(X_te)
        dt_acc  = accuracy_score(y_te, dt_pred)
        dt_f1   = f1_score(y_te, dt_pred, average="weighted")
        print(f"\n  Decision Tree — Accuracy: {dt_acc:.4f}  F1: {dt_f1:.4f}")
        print(classification_report(y_te, dt_pred, target_names=le.classes_))
        joblib.dump(dt, f"models/{task}_dt.pkl")

        # ── Logistic Regression ───────────────────────────────────────────────
        lr = LogisticRegression(
            max_iter=2000,
            C=1.0,
            multi_class="auto",
            solver="lbfgs",
            random_state=42
        )
        lr.fit(Xs_tr, y_tr)
        lr_pred = lr.predict(Xs_te)
        lr_acc  = accuracy_score(y_te, lr_pred)
        lr_f1   = f1_score(y_te, lr_pred, average="weighted")
        print(f"\n  Logistic Regression — Accuracy: {lr_acc:.4f}  F1: {lr_f1:.4f}")
        print(classification_report(y_te, lr_pred, target_names=le.classes_))
        joblib.dump(lr, f"models/{task}_lr.pkl")

        winner = "Decision Tree" if dt_f1 >= lr_f1 else "Logistic Regression"
        print(f"\n ✅ Best model for {task}: {winner}")

        # Store feature list used per task
        joblib.dump(feat_cols, f"models/{task}_features.pkl")

        all_metrics[task] = {
            "features_used": feat_cols,
            "train_size": len(y_tr),
            "test_size":  len(y_te),
            "decision_tree": {
                "accuracy":    round(dt_acc, 4),
                "f1_weighted": round(dt_f1, 4),
                "report": classification_report(
                    y_te, dt_pred,
                    target_names=le.classes_,
                    output_dict=True
                )
            },
            "logistic_regression": {
                "accuracy":    round(lr_acc, 4),
                "f1_weighted": round(lr_f1, 4),
                "report": classification_report(
                    y_te, lr_pred,
                    target_names=le.classes_,
                    output_dict=True
                )
            },
            "best_model": winner,
            "classes":    list(le.classes_)
        }

    joblib.dump(encoders, "models/encoders.pkl")
    all_metrics["trained_at"] = datetime.now().isoformat()

    with open("models/metrics.json", "w") as f:
        json.dump(all_metrics, f, indent=2)

    print(f"\n{'='*55}")
    print("All models trained and saved to models/")
    print(f"{'='*55}")
    print(f"\nSUMMARY:")
    print(f"{'Task':<25} {'DT Acc':>8} {'DT F1':>8} {'LR Acc':>8} {'LR F1':>8} {'Winner'}")
    print("-"*80)
    for task in TARGET_COLS:
        if task in all_metrics:
            r = all_metrics[task]
            dt = r["decision_tree"]
            lr = r["logistic_regression"]
            print(f"{task:<25} {dt['accuracy']*100:>7.2f}% {dt['f1_weighted']*100:>7.2f}% "
                  f"{lr['accuracy']*100:>7.2f}% {lr['f1_weighted']*100:>7.2f}%  {r['best_model']}")

    return all_metrics


if __name__ == "__main__":
    train_all_models()
