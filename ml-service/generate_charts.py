# """
# StockSense — Chapter 4 Chart Generator
# Generates all figures needed for Chapter 4.

# Output: a folder called  chapter4_figures/  with all images inside.
# """

# import os
# import json
# import joblib
# import numpy as np
# import pandas as pd
# import matplotlib
# matplotlib.use("Agg")
# import matplotlib.pyplot as plt
# import matplotlib.patches as mpatches
# from matplotlib.gridspec import GridSpec
# from sklearn.model_selection import train_test_split
# from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
# from sklearn.preprocessing import LabelEncoder

# # ── Config ────────────────────────────────────────────────────────────────────
# OUTPUT_DIR  = "chapter4_figures"
# MODELS_DIR  = "models"
# DATA_PATH   = "data/StockSense-Inventory.csv"
# TASKS       = ["expiry_risk", "sales_velocity", "customer_preference", "slow_mover"]
# TASK_LABELS = {
#     "expiry_risk":          "Expiry Risk",
#     "sales_velocity":       "Sales Velocity",
#     "customer_preference":  "Customer Preference",
#     "slow_mover":           "Slow Mover Detection",
# }

# # Colours — professional, print-friendly
# DT_COLOUR = "#2E75B6"
# LR_COLOUR = "#ED7D31"
# GRID_COLOUR = "#E8E8E8"

# os.makedirs(OUTPUT_DIR, exist_ok=True)

# # ── Load metrics.json ─────────────────────────────────────────────────────────
# with open(os.path.join(MODELS_DIR, "metrics.json")) as f:
#     metrics = json.load(f)

# # ── Load dataset and re-run splits to get predictions ─────────────────────────
# print("Loading dataset...")
# df = pd.read_csv(DATA_PATH)

# TASK_FEATURES = {
#     "expiry_risk": [
#         "qty_in","qty_sold","qty_remaining","qty_damaged","shelf_life_days",
#         "unit_price_ngn","total_revenue_ngn","demand_forecast","holiday_promo",
#         "restock_count","sell_through_rate","wastage_rate",
#         "weekly_sales_rate","purchase_frequency","total_units_sold_all",
#     ],
#     "sales_velocity": [
#         "qty_in","qty_sold","qty_remaining","qty_damaged","shelf_life_days",
#         "unit_price_ngn","total_revenue_ngn","demand_forecast","holiday_promo",
#         "restock_count","sell_through_rate","wastage_rate",
#         "days_to_expiry","shelf_utilisation","purchase_frequency","total_units_sold_all",
#     ],
#     "customer_preference": [
#         "qty_in","qty_sold","qty_remaining","qty_damaged","shelf_life_days",
#         "unit_price_ngn","total_revenue_ngn","demand_forecast","holiday_promo",
#         "restock_count","sell_through_rate","wastage_rate",
#         "days_to_expiry","shelf_utilisation","weekly_sales_rate",
#         "purchase_frequency","total_units_sold_all",
#     ],
#     "slow_mover": [
#         "qty_in","qty_sold","qty_remaining","qty_damaged","shelf_life_days",
#         "unit_price_ngn","total_revenue_ngn","demand_forecast","holiday_promo",
#         "restock_count","sell_through_rate","wastage_rate",
#         "days_to_expiry","shelf_utilisation","purchase_frequency","total_units_sold_all",
#     ],
# }

# task_results = {}

# for task in TASKS:
#     feat_cols = TASK_FEATURES[task]
#     X = df[feat_cols].fillna(df[feat_cols].median())

#     scaler  = joblib.load(f"{MODELS_DIR}/{task}_scaler.pkl")
#     X_scaled = scaler.transform(X)

#     le = LabelEncoder()
#     le.classes_ = np.array(metrics[task]["classes"])
#     y = le.transform(df[task].astype(str))

#     _, X_te, _, y_te = train_test_split(X.values, y, test_size=0.30, random_state=42, stratify=y)
#     _, Xs_te, _, _   = train_test_split(X_scaled,  y, test_size=0.30, random_state=42, stratify=y)

#     dt = joblib.load(f"{MODELS_DIR}/{task}_dt.pkl")
#     lr = joblib.load(f"{MODELS_DIR}/{task}_lr.pkl")

#     dt_pred = dt.predict(X_te)
#     lr_pred = lr.predict(Xs_te)

#     task_results[task] = {
#         "y_te":    y_te,
#         "dt_pred": dt_pred,
#         "lr_pred": lr_pred,
#         "classes": le.classes_,
#         "dt_model": dt,
#         "feat_cols": feat_cols,
#     }
#     print(f"  Loaded models for: {task}")


# # ══════════════════════════════════════════════════════════════════════════════
# # FIGURE 4.3 — Accuracy comparison bar chart
# # ══════════════════════════════════════════════════════════════════════════════
# print("\nGenerating Figure 4.3 — Accuracy comparison...")

# task_names = [TASK_LABELS[t] for t in TASKS]
# dt_accs = [metrics[t]["decision_tree"]["accuracy"] * 100 for t in TASKS]
# lr_accs = [metrics[t]["logistic_regression"]["accuracy"] * 100 for t in TASKS]

# x = np.arange(len(TASKS))
# width = 0.35

# fig, ax = plt.subplots(figsize=(10, 6))
# fig.patch.set_facecolor("white")
# ax.set_facecolor("white")

# bars1 = ax.bar(x - width/2, dt_accs, width, label="Decision Tree",
#                color=DT_COLOUR, edgecolor="white", linewidth=0.5)
# bars2 = ax.bar(x + width/2, lr_accs, width, label="Logistic Regression",
#                color=LR_COLOUR, edgecolor="white", linewidth=0.5)

# for bar in bars1:
#     ax.annotate(f"{bar.get_height():.1f}%",
#                 xy=(bar.get_x() + bar.get_width() / 2, bar.get_height()),
#                 xytext=(0, 5), textcoords="offset points",
#                 ha="center", va="bottom", fontsize=9, color="#333333")
# for bar in bars2:
#     ax.annotate(f"{bar.get_height():.1f}%",
#                 xy=(bar.get_x() + bar.get_width() / 2, bar.get_height()),
#                 xytext=(0, 5), textcoords="offset points",
#                 ha="center", va="bottom", fontsize=9, color="#333333")

# ax.axhline(y=80, color="red", linestyle="--", linewidth=1.2, alpha=0.7, label="80% target")
# ax.set_xlabel("Prediction Task", fontsize=12, labelpad=10)
# ax.set_ylabel("Accuracy (%)", fontsize=12, labelpad=10)
# ax.set_title("Figure 4.3: Model Accuracy Comparison — Decision Tree vs Logistic Regression",
#              fontsize=12, pad=15, style="italic")
# ax.set_xticks(x)
# ax.set_xticklabels(task_names, fontsize=10)
# ax.set_ylim(70, 105)
# ax.yaxis.grid(True, color=GRID_COLOUR, linewidth=0.8)
# ax.set_axisbelow(True)
# ax.legend(fontsize=10, framealpha=0.9)
# for spine in ["top", "right"]:
#     ax.spines[spine].set_visible(False)

# plt.tight_layout()
# plt.savefig(f"{OUTPUT_DIR}/figure_4_3_accuracy_comparison.png", dpi=200, bbox_inches="tight")
# plt.close()
# print("  Saved figure_4_3_accuracy_comparison.png")


# # ══════════════════════════════════════════════════════════════════════════════
# # FIGURE 4.4 — Confusion matrices (Decision Tree, all 4 tasks)
# # ══════════════════════════════════════════════════════════════════════════════
# print("Generating Figure 4.4 — Confusion matrices...")

# fig, axes = plt.subplots(2, 2, figsize=(14, 11))
# fig.patch.set_facecolor("white")
# fig.suptitle("Figure 4.4: Confusion Matrices — Decision Tree Across All Four Prediction Tasks",
#              fontsize=12, style="italic", y=1.01)

# for ax, task in zip(axes.flat, TASKS):
#     r = task_results[task]
#     cm = confusion_matrix(r["y_te"], r["dt_pred"])
#     disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=r["classes"])
#     disp.plot(ax=ax, colorbar=False, cmap="Blues", values_format="d")
#     ax.set_title(TASK_LABELS[task], fontsize=11, pad=8)
#     ax.set_xlabel("Predicted Label", fontsize=9)
#     ax.set_ylabel("True Label", fontsize=9)
#     ax.tick_params(axis="both", labelsize=8)
#     for text in disp.text_.ravel():
#         text.set_fontsize(9)

# plt.tight_layout()
# plt.savefig(f"{OUTPUT_DIR}/figure_4_4_confusion_matrices.png", dpi=200, bbox_inches="tight")
# plt.close()
# print("  Saved figure_4_4_confusion_matrices.png")


# # ══════════════════════════════════════════════════════════════════════════════
# # FIGURE 4.5 — Per-class F1 scores (DT vs LR, all 4 tasks)
# # ══════════════════════════════════════════════════════════════════════════════
# print("Generating Figure 4.5 — Per-class F1 scores...")

# fig, axes = plt.subplots(2, 2, figsize=(14, 10))
# fig.patch.set_facecolor("white")
# fig.suptitle("Figure 4.5: Per-Class F1 Scores — Decision Tree vs Logistic Regression",
#              fontsize=12, style="italic", y=1.01)

# for ax, task in zip(axes.flat, TASKS):
#     report_dt = metrics[task]["decision_tree"]["report"]
#     report_lr = metrics[task]["logistic_regression"]["report"]
#     classes   = metrics[task]["classes"]

#     dt_f1s = [report_dt[c]["f1-score"] * 100 for c in classes if c in report_dt]
#     lr_f1s = [report_lr[c]["f1-score"] * 100 for c in classes if c in report_lr]
#     valid_classes = [c for c in classes if c in report_dt]

#     x = np.arange(len(valid_classes))
#     width = 0.35

#     ax.set_facecolor("white")
#     b1 = ax.bar(x - width/2, dt_f1s, width, label="Decision Tree",
#                 color=DT_COLOUR, edgecolor="white")
#     b2 = ax.bar(x + width/2, lr_f1s, width, label="Logistic Regression",
#                 color=LR_COLOUR, edgecolor="white")

#     ax.set_title(TASK_LABELS[task], fontsize=11, pad=8)
#     ax.set_ylabel("F1 Score (%)", fontsize=9)
#     ax.set_xticks(x)
#     ax.set_xticklabels(valid_classes, fontsize=8, rotation=15)
#     ax.set_ylim(0, 110)
#     ax.yaxis.grid(True, color=GRID_COLOUR, linewidth=0.7)
#     ax.set_axisbelow(True)
#     ax.legend(fontsize=8, framealpha=0.9)
#     for spine in ["top", "right"]:
#         ax.spines[spine].set_visible(False)

#     for bar in b1:
#         ax.annotate(f"{bar.get_height():.0f}",
#                     xy=(bar.get_x() + bar.get_width()/2, bar.get_height()),
#                     xytext=(0, 3), textcoords="offset points",
#                     ha="center", va="bottom", fontsize=7, color="#333333")
#     for bar in b2:
#         ax.annotate(f"{bar.get_height():.0f}",
#                     xy=(bar.get_x() + bar.get_width()/2, bar.get_height()),
#                     xytext=(0, 3), textcoords="offset points",
#                     ha="center", va="bottom", fontsize=7, color="#333333")

# plt.tight_layout()
# plt.savefig(f"{OUTPUT_DIR}/figure_4_5_perclass_f1.png", dpi=200, bbox_inches="tight")
# plt.close()
# print("  Saved figure_4_5_perclass_f1.png")


# # ══════════════════════════════════════════════════════════════════════════════
# # FIGURE 4.6 — Feature importance (Decision Tree, top 5 per task)
# # ══════════════════════════════════════════════════════════════════════════════
# print("Generating Figure 4.6 — Feature importance...")

# fig, axes = plt.subplots(2, 2, figsize=(14, 10))
# fig.patch.set_facecolor("white")
# fig.suptitle("Figure 4.6: Feature Importance Scores — Decision Tree, Top 5 Features Per Task",
#              fontsize=12, style="italic", y=1.01)

# COLOURS = ["#2E75B6", "#4A9FD4", "#6DB8E8", "#A8D4F0", "#D0EAFA"]

# for ax, task in zip(axes.flat, TASKS):
#     r       = task_results[task]
#     dt      = r["dt_model"]
#     feats   = r["feat_cols"]
#     importances = dt.feature_importances_

#     indices  = np.argsort(importances)[::-1][:5]
#     top_vals = importances[indices]
#     top_names = [feats[i] for i in indices]

#     # Reverse so highest is at top
#     top_vals  = top_vals[::-1]
#     top_names = top_names[::-1]

#     ax.set_facecolor("white")
#     bars = ax.barh(range(len(top_names)), top_vals * 100,
#                    color=COLOURS, edgecolor="white")

#     ax.set_yticks(range(len(top_names)))
#     ax.set_yticklabels(top_names, fontsize=9)
#     ax.set_xlabel("Importance (%)", fontsize=9)
#     ax.set_title(TASK_LABELS[task], fontsize=11, pad=8)
#     ax.xaxis.grid(True, color=GRID_COLOUR, linewidth=0.7)
#     ax.set_axisbelow(True)
#     for spine in ["top", "right"]:
#         ax.spines[spine].set_visible(False)

#     for bar, val in zip(bars, top_vals):
#         ax.annotate(f"{val*100:.1f}%",
#                     xy=(bar.get_width(), bar.get_y() + bar.get_height()/2),
#                     xytext=(4, 0), textcoords="offset points",
#                     ha="left", va="center", fontsize=8, color="#333333")

# plt.tight_layout()
# plt.savefig(f"{OUTPUT_DIR}/figure_4_6_feature_importance.png", dpi=200, bbox_inches="tight")
# plt.close()
# print("  Saved figure_4_6_feature_importance.png")


# # ══════════════════════════════════════════════════════════════════════════════
# # FIGURE 4.2 — ML Prediction Flow (simple diagram)
# # ══════════════════════════════════════════════════════════════════════════════
# print("Generating Figure 4.2 — ML prediction flow...")

# fig, ax = plt.subplots(figsize=(13, 3.5))
# fig.patch.set_facecolor("white")
# ax.set_facecolor("white")
# ax.axis("off")

# steps = [
#     ("Raw Inventory\nData", "#2E75B6"),
#     ("Data Cleaning\n& Labelling", "#ED7D31"),
#     ("Feature\nEngineering", "#9B59B6"),
#     ("Train\nML Model", "#27AE60"),
#     ("Risk\nPrediction", "#E74C3C"),
# ]

# box_w, box_h = 0.14, 0.55
# gap = 0.175
# start_x = 0.04
# y_centre = 0.50

# for i, (label, colour) in enumerate(steps):
#     x = start_x + i * gap
#     fancy = mpatches.FancyBboxPatch(
#         (x, y_centre - box_h/2), box_w, box_h,
#         boxstyle="round,pad=0.02",
#         facecolor=colour, edgecolor="white", linewidth=1.5,
#         transform=ax.transAxes, clip_on=False
#     )
#     ax.add_patch(fancy)
#     ax.text(x + box_w/2, y_centre, label,
#             transform=ax.transAxes,
#             ha="center", va="center",
#             fontsize=10, color="white", fontweight="bold",
#             multialignment="center")
#     if i < len(steps) - 1:
#         ax.annotate("",
#             xy=(x + gap, y_centre),
#             xytext=(x + box_w + 0.005, y_centre),
#             xycoords="axes fraction", textcoords="axes fraction",
#             arrowprops=dict(arrowstyle="->", color="#555555", lw=2))

# ax.set_title("Figure 4.2: Machine Learning Prediction Flow",
#              fontsize=11, style="italic", pad=12)

# plt.tight_layout()
# plt.savefig(f"{OUTPUT_DIR}/figure_4_2_ml_flow.png", dpi=200, bbox_inches="tight")
# plt.close()
# print("  Saved figure_4_2_ml_flow.png")


# # ══════════════════════════════════════════════════════════════════════════════
# # Done
# # ══════════════════════════════════════════════════════════════════════════════
# print(f"\n{'='*55}")
# print(f"All charts saved to:  {OUTPUT_DIR}/")
# print(f"{'='*55}")
# print("\nFiles generated:")
# for f in sorted(os.listdir(OUTPUT_DIR)):
#     size = os.path.getsize(f"{OUTPUT_DIR}/{f}") // 1024
#     print(f"  {f}  ({size} KB)")
# print("\nInsert these images into your Chapter 4 Word document")
# print("at the matching figure placeholder positions.")


"""
StockSense - Chapter 4 Chart Generator
Generates all figures needed for Chapter 4.

Output: a folder called chapter4_figures with all images inside.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
from sklearn.preprocessing import LabelEncoder


# ============================================================================
# Configuration
# ============================================================================
OUTPUT_DIR = "chapter4_figures"
MODELS_DIR = "models"
DATA_PATH = "data/StockSense-Inventory.csv"

TASKS = [
    "expiry_risk",
    "sales_velocity",
    "customer_preference",
    "slow_mover",
]

TASK_LABELS = {
    "expiry_risk": "Expiry Risk",
    "sales_velocity": "Sales Velocity",
    "customer_preference": "Customer Preference",
    "slow_mover": "Slow Mover Detection",
}

# Professional, print-friendly colours
DT_COLOUR = "#2E75B6"
LR_COLOUR = "#ED7D31"
GRID_COLOUR = "#E8E8E8"

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ============================================================================
# Load metrics.json
# ============================================================================
with open(os.path.join(MODELS_DIR, "metrics.json")) as f:
    metrics = json.load(f)


# ============================================================================
# Load dataset and re-run splits to get predictions
# ============================================================================
print("Loading dataset...")

df = pd.read_csv(DATA_PATH)

TASK_FEATURES = {
    "expiry_risk": [
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
        "weekly_sales_rate",
        "purchase_frequency",
        "total_units_sold_all",
    ],
    "sales_velocity": [
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
        "days_to_expiry",
        "shelf_utilisation",
        "purchase_frequency",
        "total_units_sold_all",
    ],
    "customer_preference": [
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
        "days_to_expiry",
        "shelf_utilisation",
        "weekly_sales_rate",
        "purchase_frequency",
        "total_units_sold_all",
    ],
    "slow_mover": [
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
        "days_to_expiry",
        "shelf_utilisation",
        "purchase_frequency",
        "total_units_sold_all",
    ],
}

task_results = {}

for task in TASKS:
    feat_cols = TASK_FEATURES[task]

    X = df[feat_cols].fillna(df[feat_cols].median())

    scaler = joblib.load(f"{MODELS_DIR}/{task}_scaler.pkl")
    X_scaled = scaler.transform(X)

    le = LabelEncoder()
    le.classes_ = np.array(metrics[task]["classes"])

    y = le.transform(df[task].astype(str))

    _, X_te, _, y_te = train_test_split(
        X.values,
        y,
        test_size=0.30,
        random_state=42,
        stratify=y,
    )

    _, Xs_te, _, _ = train_test_split(
        X_scaled,
        y,
        test_size=0.30,
        random_state=42,
        stratify=y,
    )

    dt = joblib.load(f"{MODELS_DIR}/{task}_dt.pkl")
    lr = joblib.load(f"{MODELS_DIR}/{task}_lr.pkl")

    dt_pred = dt.predict(X_te)
    lr_pred = lr.predict(Xs_te)

    task_results[task] = {
        "y_te": y_te,
        "dt_pred": dt_pred,
        "lr_pred": lr_pred,
        "classes": le.classes_,
        "dt_model": dt,
        "feat_cols": feat_cols,
    }

    print(f"  Loaded models for: {task}")


# ============================================================================
# Figure 4.3: Accuracy comparison bar chart
# ============================================================================
print("\nGenerating Figure 4.3 accuracy comparison...")

task_names = [TASK_LABELS[t] for t in TASKS]

dt_accs = [
    metrics[t]["decision_tree"]["accuracy"] * 100
    for t in TASKS
]

lr_accs = [
    metrics[t]["logistic_regression"]["accuracy"] * 100
    for t in TASKS
]

x = np.arange(len(TASKS))
width = 0.35

fig, ax = plt.subplots(figsize=(10, 6))

fig.patch.set_facecolor("white")
ax.set_facecolor("white")

bars1 = ax.bar(
    x - width / 2,
    dt_accs,
    width,
    label="Decision Tree",
    color=DT_COLOUR,
    edgecolor="white",
    linewidth=0.5,
)

bars2 = ax.bar(
    x + width / 2,
    lr_accs,
    width,
    label="Logistic Regression",
    color=LR_COLOUR,
    edgecolor="white",
    linewidth=0.5,
)

for bar in bars1:
    ax.annotate(
        f"{bar.get_height():.1f}%",
        xy=(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height(),
        ),
        xytext=(0, 5),
        textcoords="offset points",
        ha="center",
        va="bottom",
        fontsize=9,
        color="#333333",
    )

for bar in bars2:
    ax.annotate(
        f"{bar.get_height():.1f}%",
        xy=(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height(),
        ),
        xytext=(0, 5),
        textcoords="offset points",
        ha="center",
        va="bottom",
        fontsize=9,
        color="#333333",
    )

ax.axhline(
    y=80,
    color="red",
    linestyle="--",
    linewidth=1.2,
    alpha=0.7,
    label="80% target",
)

ax.set_xlabel(
    "Prediction Task",
    fontsize=12,
    labelpad=10,
)

ax.set_ylabel(
    "Accuracy (%)",
    fontsize=12,
    labelpad=10,
)

ax.set_xticks(x)
ax.set_xticklabels(task_names, fontsize=10)
ax.set_ylim(70, 105)

ax.yaxis.grid(
    True,
    color=GRID_COLOUR,
    linewidth=0.8,
)

ax.set_axisbelow(True)

ax.legend(
    fontsize=10,
    framealpha=0.9,
)

for spine in ["top", "right"]:
    ax.spines[spine].set_visible(False)

plt.tight_layout()

plt.savefig(
    f"{OUTPUT_DIR}/figure_4_3_accuracy_comparison.png",
    dpi=200,
    bbox_inches="tight",
)

plt.close()

print("  Saved figure_4_3_accuracy_comparison.png")


# ============================================================================
# Figure 4.4: Confusion matrices
# ============================================================================
print("Generating Figure 4.4 confusion matrices...")

fig, axes = plt.subplots(
    2,
    2,
    figsize=(14, 11),
)

fig.patch.set_facecolor("white")

for ax, task in zip(axes.flat, TASKS):
    r = task_results[task]

    cm = confusion_matrix(
        r["y_te"],
        r["dt_pred"],
    )

    disp = ConfusionMatrixDisplay(
        confusion_matrix=cm,
        display_labels=r["classes"],
    )

    disp.plot(
        ax=ax,
        colorbar=False,
        cmap="Blues",
        values_format="d",
    )

    ax.set_title(
        TASK_LABELS[task],
        fontsize=11,
        pad=8,
    )

    ax.set_xlabel(
        "Predicted Label",
        fontsize=9,
    )

    ax.set_ylabel(
        "True Label",
        fontsize=9,
    )

    ax.tick_params(
        axis="both",
        labelsize=8,
    )

    for text in disp.text_.ravel():
        text.set_fontsize(9)

plt.tight_layout()

plt.savefig(
    f"{OUTPUT_DIR}/figure_4_4_confusion_matrices.png",
    dpi=200,
    bbox_inches="tight",
)

plt.close()

print("  Saved figure_4_4_confusion_matrices.png")


# ============================================================================
# Figure 4.5: Per-class F1 scores
# ============================================================================
print("Generating Figure 4.5 per-class F1 scores...")

fig, axes = plt.subplots(
    2,
    2,
    figsize=(14, 10),
)

fig.patch.set_facecolor("white")

for ax, task in zip(axes.flat, TASKS):
    report_dt = metrics[task]["decision_tree"]["report"]
    report_lr = metrics[task]["logistic_regression"]["report"]
    classes = metrics[task]["classes"]

    dt_f1s = [
        report_dt[c]["f1-score"] * 100
        for c in classes
        if c in report_dt
    ]

    lr_f1s = [
        report_lr[c]["f1-score"] * 100
        for c in classes
        if c in report_lr
    ]

    valid_classes = [
        c
        for c in classes
        if c in report_dt
    ]

    x = np.arange(len(valid_classes))
    width = 0.35

    ax.set_facecolor("white")

    b1 = ax.bar(
        x - width / 2,
        dt_f1s,
        width,
        label="Decision Tree",
        color=DT_COLOUR,
        edgecolor="white",
    )

    b2 = ax.bar(
        x + width / 2,
        lr_f1s,
        width,
        label="Logistic Regression",
        color=LR_COLOUR,
        edgecolor="white",
    )

    ax.set_title(
        TASK_LABELS[task],
        fontsize=11,
        pad=8,
    )

    ax.set_ylabel(
        "F1 Score (%)",
        fontsize=9,
    )

    ax.set_xticks(x)

    ax.set_xticklabels(
        valid_classes,
        fontsize=8,
        rotation=15,
    )

    ax.set_ylim(0, 110)

    ax.yaxis.grid(
        True,
        color=GRID_COLOUR,
        linewidth=0.7,
    )

    ax.set_axisbelow(True)

    ax.legend(
        fontsize=8,
        framealpha=0.9,
    )

    for spine in ["top", "right"]:
        ax.spines[spine].set_visible(False)

    for bar in b1:
        ax.annotate(
            f"{bar.get_height():.0f}",
            xy=(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height(),
            ),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=7,
            color="#333333",
        )

    for bar in b2:
        ax.annotate(
            f"{bar.get_height():.0f}",
            xy=(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height(),
            ),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=7,
            color="#333333",
        )

plt.tight_layout()

plt.savefig(
    f"{OUTPUT_DIR}/figure_4_5_perclass_f1.png",
    dpi=200,
    bbox_inches="tight",
)

plt.close()

print("  Saved figure_4_5_perclass_f1.png")


# ============================================================================
# Figure 4.6: Feature importance
# ============================================================================
print("Generating Figure 4.6 feature importance...")

fig, axes = plt.subplots(
    2,
    2,
    figsize=(14, 10),
)

fig.patch.set_facecolor("white")

COLOURS = [
    "#2E75B6",
    "#4A9FD4",
    "#6DB8E8",
    "#A8D4F0",
    "#D0EAFA",
]

for ax, task in zip(axes.flat, TASKS):
    r = task_results[task]

    dt = r["dt_model"]
    feats = r["feat_cols"]
    importances = dt.feature_importances_

    indices = np.argsort(importances)[::-1][:5]
    top_vals = importances[indices]
    top_names = [feats[i] for i in indices]

    # Reverse the order so the highest value appears at the top
    top_vals = top_vals[::-1]
    top_names = top_names[::-1]

    ax.set_facecolor("white")

    bars = ax.barh(
        range(len(top_names)),
        top_vals * 100,
        color=COLOURS,
        edgecolor="white",
    )

    ax.set_yticks(
        range(len(top_names)),
    )

    ax.set_yticklabels(
        top_names,
        fontsize=9,
    )

    ax.set_xlabel(
        "Importance (%)",
        fontsize=9,
    )

    ax.set_title(
        TASK_LABELS[task],
        fontsize=11,
        pad=8,
    )

    ax.xaxis.grid(
        True,
        color=GRID_COLOUR,
        linewidth=0.7,
    )

    ax.set_axisbelow(True)

    for spine in ["top", "right"]:
        ax.spines[spine].set_visible(False)

    for bar, val in zip(bars, top_vals):
        ax.annotate(
            f"{val * 100:.1f}%",
            xy=(
                bar.get_width(),
                bar.get_y() + bar.get_height() / 2,
            ),
            xytext=(4, 0),
            textcoords="offset points",
            ha="left",
            va="center",
            fontsize=8,
            color="#333333",
        )

plt.tight_layout()

plt.savefig(
    f"{OUTPUT_DIR}/figure_4_6_feature_importance.png",
    dpi=200,
    bbox_inches="tight",
)

plt.close()

print("  Saved figure_4_6_feature_importance.png")


# ============================================================================
# Figure 4.2: Machine learning prediction flow
# ============================================================================
print("Generating Figure 4.2 ML prediction flow...")

fig, ax = plt.subplots(
    figsize=(13, 3.5),
)

fig.patch.set_facecolor("white")
ax.set_facecolor("white")
ax.axis("off")

steps = [
    ("Raw Inventory\nData", "#2E75B6"),
    ("Data Cleaning\n& Labelling", "#ED7D31"),
    ("Feature\nEngineering", "#9B59B6"),
    ("Train\nML Model", "#27AE60"),
    ("Risk\nPrediction", "#E74C3C"),
]

box_w = 0.14
box_h = 0.55
gap = 0.175
start_x = 0.04
y_centre = 0.50

for i, (label, colour) in enumerate(steps):
    x = start_x + i * gap

    fancy = mpatches.FancyBboxPatch(
        (x, y_centre - box_h / 2),
        box_w,
        box_h,
        boxstyle="round,pad=0.02",
        facecolor=colour,
        edgecolor="white",
        linewidth=1.5,
        transform=ax.transAxes,
        clip_on=False,
    )

    ax.add_patch(fancy)

    ax.text(
        x + box_w / 2,
        y_centre,
        label,
        transform=ax.transAxes,
        ha="center",
        va="center",
        fontsize=10,
        color="white",
        fontweight="bold",
        multialignment="center",
    )

    if i < len(steps) - 1:
        ax.annotate(
            "",
            xy=(
                x + gap,
                y_centre,
            ),
            xytext=(
                x + box_w + 0.005,
                y_centre,
            ),
            xycoords="axes fraction",
            textcoords="axes fraction",
            arrowprops=dict(
                arrowstyle="->",
                color="#555555",
                lw=2,
            ),
        )

plt.tight_layout()

plt.savefig(
    f"{OUTPUT_DIR}/figure_4_2_ml_flow.png",
    dpi=200,
    bbox_inches="tight",
)

plt.close()

print("  Saved figure_4_2_ml_flow.png")


# ============================================================================
# Finished
# ============================================================================
print(f"\n{'=' * 55}")
print(f"All charts saved to: {OUTPUT_DIR}/")
print(f"{'=' * 55}")

print("\nFiles generated:")

for f in sorted(os.listdir(OUTPUT_DIR)):
    size = os.path.getsize(f"{OUTPUT_DIR}/{f}") // 1024
    print(f"  {f} ({size} KB)")

print("\nInsert these images into your Chapter 4 Word document")
print("at the matching figure placeholder positions.")