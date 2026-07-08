"""
MLOps Report Figure Generator
Generates all figures used in the FinTrust MLOps report.

Output: a folder called mlops_figures with all images inside.
"""

import os
import numpy as np
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Ellipse


# ============================================================================
# Configuration
# ============================================================================
OUTPUT_DIR = "mlops_figures"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Professional colours
BLUE_DARK = "#1F4E79"
BLUE = "#2E75B6"
BLUE_LIGHT = "#5B9BD5"
GREEN = "#548235"
RED = "#C00000"
PURPLE = "#7030A0"
GREY = "#666666"
GRID_COLOUR = "#E8E8E8"


# ============================================================================
# Figure 3: CRISP-DM Adapted for MLOps Methodology
# ============================================================================
print("Generating Figure 3 CRISP-DM adapted for MLOps methodology...")

fig, ax = plt.subplots(
    figsize=(9, 6),
)

fig.patch.set_facecolor("white")
ax.set_facecolor("white")

ax.set_xlim(0, 10)
ax.set_ylim(0, 7)
ax.axis("off")

steps = [
    ("1. Business\nUnderstanding", 5.0, 6.0, BLUE_DARK),
    ("2. Data\nUnderstanding", 8.0, 4.7, BLUE),
    ("3. Data\nPreparation", 8.0, 2.7, BLUE_LIGHT),
    ("4. Model\nTraining", 5.0, 1.2, GREEN),
    ("5. Model\nEvaluation", 2.0, 2.7, RED),
    ("6. Deployment\n& Monitoring", 2.0, 4.7, PURPLE),
]

points = [
    (x, y)
    for _, x, y, _ in steps
]

for i in range(len(points)):
    x1, y1 = points[i]
    x2, y2 = points[(i + 1) % len(points)]

    ax.plot(
        [x1, x2],
        [y1, y2],
        color=GREY,
        linewidth=1.2,
    )

for text, x, y, colour in steps:
    ellipse = Ellipse(
        (x, y),
        width=2.25,
        height=1.1,
        facecolor=colour,
        edgecolor="white",
        linewidth=1.5,
    )

    ax.add_patch(ellipse)

    ax.text(
        x,
        y,
        text,
        ha="center",
        va="center",
        fontsize=8.5,
        color="white",
        fontweight="bold",
        multialignment="center",
    )

ax.text(
    5,
    3.5,
    "Iterative\nML Lifecycle",
    ha="center",
    va="center",
    fontsize=11,
    color="#333333",
    fontweight="bold",
)

plt.tight_layout()

plt.savefig(
    f"{OUTPUT_DIR}/figure_3_crisp_dm_mlops_methodology.png",
    dpi=200,
    bbox_inches="tight",
)

plt.close()

print("  Saved figure_3_crisp_dm_mlops_methodology.png")


# ============================================================================
# Chart 1: Deployment Time Before vs After MLOps (days)
# ============================================================================
print("Generating Chart 1 deployment time before vs after MLOps...")

model_names = [
    "Fraud\nDetection",
    "Credit\nScoring",
    "Risk\nReviews",
    "Model\nUpdates",
]

before_mlops = [150, 120, 90, 60]
after_mlops = [2, 2, 1, 1]

x = np.arange(len(model_names))
width = 0.34

fig, ax = plt.subplots(
    figsize=(10, 5.2),
)

fig.patch.set_facecolor("white")
ax.set_facecolor("white")

bars1 = ax.bar(
    x - width / 2,
    before_mlops,
    width,
    label="Before MLOps (days)",
    color=RED,
    edgecolor="white",
    linewidth=0.5,
)

bars2 = ax.bar(
    x + width / 2,
    after_mlops,
    width,
    label="After MLOps (days)",
    color=GREEN,
    edgecolor="white",
    linewidth=0.5,
)

for bar in bars1:
    ax.annotate(
        f"{int(bar.get_height())}",
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
        f"{int(bar.get_height())}",
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

ax.set_xlabel(
    "Model Type",
    fontsize=11,
    labelpad=10,
)

ax.set_ylabel(
    "Days to Deploy",
    fontsize=11,
    labelpad=10,
)

ax.set_xticks(x)
ax.set_xticklabels(model_names, fontsize=9)

ax.yaxis.grid(
    True,
    color=GRID_COLOUR,
    linewidth=0.8,
)

ax.set_axisbelow(True)

ax.legend(
    fontsize=9,
    framealpha=0.9,
)

for spine in ["top", "right"]:
    ax.spines[spine].set_visible(False)

plt.tight_layout()

plt.savefig(
    f"{OUTPUT_DIR}/chart_1_deployment_time_before_vs_after_mlops.png",
    dpi=200,
    bbox_inches="tight",
)

plt.close()

print("  Saved chart_1_deployment_time_before_vs_after_mlops.png")


# ============================================================================
# Figure 1: FinTrust MLOps Pipeline - End-to-End Flow
# ============================================================================
print("Generating Figure 1 FinTrust MLOps pipeline...")

fig, ax = plt.subplots(
    figsize=(13, 3.8),
)

fig.patch.set_facecolor("white")
ax.set_facecolor("white")
ax.axis("off")

steps = [
    ("Data\nIngestion", "Kafka, S3", BLUE_DARK),
    ("Feature\nEngineering", "Spark, DVC", BLUE),
    ("Model\nTraining", "scikit-learn\nMLflow", BLUE_LIGHT),
    ("Validation\n& Testing", "Kubeflow\nGreat Exp.", RED),
    ("Deployment", "Docker\nKubernetes", GREEN),
    ("Monitoring\n& Drift", "Evidently AI\nPrometheus", PURPLE),
]

box_w = 0.12
box_h = 0.28
gap = 0.15
start_x = 0.04
y_centre = 0.62

for i, (label, tool, colour) in enumerate(steps):
    x0 = start_x + i * gap

    fancy = mpatches.FancyBboxPatch(
        (x0, y_centre - box_h / 2),
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
        x0 + box_w / 2,
        y_centre,
        label,
        transform=ax.transAxes,
        ha="center",
        va="center",
        fontsize=8.5,
        color="white",
        fontweight="bold",
        multialignment="center",
    )

    ax.text(
        x0 + box_w / 2,
        y_centre - 0.23,
        tool,
        transform=ax.transAxes,
        ha="center",
        va="top",
        fontsize=7,
        color="#333333",
        multialignment="center",
    )

    if i < len(steps) - 1:
        ax.annotate(
            "",
            xy=(x0 + gap, y_centre),
            xytext=(x0 + box_w + 0.005, y_centre),
            xycoords="axes fraction",
            textcoords="axes fraction",
            arrowprops=dict(
                arrowstyle="->",
                color="#555555",
                lw=1.8,
            ),
        )

# Automated feedback loop
left_x = start_x + box_w / 2
right_x = start_x + 5 * gap + box_w / 2
loop_y = 0.30

ax.plot(
    [right_x, right_x],
    [0.48, loop_y],
    transform=ax.transAxes,
    color=RED,
    linewidth=1.5,
)

ax.plot(
    [right_x, left_x],
    [loop_y, loop_y],
    transform=ax.transAxes,
    color=RED,
    linewidth=1.5,
)

ax.annotate(
    "",
    xy=(left_x, 0.48),
    xytext=(left_x, loop_y),
    xycoords="axes fraction",
    textcoords="axes fraction",
    arrowprops=dict(
        arrowstyle="->",
        color=RED,
        lw=1.5,
    ),
)

ax.text(
    0.46,
    0.22,
    "Automated Feedback Loop",
    transform=ax.transAxes,
    ha="center",
    va="center",
    fontsize=8,
    color=RED,
    fontweight="bold",
)

plt.tight_layout()

plt.savefig(
    f"{OUTPUT_DIR}/figure_1_fintrust_mlops_pipeline.png",
    dpi=200,
    bbox_inches="tight",
)

plt.close()

print("  Saved figure_1_fintrust_mlops_pipeline.png")


# ============================================================================
# Figure 4: Event-Based vs Schedule-Based Retraining
# ============================================================================
print("Generating Figure 4 event-based vs schedule-based retraining...")

fig, ax = plt.subplots(
    figsize=(12, 5.5),
)

fig.patch.set_facecolor("white")
ax.set_facecolor("white")
ax.axis("off")

# Left panel
left_panel = mpatches.FancyBboxPatch(
    (0.07, 0.13),
    0.38,
    0.75,
    boxstyle="round,pad=0.02",
    facecolor="white",
    edgecolor=RED,
    linewidth=1.5,
    transform=ax.transAxes,
    clip_on=False,
)

ax.add_patch(left_panel)

ax.text(
    0.26,
    0.83,
    "Event-Based Retraining",
    transform=ax.transAxes,
    ha="center",
    va="center",
    fontsize=11,
    color=RED,
    fontweight="bold",
)

event_steps = [
    ("Drift Detected\n(PSI > 0.25 / F1 drops)", RED),
    ("Alert Triggered\nImmediately", RED),
    ("Retraining Pipeline\nStarts Automatically", GREEN),
    ("New Model\nDeployed", GREEN),
]

event_y = [0.68, 0.53, 0.38, 0.23]

for (label, colour), y in zip(event_steps, event_y):
    fancy = mpatches.FancyBboxPatch(
        (0.12, y),
        0.28,
        0.09,
        boxstyle="round,pad=0.02",
        facecolor=colour,
        edgecolor="white",
        linewidth=1.2,
        transform=ax.transAxes,
        clip_on=False,
    )

    ax.add_patch(fancy)

    ax.text(
        0.26,
        y + 0.045,
        label,
        transform=ax.transAxes,
        ha="center",
        va="center",
        fontsize=7.8,
        color="white",
        fontweight="bold",
        multialignment="center",
    )

ax.text(
    0.12,
    0.09,
    "✓ Fast response     ✗ Unpredictable cost",
    transform=ax.transAxes,
    ha="left",
    va="center",
    fontsize=8,
    color="#333333",
)

# Right panel
right_panel = mpatches.FancyBboxPatch(
    (0.55, 0.13),
    0.38,
    0.75,
    boxstyle="round,pad=0.02",
    facecolor="white",
    edgecolor=BLUE,
    linewidth=1.5,
    transform=ax.transAxes,
    clip_on=False,
)

ax.add_patch(right_panel)

ax.text(
    0.74,
    0.83,
    "Schedule-Based Retraining",
    transform=ax.transAxes,
    ha="center",
    va="center",
    fontsize=11,
    color=BLUE,
    fontweight="bold",
)

schedule_steps = [
    ("Weekly Timer\nTriggers Pipeline", BLUE),
    ("Fresh Data\nPulled & Prepared", BLUE),
    ("Model Retrained\n& Validated", GREEN),
    ("New Model\nDeployed", GREEN),
]

schedule_y = [0.68, 0.53, 0.38, 0.23]

for (label, colour), y in zip(schedule_steps, schedule_y):
    fancy = mpatches.FancyBboxPatch(
        (0.60, y),
        0.28,
        0.09,
        boxstyle="round,pad=0.02",
        facecolor=colour,
        edgecolor="white",
        linewidth=1.2,
        transform=ax.transAxes,
        clip_on=False,
    )

    ax.add_patch(fancy)

    ax.text(
        0.74,
        y + 0.045,
        label,
        transform=ax.transAxes,
        ha="center",
        va="center",
        fontsize=7.8,
        color="white",
        fontweight="bold",
        multialignment="center",
    )

ax.text(
    0.60,
    0.09,
    "✓ Predictable cost     ✗ May miss between-run drift",
    transform=ax.transAxes,
    ha="left",
    va="center",
    fontsize=8,
    color="#333333",
)

plt.tight_layout()

plt.savefig(
    f"{OUTPUT_DIR}/figure_4_event_vs_schedule_retraining.png",
    dpi=200,
    bbox_inches="tight",
)

plt.close()

print("  Saved figure_4_event_vs_schedule_retraining.png")


# ============================================================================
# Figure 2: Drift Detection and Response Framework
# ============================================================================
print("Generating Figure 2 drift detection and response framework...")

fig, ax = plt.subplots(
    figsize=(13, 3.8),
)

fig.patch.set_facecolor("white")
ax.set_facecolor("white")
ax.axis("off")

steps = [
    ("Every 6 hrs\nEvidently AI\nruns drift report", "Continuous\nMonitoring", BLUE_DARK),
    ("PSI > 0.25 or\nF1 drops 5%?\nAlert fired", "Drift\nAlert", RED),
    ("Kubeflow\nautomatically\nretrains model", "Auto\nRetraining", GREEN),
    ("New model\npasses\nvalidation?", "Validation\nGate", PURPLE),
    ("MLOps engineer\napproves\npromotion", "Human\nSign-off", BLUE),
    ("Blue-green\ndeployment\nno downtime", "Safe\nDeployment", GREEN),
]

box_w = 0.12
box_h = 0.30
gap = 0.15
start_x = 0.04
y_centre = 0.62

for i, (label, subtitle, colour) in enumerate(steps):
    x0 = start_x + i * gap

    fancy = mpatches.FancyBboxPatch(
        (x0, y_centre - box_h / 2),
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
        x0 + box_w / 2,
        y_centre,
        label,
        transform=ax.transAxes,
        ha="center",
        va="center",
        fontsize=7.5,
        color="white",
        fontweight="bold",
        multialignment="center",
    )

    ax.text(
        x0 + box_w / 2,
        y_centre - 0.25,
        subtitle,
        transform=ax.transAxes,
        ha="center",
        va="top",
        fontsize=7,
        color="#333333",
        multialignment="center",
    )

    if i < len(steps) - 1:
        ax.annotate(
            "",
            xy=(x0 + gap, y_centre),
            xytext=(x0 + box_w + 0.005, y_centre),
            xycoords="axes fraction",
            textcoords="axes fraction",
            arrowprops=dict(
                arrowstyle="->",
                color="#555555",
                lw=1.8,
            ),
        )

ax.text(
    0.50,
    0.12,
    "If validation fails → rollback",
    transform=ax.transAxes,
    ha="center",
    va="center",
    fontsize=11,
    color=RED,
    fontweight="bold",
)

plt.tight_layout()

plt.savefig(
    f"{OUTPUT_DIR}/figure_2_drift_detection_response_framework.png",
    dpi=200,
    bbox_inches="tight",
)

plt.close()

print("  Saved figure_2_drift_detection_response_framework.png")


# ============================================================================
# Finished
# ============================================================================
print(f"\n{'=' * 55}")
print(f"All figures saved to: {OUTPUT_DIR}/")
print(f"{'=' * 55}")

print("\nFiles generated:")

for f in sorted(os.listdir(OUTPUT_DIR)):
    size = os.path.getsize(f"{OUTPUT_DIR}/{f}") // 1024
    print(f"  {f} ({size} KB)")

print("\nInsert these images into your Word document")
print("at the matching figure or chart placeholder positions.")