"""
StockSense Thesis — Figure Generator
Generates Figures 1–6 for Chapter 3 as clean PNG files.
Run: python3 generate_figures.py
Output: figures/fig1_crisp_dm.png ... figures/fig6_erd.png
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
import matplotlib.patheffects as pe
import numpy as np
import os

OUT = "figures"
os.makedirs(OUT, exist_ok=True)

# ── Shared style ──────────────────────────────────────────────────────────────
FONT = "DejaVu Sans"
DPI  = 180

def save(fig, name):
    path = os.path.join(OUT, name)
    fig.subplots_adjust(top=0.99, bottom=0.01, left=0.01, right=0.99)
    fig.savefig(path, dpi=DPI, bbox_inches="tight", pad_inches=0.05,
                facecolor='white', edgecolor='none')
    plt.close(fig)
    print(f"  Saved {path}")


# ═══════════════════════════════════════════════════════════════════════════════
# Figure 1 — CRISP-DM Process Model
# ═══════════════════════════════════════════════════════════════════════════════
def fig1_crisp_dm():
    fig, ax = plt.subplots(figsize=(8, 7))
    ax.set_xlim(0, 10); ax.set_ylim(1.2, 9.2)
    ax.axis('off')
    ax.set_facecolor('white')

    cx, cy = 5, 5   # centre

    # Centre circle
    centre = plt.Circle((cx, cy), 1.15, color='#1a1a2e', zorder=5)
    ax.add_patch(centre)
    ax.text(cx, cy+0.18, 'CRISP-DM', ha='center', va='center',
            fontsize=9, fontweight='bold', color='white', zorder=6)
    ax.text(cx, cy-0.3, 'Process', ha='center', va='center',
            fontsize=8, color='#cccccc', zorder=6)

    # 6 phases: label, sub-label, angle (degrees), colour
    phases = [
        ("Business\nUnderstanding", "Define inventory\nloss problem",    90,  '#2196F3'),
        ("Data\nUnderstanding",     "Explore inventory\ndatasets",        30,  '#4CAF50'),
        ("Data\nPreparation",       "Clean data,\ncreate labels",        330,  '#FF9800'),
        ("Modelling",               "Train Decision Tree\n& Logistic Reg.",270, '#9C27B0'),
        ("Evaluation",              "Test accuracy,\nprecision, recall", 210,  '#F44336'),
        ("Deployment",              "Launch web app\non AWS",            150,  '#009688'),
    ]

    r_box  = 2.65   # box centre distance from origin
    r_conn = 1.6    # where connector arrow ends near centre circle

    for label, sub, angle_deg, color in phases:
        θ = np.radians(angle_deg)
        bx = cx + r_box * np.cos(θ)
        by = cy + r_box * np.sin(θ)

        # Rounded box
        box = FancyBboxPatch((bx-1.1, by-0.65), 2.2, 1.3,
                             boxstyle="round,pad=0.12",
                             linewidth=0, facecolor=color, zorder=3)
        ax.add_patch(box)
        ax.text(bx, by+0.18, label, ha='center', va='center',
                fontsize=8, fontweight='bold', color='white', zorder=4,
                linespacing=1.3)
        ax.text(bx, by-0.3, sub, ha='center', va='center',
                fontsize=6.2, color='#f0f0f0', zorder=4, linespacing=1.25)

        # Connector line from centre circle edge to box
        ex = cx + r_conn * np.cos(θ)
        ey = cy + r_conn * np.sin(θ)
        bex = cx + (r_box - 1.15) * np.cos(θ)
        bey = cy + (r_box - 1.15) * np.sin(θ)
        ax.annotate("", xy=(bex, bey), xytext=(ex, ey),
                    arrowprops=dict(arrowstyle='-', color='#888888',
                                   lw=1.2), zorder=2)

    # Circular arrow (clockwise cycle) — draw arc segments between boxes
    for i, (_, _, a1, _) in enumerate(phases):
        a2 = phases[(i+1) % 6][2]
        # midpoint arc between the two boxes
        theta1 = a1 - 25
        theta2 = a2 + 25 if a2 > a1 else a2 + 385
        # simple arc via many small segments
        arc_r = 2.0
        angles = np.linspace(np.radians(theta1), np.radians(a1 - 5 + (
            360 if a2 < a1 else 0) + (a2 - a1) - 50), 20)
        xs = cx + arc_r * np.cos(angles)
        ys = cy + arc_r * np.sin(angles)
        ax.plot(xs, ys, color='#bbbbbb', lw=1.0, zorder=1)

    save(fig, 'fig1_crisp_dm.png')


# ═══════════════════════════════════════════════════════════════════════════════
# Figure 2 — Machine Learning Prediction Flow
# ═══════════════════════════════════════════════════════════════════════════════
def fig2_ml_flow():
    fig, ax = plt.subplots(figsize=(11, 5))
    ax.set_xlim(0, 11); ax.set_ylim(0.7, 6.2)
    ax.axis('off')

    def box(x, y, w, h, label, sub=None, color='#2196F3', text_color='white', fs=8.5):
        rect = FancyBboxPatch((x - w/2, y - h/2), w, h,
                              boxstyle="round,pad=0.1", linewidth=0,
                              facecolor=color, zorder=3)
        ax.add_patch(rect)
        dy = 0.15 if sub else 0
        ax.text(x, y + dy, label, ha='center', va='center',
                fontsize=fs, fontweight='bold', color=text_color, zorder=4)
        if sub:
            ax.text(x, y - 0.28, sub, ha='center', va='center',
                    fontsize=6.5, color='#e0e0e0' if text_color=='white' else '#555555',
                    zorder=4)

    def arrow(x1, y1, x2, y2):
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color='#555555',
                                   lw=1.5, mutation_scale=14), zorder=2)

    def label(x, y, txt, fs=7):
        ax.text(x, y, txt, ha='center', va='center',
                fontsize=fs, color='#666666', style='italic')

    # Row 1 — Input pipeline
    box(1.0, 4.2, 1.6, 0.9, 'Inventory\nRecords', color='#37474F')
    box(2.9, 4.2, 1.6, 0.9, 'Feature\nEngineering', 'pandas / NumPy', color='#455A64')
    box(4.8, 4.2, 1.6, 0.9, 'Training\nDataset', '10,000 rows', color='#546E7A')

    arrow(1.82, 4.2, 2.08, 4.2)
    arrow(3.72, 4.2, 3.98, 4.2)

    # Row 1 — Models
    box(6.8, 5.0, 1.7, 0.85, 'Decision Tree', 'scikit-learn', color='#1565C0')
    box(6.8, 3.4, 1.7, 0.85, 'Logistic\nRegression', 'scikit-learn', color='#1565C0')

    arrow(5.62, 4.2, 5.95, 4.7)
    arrow(5.62, 4.2, 5.95, 3.7)

    # Branch lines
    ax.plot([5.95, 6.8-0.85], [4.7, 4.7], color='#555555', lw=1.5)
    ax.plot([5.95, 6.8-0.85], [3.7, 3.7], color='#555555', lw=1.5)
    ax.plot([5.95, 5.95], [3.7, 4.7], color='#555555', lw=1.5)

    # Model evaluation
    box(9.2, 4.2, 1.6, 1.7, 'Model\nEvaluation',
        'Accuracy · F1\nPrecision · Recall', color='#6A1B9A', fs=8)

    arrow(7.65, 5.0, 8.38, 4.6)
    arrow(7.65, 3.4, 8.38, 3.8)

    # Output row
    outputs = [
        (1.3, 1.8, 'Expiry Risk',     '#C62828'),
        (3.5, 1.8, 'Sales Velocity',  '#AD1457'),
        (5.7, 1.8, 'Customer\nPref.', '#558B2F'),
        (7.9, 1.8, 'Slow-Mover\nDetect.', '#E65100'),
    ]
    for ox, oy, ol, oc in outputs:
        box(ox, oy, 1.8, 0.85, ol, color=oc, fs=8)

    # Arrow from evaluation down to outputs area
    arrow(9.2, 3.3, 9.2, 2.55)
    ax.plot([9.2, 5.7 + 0.9], [2.55, 2.55], color='#555555', lw=1.5)
    ax.plot([9.2, 7.9 + 0.9], [2.55, 2.55], color='#555555', lw=1.5)
    for ox, oy, _, _ in outputs:
        ax.annotate("", xy=(ox, oy + 0.43), xytext=(ox, 2.55),
                    arrowprops=dict(arrowstyle='->', color='#555555',
                                   lw=1.3, mutation_scale=12), zorder=2)
        ax.plot([ox, ox], [2.55, 2.55], color='#555555', lw=1.5)

    # Connect eval to outputs via horizontal line
    ax.plot([1.3, 9.2], [2.55, 2.55], color='#555555', lw=1.5, zorder=1)

    # Section labels
    label(2.9, 5.3, 'Data Pipeline')
    label(6.8, 5.9, 'Classifiers')
    label(9.2, 5.3, 'Evaluation')
    label(5.0, 0.95, '4 Prediction Outputs')

    save(fig, 'fig2_ml_flow.png')


# ═══════════════════════════════════════════════════════════════════════════════
# Figure 3 — System Architecture Diagram
# ═══════════════════════════════════════════════════════════════════════════════
def fig3_system_arch():
    fig, ax = plt.subplots(figsize=(10, 7.5))
    ax.set_xlim(0, 10); ax.set_ylim(0.0, 10.0)
    ax.axis('off')

    def layer_bg(y1, y2, color, label):
        rect = mpatches.FancyBboxPatch((0.2, y1), 9.6, y2-y1,
                                       boxstyle="round,pad=0.05",
                                       linewidth=0, facecolor=color, zorder=0)
        ax.add_patch(rect)
        ax.text(0.45, (y1+y2)/2, label, fontsize=7, color='#777777',
                va='center', rotation=90, fontweight='bold')

    def box(x, y, w, h, title, sub=None, color='#1E88E5', fs=8.5):
        rect = FancyBboxPatch((x-w/2, y-h/2), w, h,
                              boxstyle="round,pad=0.12", linewidth=1.2,
                              edgecolor=color, facecolor=color+'22', zorder=3)
        ax.add_patch(rect)
        dy = 0.18 if sub else 0
        ax.text(x, y+dy, title, ha='center', va='center',
                fontsize=fs, fontweight='bold', color=color, zorder=4)
        if sub:
            ax.text(x, y-0.27, sub, ha='center', va='center',
                    fontsize=6.5, color='#666666', zorder=4)

    def arrow(x1, y1, x2, y2, label='', bidirect=False):
        style = '<->' if bidirect else '->'
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle=style, color='#555555',
                                   lw=1.4, mutation_scale=14), zorder=2)
        if label:
            mx, my = (x1+x2)/2, (y1+y2)/2
            ax.text(mx+0.12, my, label, fontsize=6.5, color='#888888',
                    va='center', style='italic')

    # Background layers
    layer_bg(8.5, 9.7, '#E3F2FD', 'User')
    layer_bg(6.8, 8.3, '#E8F5E9', 'Frontend')
    layer_bg(4.5, 6.5, '#FFF3E0', 'Backend')
    layer_bg(2.0, 4.2, '#F3E5F5', 'ML Service')
    layer_bg(0.1, 1.8, '#EFEBE9', 'Database')

    # Nodes
    box(5, 9.1, 2.2, 0.9, 'Business Owner', 'Web Browser', '#37474F')
    box(5, 7.55, 3.2, 1.1, 'React.js Frontend',
        'Login · Dashboard · Data Entry · CSV Upload', '#2196F3')
    box(5, 5.5, 3.2, 1.3, 'Node.js / Express\nBackend API',
        'Auth · Validation · REST endpoints', '#FF6F00')
    box(2.2, 3.1, 2.4, 1.3, 'Flask ML Service',
        'Decision Tree · Logistic Reg.\nPrediction endpoint', '#7B1FA2')
    box(7.8, 3.1, 2.4, 1.3, 'PostgreSQL\nDatabase',
        'Users · Products\nInventory · Predictions', '#2E7D32')
    box(5, 1.0, 3.0, 1.0, 'AWS (EC2 + RDS)',
        'Cloud deployment infrastructure', '#BF360C')

    # Arrows
    arrow(5, 8.65, 5, 8.12)                          # User → Frontend
    arrow(5, 7.0, 5, 6.15, 'REST API / HTTPS', True) # Frontend ↔ Backend
    arrow(3.6, 5.1, 2.8, 3.75, '/predict', True)     # Backend ↔ Flask
    arrow(6.4, 5.1, 7.2, 3.75, 'SQL queries', True)  # Backend ↔ DB
    arrow(5, 4.85, 5, 1.52, 'Hosted on', False)       # Backend → AWS (dashed)

    save(fig, 'fig3_system_arch.png')



# ═══════════════════════════════════════════════════════════════════════════════
# Figure 4 — Data Flow Diagram Level 0
# ═══════════════════════════════════════════════════════════════════════════════
def fig4_dfd():
    fig, ax = plt.subplots(figsize=(9, 6))
    ax.set_xlim(0, 9); ax.set_ylim(0, 6)
    ax.axis('off')
    ax.set_facecolor('white')
 
    def entity(x, y, w, h, label):
        ax.add_patch(mpatches.Rectangle((x - w/2, y - h/2), w, h,
                     linewidth=2, edgecolor='#263238', facecolor='#ECEFF1', zorder=3))
        ax.text(x, y, label, ha='center', va='center',
                fontsize=9, fontweight='bold', color='#263238', zorder=4, linespacing=1.4)
 
    def process(x, y, w, h, label, sub=None):
        ax.add_patch(FancyBboxPatch((x - w/2, y - h/2), w, h,
                     boxstyle='round,pad=0.15', linewidth=2,
                     edgecolor='#1565C0', facecolor='#E3F2FD', zorder=3))
        yo = 0.22 if sub else 0
        ax.text(x, y + yo, label, ha='center', va='center',
                fontsize=9.5, fontweight='bold', color='#1565C0', zorder=4)
        if sub:
            ax.text(x, y - 0.3, sub, ha='center', va='center',
                    fontsize=7.5, color='#555555', zorder=4)
 
    def datastore(x, y, w, h, label):
        lx, rx, ty, by = x - w/2, x + w/2, y + h/2, y - h/2
        ax.add_patch(mpatches.Rectangle((lx, by), w, h,
                     linewidth=0, facecolor='#E8F5E9', zorder=2))
        ax.plot([lx, rx], [ty, ty], color='#2E7D32', lw=2, zorder=3)
        ax.plot([lx, rx], [by, by], color='#2E7D32', lw=2, zorder=3)
        ax.plot([lx, lx], [by, ty], color='#2E7D32', lw=2, zorder=3)
        ax.text(x, y, label, ha='center', va='center',
                fontsize=9, fontweight='bold', color='#2E7D32', zorder=4)
 
    def arrow(x1, y1, x2, y2, label=''):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color='#444444',
                                   lw=1.6, mutation_scale=16), zorder=4)
        if label:
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            ax.text(mx, my + 0.15, label, ha='center', va='bottom',
                    fontsize=7.5, color='#333333', style='italic', zorder=5,
                    bbox=dict(boxstyle='round,pad=0.08', facecolor='white',
                              edgecolor='none', alpha=0.85))
 
    # Business Owner — left, vertically centred at 3.2
    entity(1.5, 3.2, 2.0, 1.1, 'Business\nOwner')
 
    # StockSense System — centre
    process(5.5, 3.2, 3.2, 1.6, 'StockSense System',
            'Validate · Classify · Recommend')
 
    # PostgreSQL — bottom centre aligned with process
    datastore(5.5, 1.1, 3.2, 0.75, 'PostgreSQL Database')
 
    # Arrows: entity <-> process
    arrow(2.52, 3.38, 3.88, 3.38, 'Inventory Records')
    arrow(3.88, 3.02, 2.52, 3.02, 'Predictions & Recommendations')
 
    # Arrows: process <-> datastore
    arrow(5.2, 2.38, 5.2, 1.48, '')
    arrow(5.8, 1.48, 5.8, 2.38, '')
    ax.text(5.0, 1.93, 'Store Records',    ha='right', va='center', fontsize=7.5, color='#333333', style='italic')
    ax.text(6.0, 1.93, 'Retrieve Records', ha='left',  va='center', fontsize=7.5, color='#333333', style='italic')
 
    # Legend — bottom left
    lx, ly = 0.2, 0.15
    for i, (patch, txt) in enumerate([
        (mpatches.Rectangle((0,0),1,1, lw=1.5, edgecolor='#263238', facecolor='#ECEFF1'), 'External Entity'),
        (FancyBboxPatch((0,0),1,1, boxstyle='round,pad=0.05', lw=1.5, edgecolor='#1565C0', facecolor='#E3F2FD'), 'Process'),
        (mpatches.Rectangle((0,0),1,1, lw=0, facecolor='#E8F5E9'), 'Data Store'),
    ]):
        row_y = ly + i * 0.35
        p = type(patch)((lx, row_y), 0.4, 0.25) if hasattr(patch, 'get_width') else patch
        # draw small coloured swatch manually
        if i == 0:
            ax.add_patch(mpatches.Rectangle((lx, row_y), 0.4, 0.25,
                         lw=1.5, edgecolor='#263238', facecolor='#ECEFF1', zorder=3))
        elif i == 1:
            ax.add_patch(FancyBboxPatch((lx, row_y), 0.4, 0.25,
                         boxstyle='round,pad=0.03', lw=1.5,
                         edgecolor='#1565C0', facecolor='#E3F2FD', zorder=3))
        else:
            ax.add_patch(mpatches.Rectangle((lx, row_y), 0.4, 0.25,
                         lw=0, facecolor='#E8F5E9', zorder=2))
            ax.plot([lx, lx+0.4], [row_y+0.25, row_y+0.25], color='#2E7D32', lw=1.5)
            ax.plot([lx, lx+0.4], [row_y,      row_y],      color='#2E7D32', lw=1.5)
            ax.plot([lx, lx],     [row_y,       row_y+0.25], color='#2E7D32', lw=1.5)
        ax.text(lx + 0.5, row_y + 0.125, txt, va='center', fontsize=7.5, color='#333333')
 
    save(fig, 'fig4_dfd.png')
 
 
# ═══════════════════════════════════════════════════════════════════════════════
# Figure 5 — Use Case Diagram
# ═══════════════════════════════════════════════════════════════════════════════
def fig5_use_case():
    fig, ax = plt.subplots(figsize=(12, 9))
    ax.set_xlim(0, 12); ax.set_ylim(0, 9)
    ax.axis('off')
    ax.set_facecolor('white')
 
    def usecase(x, y, label, color='#1565C0'):
        ax.add_patch(mpatches.Ellipse((x, y), 2.8, 0.82,
                     linewidth=1.8, edgecolor=color, facecolor=color+'18', zorder=3))
        ax.text(x, y, label, ha='center', va='center',
                fontsize=8.2, fontweight='bold', color=color, zorder=4)
 
    def actor(x, y, label):
        ax.add_patch(plt.Circle((x, y + 0.65), 0.27,
                     linewidth=1.5, edgecolor='#263238', facecolor='#ECEFF1', zorder=4))
        ax.plot([x, x],           [y + 0.38, y - 0.08], color='#263238', lw=1.6, zorder=4)
        ax.plot([x-0.42, x+0.42], [y + 0.2,  y + 0.2],  color='#263238', lw=1.6, zorder=4)
        ax.plot([x, x - 0.35],    [y - 0.08, y - 0.58], color='#263238', lw=1.6, zorder=4)
        ax.plot([x, x + 0.35],    [y - 0.08, y - 0.58], color='#263238', lw=1.6, zorder=4)
        ax.text(x, y - 0.9, label, ha='center', va='top',
                fontsize=8, fontweight='bold', color='#263238', linespacing=1.3, zorder=4)
 
    # System boundary
    SX, SY, SW, SH = 2.5, 0.4, 7.5, 8.0
    ax.add_patch(mpatches.FancyBboxPatch((SX, SY), SW, SH,
                 boxstyle='square,pad=0', linewidth=2,
                 edgecolor='#455A64', facecolor='#FAFAFA', zorder=0))
    ax.text(SX + SW/2, SY + SH + 0.1, 'StockSense System',
            ha='center', va='bottom', fontsize=11, fontweight='bold', color='#455A64')
 
    # Use case x-centre inside boundary
    UC_CX = SX + SW / 2  # = 6.25
 
    # Business Owner use cases (left column inside boundary)
    bo_cases_y = [7.2, 6.2, 5.2, 4.2, 3.2, 2.2, 1.2]
    bo_labels   = ['Register Account', 'Login', 'Enter Inventory Data',
                   'Upload CSV', 'View Predictions', 'View Recommendations',
                   'View Historical Data']
    bo_x = UC_CX - 1.0   # shift left so right column has room
    for y, lbl in zip(bo_cases_y, bo_labels):
        usecase(bo_x, y, lbl)
 
    # Admin use case (right column, top)
    admin_uc = (UC_CX + 1.6, 7.5)
    usecase(*admin_uc, 'Manage Users & System', '#B71C1C')
 
    # ML Service use case (right column, mid)
    ml_uc = (UC_CX + 1.6, 3.2)
    usecase(*ml_uc, 'Run ML Prediction', '#4A148C')
 
    # «include» dashed arrow from View Predictions → Run ML Prediction
    vp_right = bo_x + 1.4   # right edge of View Predictions ellipse
    ml_left  = ml_uc[0] - 1.4
    ax.annotate('', xy=(ml_left, ml_uc[1]), xytext=(vp_right, bo_cases_y[4]),
                arrowprops=dict(arrowstyle='->', color='#7B1FA2',
                                lw=1.3, linestyle='dashed'), zorder=3)
    ax.text((vp_right + ml_left)/2, bo_cases_y[4] + 0.18,
            '«include»', ha='center', fontsize=7.5, color='#7B1FA2', style='italic')
 
    # Actors
    bo_actor = (1.2, 3.9)   # Business Owner — left, vertically centred on their cases
    actor(*bo_actor, 'Business\nOwner')
    admin_actor = (1.2, 7.2)
    actor(*admin_actor, 'Admin')
    ml_actor = (10.8, 3.2)
    actor(*ml_actor, 'ML Service\n(internal)')
 
    # Association lines: Business Owner → each use case
    for y, _ in zip(bo_cases_y, bo_labels):
        ax.plot([bo_actor[0] + 0.27, bo_x - 1.4],
                [bo_actor[1], y],
                color='#666666', lw=1.1, zorder=2)
 
    # Admin → Manage Users use case
    ax.plot([admin_actor[0] + 0.27, admin_uc[0] - 1.4],
            [admin_actor[1],         admin_uc[1]],
            color='#666666', lw=1.1, zorder=2)
 
    # ML Service actor → Run ML Prediction use case
    ax.plot([ml_actor[0] - 0.27, ml_uc[0] + 1.4],
            [ml_actor[1],         ml_uc[1]],
            color='#666666', lw=1.1, zorder=2)
 
    save(fig, 'fig5_use_case.png')


# ═══════════════════════════════════════════════════════════════════════════════
# Figure 6 — Entity Relationship Diagram (ERD)
# ═══════════════════════════════════════════════════════════════════════════════
def fig6_erd():
    fig, ax = plt.subplots(figsize=(11, 7.5))
    ax.set_xlim(0, 11); ax.set_ylim(0.0, 8.8)
    ax.axis('off')

    # Entity table box
    def entity(x, y, name, fields, color='#1565C0', width=2.6):
        h_header = 0.52
        h_row    = 0.38
        total_h  = h_header + len(fields) * h_row
        top = y + total_h / 2

        # Header
        rect_h = mpatches.FancyBboxPatch((x - width/2, top - h_header),
                                         width, h_header,
                                         boxstyle="square,pad=0",
                                         linewidth=1.5, edgecolor=color,
                                         facecolor=color, zorder=3)
        ax.add_patch(rect_h)
        ax.text(x, top - h_header/2, name, ha='center', va='center',
                fontsize=9, fontweight='bold', color='white', zorder=4)

        # Rows
        for i, (pk, fname, ftype) in enumerate(fields):
            ry = top - h_header - (i+0.5) * h_row
            row_color = '#E3F2FD' if i % 2 == 0 else '#FAFAFA'
            rect_r = mpatches.FancyBboxPatch((x - width/2, ry - h_row/2),
                                              width, h_row,
                                              boxstyle="square,pad=0",
                                              linewidth=1, edgecolor=color+'55',
                                              facecolor=row_color, zorder=3)
            ax.add_patch(rect_r)
            prefix = '[PK] ' if pk == 'PK' else ('[FK] ' if pk == 'FK' else '     ')
            ax.text(x - width/2 + 0.1, ry, prefix + fname,
                    ha='left', va='center', fontsize=7, color='#222222', zorder=4)
            ax.text(x + width/2 - 0.1, ry, ftype,
                    ha='right', va='center', fontsize=6.5, color='#777777',
                    style='italic', zorder=4)

        return {'top': top - h_header/2,
                'bottom': top - h_header - len(fields)*h_row + h_row/2,
                'left': x - width/2, 'right': x + width/2,
                'cx': x, 'cy': y}

    def rel_line(x1, y1, x2, y2, label='1', label2='N'):
        ax.plot([x1, x2], [y1, y2], color='#555555', lw=1.5, zorder=1)
        mx, my = (x1+x2)/2, (y1+y2)/2
        # cardinality labels near ends
        dx, dy = x2-x1, y2-y1
        length = (dx**2 + dy**2)**0.5
        if length > 0:
            ux, uy = dx/length, dy/length
            ax.text(x1 + ux*0.35, y1 + uy*0.35, label,
                    fontsize=8, fontweight='bold', color='#B71C1C',
                    ha='center', va='center', zorder=5)
            ax.text(x2 - ux*0.35, y2 - uy*0.35, label2,
                    fontsize=8, fontweight='bold', color='#B71C1C',
                    ha='center', va='center', zorder=5)

    # Users entity
    u = entity(2.2, 6.5, 'Users', [
        ('PK', 'user_id',    'INT'),
        ('',  'name',        'VARCHAR'),
        ('',  'email',       'VARCHAR'),
        ('',  'password_hash','VARCHAR'),
        ('',  'created_at',  'TIMESTAMP'),
    ], color='#1565C0')

    # Products entity
    p = entity(7.8, 6.5, 'Products', [
        ('PK', 'product_id',   'INT'),
        ('FK', 'user_id',      'INT'),
        ('',  'product_name',  'VARCHAR'),
        ('',  'category',      'VARCHAR'),
        ('',  'shelf_life_days','INT'),
        ('',  'unit',          'VARCHAR'),
    ], color='#2E7D32')

    # InventoryRecords entity
    ir = entity(2.2, 2.2, 'InventoryRecords', [
        ('PK', 'record_id',   'INT'),
        ('FK', 'product_id',  'INT'),
        ('FK', 'user_id',     'INT'),
        ('',  'stock_in',     'FLOAT'),
        ('',  'stock_out',    'FLOAT'),
        ('',  'damaged',      'FLOAT'),
        ('',  'days_to_expiry','INT'),
        ('',  'recorded_at',  'TIMESTAMP'),
    ], color='#E65100', width=3.0)

    # Predictions entity
    pr = entity(7.8, 2.2, 'Predictions', [
        ('PK', 'pred_id',          'INT'),
        ('FK', 'record_id',        'INT'),
        ('',  'expiry_risk',       'VARCHAR'),
        ('',  'sales_velocity',    'VARCHAR'),
        ('',  'customer_pref',     'VARCHAR'),
        ('',  'slow_mover',        'VARCHAR'),
        ('',  'confidence_score',  'FLOAT'),
        ('',  'recommendation',    'TEXT'),
    ], color='#6A1B9A', width=3.0)

    # Relationships
    rel_line(u['right'], 6.5, p['left'], 6.5, '1', 'N')          # Users—Products
    rel_line(2.2, u['bottom'], 2.2, ir['top'], '1', 'N')          # Users—Inventory
    rel_line(p['cx'], p['bottom'], ir['right'], ir['cy'], '1','N') # Products—Inventory
    rel_line(ir['right'], ir['cy'], pr['left'], pr['cy'], '1','1') # Inventory—Predictions

    # Legend
    ax.text(5.5, 0.35, '[PK] Primary Key     [FK] Foreign Key     1 / N = Cardinality',
            ha='center', fontsize=8, color='#555555', style='italic')

    save(fig, 'fig6_erd.png')


# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# Auto-crop whitespace from all saved figures
# ═══════════════════════════════════════════════════════════════════════════════
def crop_all():
    from PIL import Image, ImageChops
    print("Cropping whitespace...")
    for fname in sorted(os.listdir(OUT)):
        if not fname.endswith('.png'):
            continue
        path = os.path.join(OUT, fname)
        img = Image.open(path).convert('RGB')
        bg = Image.new('RGB', img.size, (255, 255, 255))
        bbox = ImageChops.difference(img, bg).getbbox()
        if bbox:
            pad = 20
            cropped = img.crop((
                max(0, bbox[0] - pad),
                max(0, bbox[1] - pad),
                min(img.width,  bbox[2] + pad),
                min(img.height, bbox[3] + pad),
            ))
            cropped.save(path)
            print(f"  Cropped {fname}: {img.size} -> {cropped.size}")


# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print("Generating StockSense thesis figures...")
    fig1_crisp_dm()
    fig2_ml_flow()
    fig3_system_arch()
    fig4_dfd()
    fig5_use_case()
    fig6_erd()
    crop_all()
    print("Done. All figures saved to ./figures/")
