"""
StockSense Model Training Script

Trains Decision Tree and Logistic Regression models
for all four prediction tasks.

Run:
    python train.py
"""

import os
import json
from datetime import datetime

import joblib
import numpy as np
import pandas as pd

from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    accuracy_score,
    f1_score,
)


# Base features that are safe for all tasks.
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
        "days_to_expiry",
        "shelf_utilisation",
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
        "purchase_frequency",
        "total_units_sold_all",
    ],

    "slow_mover": BASE_FEATURES + [
        "days_to_expiry",
        "shelf_utilisation",
        "purchase_frequency",
        "total_units_sold_all",
    ],
}


FEATURE_COLS = sorted(
    set(
        col
        for columns in TASK_FEATURES.values()
        for col in columns
    )
)


TARGET_COLS = [
    "expiry_risk",
    "sales_velocity",
    "customer_preference",
    "slow_mover",
]


def load_data():
    """
    Load the StockSense inventory training dataset.
    """

    paths = [
        "data/StockSense-Inventory.csv",
    ]

    for path in paths:
        if os.path.exists(path):
            df = pd.read_csv(path)

            print(
                f"Loaded dataset from {path}: "
                f"{df.shape}"
            )

            return df

    raise FileNotFoundError(
        "Could not find the inventory dataset. "
        "Place StockSense-Inventory.csv inside "
        "the ml-service/data folder."
    )


def prepare_features(df, feat_cols):
    """
    Ensure required feature columns exist and contain clean values.
    """

    if "sell_through_rate" not in df.columns:
        df["sell_through_rate"] = (
            df["qty_sold"]
            / df["qty_in"].replace(
                0,
                np.nan,
            )
        )

    if "wastage_rate" not in df.columns:
        df["wastage_rate"] = (
            df["qty_damaged"]
            / df["qty_in"].replace(
                0,
                np.nan,
            )
        )

    if "shelf_utilisation" not in df.columns:
        df["shelf_utilisation"] = (
            1
            -
            (
                df["days_to_expiry"]
                /
                df["shelf_life_days"].clip(1)
            )
        )

    if "weekly_sales_rate" not in df.columns:
        df["weekly_sales_rate"] = (
            df["qty_sold"] / 4.0
        )

    if "purchase_frequency" not in df.columns:
        df["purchase_frequency"] = 1

    if "restock_count" not in df.columns:
        df["restock_count"] = 1

    if "demand_forecast" not in df.columns:
        df["demand_forecast"] = 0

    if "holiday_promo" not in df.columns:
        df["holiday_promo"] = 0

    if "total_units_sold_all" not in df.columns:
        df["total_units_sold_all"] = df["qty_sold"]

    if "total_revenue_ngn" not in df.columns:
        df["total_revenue_ngn"] = (
            df["unit_price_ngn"]
            * df["qty_sold"]
        )

    for col in feat_cols:
        if col not in df.columns:
            df[col] = 0

    X = df[feat_cols].copy()

    X = X.fillna(
        X.median(
            numeric_only=True
        )
    )

    X = X.fillna(0)

    return X


def train_all_models():
    """
    Train models for all four StockSense ML tasks.
    """

    os.makedirs(
        "models",
        exist_ok=True,
    )

    df = load_data()

    encoders = {}
    all_metrics = {}

    for task in TARGET_COLS:
        if task not in df.columns:
            print(
                f"Skipping {task}. "
                f"Column not found in dataset."
            )

            continue

        feat_cols = TASK_FEATURES[task]

        print(
            f"\n{'=' * 55}"
        )

        print(
            f"Training models for: "
            f"{task.upper()}"
        )

        print(
            f"Features ({len(feat_cols)}): "
            f"{feat_cols}"
        )

        print(
            f"{'=' * 55}"
        )

        X = prepare_features(
            df.copy(),
            feat_cols,
        )

        scaler = StandardScaler()

        X_scaled = scaler.fit_transform(X)

        joblib.dump(
            scaler,
            f"models/{task}_scaler.pkl",
        )

        label_encoder = LabelEncoder()

        y = label_encoder.fit_transform(
            df[task].astype(str)
        )

        encoders[task] = label_encoder

        print(
            f"Classes: "
            f"{list(label_encoder.classes_)}"
        )

        print(
            "Distribution:"
        )

        print(
            pd.Series(
                df[task]
            )
            .value_counts()
            .to_string()
        )

        # Use one set of indexes for both raw and scaled values.
        indexes = np.arange(len(y))

        (
            train_indexes,
            test_indexes,
        ) = train_test_split(
            indexes,
            test_size=0.30,
            random_state=42,
            stratify=y,
        )

        X_train = X.values[train_indexes]
        X_test = X.values[test_indexes]

        X_scaled_train = X_scaled[train_indexes]
        X_scaled_test = X_scaled[test_indexes]

        y_train = y[train_indexes]
        y_test = y[test_indexes]

        print(
            f"Train size: {len(y_train):,} "
            f"| Test size: {len(y_test):,}"
        )

        # Decision Tree model.
        decision_tree = DecisionTreeClassifier(
            max_depth=7,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
        )

        decision_tree.fit(
            X_train,
            y_train,
        )

        dt_predictions = decision_tree.predict(
            X_test
        )

        dt_accuracy = accuracy_score(
            y_test,
            dt_predictions,
        )

        dt_f1 = f1_score(
            y_test,
            dt_predictions,
            average="weighted",
        )

        print(
            "\nDecision Tree "
            f"Accuracy: {dt_accuracy:.4f} "
            f"F1: {dt_f1:.4f}"
        )

        print(
            classification_report(
                y_test,
                dt_predictions,
                target_names=
                    label_encoder.classes_,
                zero_division=0,
            )
        )

        joblib.dump(
            decision_tree,
            f"models/{task}_dt.pkl",
        )

        # Logistic Regression model.
        logistic_regression = LogisticRegression(
            max_iter=2000,
            C=1.0,
            solver="lbfgs",
            random_state=42,
        )

        logistic_regression.fit(
            X_scaled_train,
            y_train,
        )

        lr_predictions = logistic_regression.predict(
            X_scaled_test
        )

        lr_accuracy = accuracy_score(
            y_test,
            lr_predictions,
        )

        lr_f1 = f1_score(
            y_test,
            lr_predictions,
            average="weighted",
        )

        print(
            "\nLogistic Regression "
            f"Accuracy: {lr_accuracy:.4f} "
            f"F1: {lr_f1:.4f}"
        )

        print(
            classification_report(
                y_test,
                lr_predictions,
                target_names=
                    label_encoder.classes_,
                zero_division=0,
            )
        )

        joblib.dump(
            logistic_regression,
            f"models/{task}_lr.pkl",
        )

        winner = (
            "Decision Tree"
            if dt_f1 >= lr_f1
            else "Logistic Regression"
        )

        print(
            f"\nBest model for {task}: "
            f"{winner}"
        )

        # Save the precise features used by this task.
        joblib.dump(
            feat_cols,
            f"models/{task}_features.pkl",
        )

        all_metrics[task] = {
            "features_used": feat_cols,

            "train_size": len(y_train),

            "test_size": len(y_test),

            "decision_tree": {
                "accuracy": round(
                    dt_accuracy,
                    4,
                ),

                "f1_weighted": round(
                    dt_f1,
                    4,
                ),

                "report": classification_report(
                    y_test,
                    dt_predictions,
                    target_names=
                        label_encoder.classes_,
                    output_dict=True,
                    zero_division=0,
                ),
            },

            "logistic_regression": {
                "accuracy": round(
                    lr_accuracy,
                    4,
                ),

                "f1_weighted": round(
                    lr_f1,
                    4,
                ),

                "report": classification_report(
                    y_test,
                    lr_predictions,
                    target_names=
                        label_encoder.classes_,
                    output_dict=True,
                    zero_division=0,
                ),
            },

            "best_model": winner,

            "classes": list(
                label_encoder.classes_
            ),
        }

    joblib.dump(
        encoders,
        "models/encoders.pkl",
    )

    all_metrics["trained_at"] = (
        datetime.now().isoformat()
    )

    with open(
        "models/metrics.json",
        "w",
    ) as file:
        json.dump(
            all_metrics,
            file,
            indent=2,
        )

    print(
        f"\n{'=' * 55}"
    )

    print(
        "All models trained and saved "
        "inside the models folder."
    )

    print(
        f"{'=' * 55}"
    )

    print(
        "\nSUMMARY:"
    )

    print(
        f"{'Task':<25} "
        f"{'DT Acc':>8} "
        f"{'DT F1':>8} "
        f"{'LR Acc':>8} "
        f"{'LR F1':>8} "
        f"{'Winner'}"
    )

    print(
        "-" * 80
    )

    for task in TARGET_COLS:
        if task in all_metrics:
            report = all_metrics[task]

            dt_report = report[
                "decision_tree"
            ]

            lr_report = report[
                "logistic_regression"
            ]

            print(
                f"{task:<25} "
                f"{dt_report['accuracy'] * 100:>7.2f}% "
                f"{dt_report['f1_weighted'] * 100:>7.2f}% "
                f"{lr_report['accuracy'] * 100:>7.2f}% "
                f"{lr_report['f1_weighted'] * 100:>7.2f}% "
                f"{report['best_model']}"
            )

    return all_metrics


if __name__ == "__main__":
    train_all_models()