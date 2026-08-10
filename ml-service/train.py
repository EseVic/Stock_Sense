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
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
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

# Customer preference is product-specific. These are legitimate serving-time
# attributes (unlike purchase_frequency and total_units_sold_all, which were
# used to create the target and would leak the answer into the model).
CUSTOMER_CATEGORICAL_FEATURES = [
    "product_name",
    "category",
    "store_city",
    "storage_temp",
    "seasonality",
    "kaggle_product_id",
    "kaggle_store_id",
    "kaggle_region",
]


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

    # Keep the Hugging Face deployment on the same audited source as the
    # root ML service. The encoded retail file has different targets and
    # granularity, so silently substituting it changes every reported metric.
    paths = [
        "data/StockSense-Inventory.csv",
        "data/inventory_cleaned.csv",
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

    # Refuse to repeat the stale-data failure that made almost every live
    # product "Expired". Augmentation is performed before this modelling
    # table is supplied; the held-out split below remains untouched.
    expiry_distribution = (
        df["expiry_risk"]
        .astype(str)
        .value_counts(normalize=True)
    )
    largest_expiry_share = float(expiry_distribution.max())

    if largest_expiry_share > 0.80:
        raise ValueError(
            "Expiry training data is severely imbalanced "
            f"({largest_expiry_share:.1%} in one class). "
            "Use the audited augmented modelling table instead."
        )

    encoders = {}
    all_metrics = {}

    for task in TARGET_COLS:
        if task not in df.columns:
            print(
                f"Skipping {task}. "
                f"Column not found in dataset."
            )

            continue

        numeric_feat_cols = TASK_FEATURES[task]
        categorical_feat_cols = (
            CUSTOMER_CATEGORICAL_FEATURES
            if task == "customer_preference"
            else []
        )
        feat_cols = numeric_feat_cols + categorical_feat_cols

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

        X_numeric = prepare_features(
            df.copy(),
            numeric_feat_cols,
        )

        if categorical_feat_cols:
            X = X_numeric.copy()
            for col in categorical_feat_cols:
                X[col] = (
                    df[col].fillna("Unknown").astype(str)
                    if col in df.columns
                    else "Unknown"
                )
        else:
            X = X_numeric

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

        X_train_frame = X.iloc[train_indexes]
        X_test_frame = X.iloc[test_indexes]

        if categorical_feat_cols:
            # Fit the vocabulary and scaling on training rows only.
            try:
                one_hot = OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                )
            except TypeError:
                one_hot = OneHotEncoder(
                    handle_unknown="ignore",
                    sparse=False,
                )

            preprocessor = ColumnTransformer(
                [
                    ("numeric", StandardScaler(), numeric_feat_cols),
                    ("categorical", one_hot, categorical_feat_cols),
                ]
            )
            X_train = preprocessor.fit_transform(X_train_frame)
            X_test = preprocessor.transform(X_test_frame)
            X_scaled_train = X_train
            X_scaled_test = X_test

            joblib.dump(
                preprocessor,
                f"models/{task}_preprocessor.pkl",
            )
        else:
            X_train = X_train_frame.to_numpy()
            X_test = X_test_frame.to_numpy()

            # Fit preprocessing on the training partition only.
            scaler = StandardScaler()
            X_scaled_train = scaler.fit_transform(X_train_frame)
            X_scaled_test = scaler.transform(X_test_frame)

            joblib.dump(
                scaler,
                f"models/{task}_scaler.pkl",
            )

        y_train = y[train_indexes]
        y_test = y[test_indexes]

        print(
            f"Train size: {len(y_train):,} "
            f"| Test size: {len(y_test):,}"
        )

        # Fit the interpretable raw tree for feature-importance analysis.
        tree_depth = 20 if task == "customer_preference" else 7
        tree_class_weight = (
            "balanced"
            if task == "customer_preference"
            else None
        )

        raw_decision_tree = DecisionTreeClassifier(
            max_depth=tree_depth,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
            class_weight=tree_class_weight,
        )

        raw_decision_tree.fit(
            X_train,
            y_train,
        )

        # Calibrate the tree on training folds only. Raw tree leaf proportions
        # were producing misleading 100% confidence values in the application.
        decision_tree = CalibratedClassifierCV(
            estimator=DecisionTreeClassifier(
                max_depth=tree_depth,
                min_samples_split=10,
                min_samples_leaf=5,
                random_state=42,
                class_weight=tree_class_weight,
            ),
            method="sigmoid",
            cv=5,
            n_jobs=-1,
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

        # Macro-average metrics. Unlike weighted average, these treat every
        # class equally regardless of how many samples it has, so they don't
        # collapse to the same number as accuracy the way weighted recall
        # always does. Useful for spotting a model that's only doing well on
        # the dominant class.
        dt_precision_macro = precision_score(
            y_test,
            dt_predictions,
            average="macro",
            zero_division=0,
        )

        dt_recall_macro = recall_score(
            y_test,
            dt_predictions,
            average="macro",
            zero_division=0,
        )

        dt_f1_macro = f1_score(
            y_test,
            dt_predictions,
            average="macro",
        )

        print(
            "\nDecision Tree "
            f"Accuracy: {dt_accuracy:.4f} "
            f"F1 (weighted): {dt_f1:.4f}"
        )

        print(
            "Decision Tree macro avg "
            f"Precision: {dt_precision_macro:.4f} "
            f"Recall: {dt_recall_macro:.4f} "
            f"F1: {dt_f1_macro:.4f}"
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

        joblib.dump(
            raw_decision_tree,
            f"models/{task}_dt_raw.pkl",
        )

        # Logistic Regression model.
        logistic_regression = LogisticRegression(
            max_iter=2000,
            # Customer preference has three similarly sized classes. Balanced
            # weights improve minority-class macro F1 without reintroducing
            # the purchase-frequency columns that created the target.
            C=3.0 if task == "customer_preference" else 1.0,
            solver="lbfgs",
            random_state=42,
            class_weight=(
                "balanced"
                if task == "customer_preference"
                else None
            ),
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

        lr_precision_macro = precision_score(
            y_test,
            lr_predictions,
            average="macro",
            zero_division=0,
        )

        lr_recall_macro = recall_score(
            y_test,
            lr_predictions,
            average="macro",
            zero_division=0,
        )

        lr_f1_macro = f1_score(
            y_test,
            lr_predictions,
            average="macro",
        )

        print(
            "\nLogistic Regression "
            f"Accuracy: {lr_accuracy:.4f} "
            f"F1 (weighted): {lr_f1:.4f}"
        )

        print(
            "Logistic Regression macro avg "
            f"Precision: {lr_precision_macro:.4f} "
            f"Recall: {lr_recall_macro:.4f} "
            f"F1: {lr_f1_macro:.4f}"
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

            "class_distribution": {
                str(label): int(count)
                for label, count in (
                    df[task]
                    .astype(str)
                    .value_counts()
                    .items()
                )
            },

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

                "precision_macro": round(
                    dt_precision_macro,
                    4,
                ),

                "recall_macro": round(
                    dt_recall_macro,
                    4,
                ),

                "f1_macro": round(
                    dt_f1_macro,
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

                "precision_macro": round(
                    lr_precision_macro,
                    4,
                ),

                "recall_macro": round(
                    lr_recall_macro,
                    4,
                ),

                "f1_macro": round(
                    lr_f1_macro,
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

            "dataset": "StockSense-Inventory.csv (10,000 augmented scenarios)",

            "confidence_calibration": {
                "decision_tree": "5-fold sigmoid calibration on training data",
                "logistic_regression": "native predict_proba",
            },

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
        f"{'DT F1(w)':>8} "
        f"{'DT F1(m)':>8} "
        f"{'LR Acc':>8} "
        f"{'LR F1(w)':>8} "
        f"{'LR F1(m)':>8} "
        f"{'Winner'}"
    )

    print(
        "-" * 96
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
                f"{dt_report['f1_macro'] * 100:>7.2f}% "
                f"{lr_report['accuracy'] * 100:>7.2f}% "
                f"{lr_report['f1_weighted'] * 100:>7.2f}% "
                f"{lr_report['f1_macro'] * 100:>7.2f}% "
                f"{report['best_model']}"
            )

    return all_metrics


if __name__ == "__main__":
    train_all_models()
