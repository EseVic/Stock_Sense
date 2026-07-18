# StockSense — AI-Powered Inventory Management System

StockSense is a full-stack inventory management platform built for Nigerian retail markets. It combines real-time stock tracking with machine learning predictions to help store managers make smarter decisions about expiry risk, sales velocity, customer preference, and slow-moving stock.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running with Docker (Recommended)](#running-with-docker-recommended)
  - [Running Locally (Without Docker)](#running-locally-without-docker)
- [ML Service](#ml-service)
  - [Prediction Tasks](#prediction-tasks)
  - [Models](#models)
  - [API Endpoints](#api-endpoints)
- [Backend API](#backend-api)
- [Frontend](#frontend)
- [Repository Structure](#repository-structure)
- [CI/CD](#cicd)
- [Contributing](#contributing)

---

## Overview

StockSense addresses a common problem in Nigerian retail: products expiring on shelves, poor demand forecasting, and manual restocking guesswork. The system provides:

- **Inventory management** — add, track, and manage stock with barcode scanning support
- **ML-powered predictions** — 4 classification tasks run on every product using dual models (Decision Tree + Logistic Regression)
- **Actionable recommendations** — plain-language advice per product (discount now, reorder soon, remove from shelf, etc.)
- **Purchase order management** — create and track orders from suppliers
- **Sales history tracking** — log and analyse historical sales data
- **Dashboard analytics** — key metrics and charts at a glance

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  React Frontend │────▶│  Node.js Backend │────▶│   PostgreSQL DB   │
│  (Vite + React) │     │  (Express REST)  │     │   (pg database)  │
│   Port 5173     │     │   Port 3001      │     │   Port 5432      │
└─────────────────┘     └────────┬─────────┘     └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │   ML Service     │
                        │  (Flask + sklearn)│
                        │   Port 5001      │
                        └──────────────────┘
```

All four services run as Docker containers and communicate over an internal Docker network. The frontend is served via Nginx in production.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Recharts, Axios |
| Backend | Node.js, Express, PostgreSQL (`pg`), JWT Auth, Nodemailer |
| ML Service | Python 3.10, Flask, scikit-learn, pandas, NumPy, Gunicorn |
| Database | PostgreSQL 15 |
| DevOps | Docker, Docker Compose, Nginx, Terraform,Kubernetes, GithubAction |

---

## Project Structure

```
stocksense/
├── docker-compose.yml          # Orchestrates all 4 services
├── SETUP_GUIDE.md
│
├── backend/                    # Node.js / Express API
│   ├── Dockerfile
│   ├── package.json
│   ├── app.js
│   └── src/
│       ├── config/             # App config and logger
│       ├── controllers/        # Route handlers (auth, inventory, ML, etc.)
│       ├── db/
│       │   └── migrations/     # 6 SQL migration files
│       ├── middleware/         # JWT auth middleware
│       ├── models/             # Data models (inventory, orders, sales, etc.)
│       ├── routes/             # Express route definitions
│       ├── services/           # Auth, email, token services
│       └── utils/
│
├── frontend/                   # React + Vite SPA
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   └── src/
│       ├── components/         # Layout, BarcodeScanner
│       ├── context/            # AuthContext
│       └── pages/              # Dashboard, Inventory, Predictions,
│                               # AddStock, Suppliers, PurchaseOrders,
│                               # SalesHistory, ModelMetrics, Auth pages
│
└── ml-service/                 # Python Flask ML API
    ├── Dockerfile
    ├── requirements.txt
    ├── app.py                  # Flask API server
    ├── train.py                # Model training script
    ├── data/                   # CSV dataset files
    └── models/                 # Trained .pkl model files (git-ignored)
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Git

For local development without Docker:
- Node.js 18+
- Python 3.10+
- PostgreSQL 15

---

### Environment Variables

Copy the example file and fill in your values:

```bash
cp backend/.env.example backend/.env
```


### Running with Docker (Recommended)

```bash
git clone https://github.com/EseVic/Stock_Sense.git
cd stocksense
docker-compose up --build
```

Once all containers are healthy:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| ML Service | http://localhost:5001 |
| PostgreSQL | localhost:5432 |

To stop:

```bash
docker-compose down
```

To stop and remove volumes (wipes the database):

```bash
docker-compose down -v
```

---

### Running Locally (Without Docker)

**1. Database**

Start PostgreSQL and create the database:

```bash
psql -U postgres -c "CREATE DATABASE stocksense;"
```

**2. Backend**

```bash
cd backend
npm install
npm run dev        # starts with nodemon on port 3001
```

Migrations run automatically on startup.

**3. ML Service**

```bash
cd ml-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Train models (first time only — needs the dataset in ml-service/data/)
python train.py

# Start the API
python app.py
```

**4. Frontend**

```bash
cd frontend
npm install
npm run dev        # starts Vite dev server on port 5173
```

---

## ML Service

The ML service is a standalone Flask API that trains and serves 8 scikit-learn models (2 models × 4 tasks).

### Prediction Tasks

| Task | Labels | What it tells you |
|---|---|---|
| `expiry_risk` | High / Medium / Low / Expired | How urgently a product needs to be discounted or removed |
| `sales_velocity` | Fast / Moderate / Slow | How quickly a product is selling |
| `customer_preference` | High / Medium / Low | How popular the product is with customers |
| `slow_mover` | Yes / No | Whether a product should be flagged for stock reduction |

### Models

Each task is trained with:

- **Decision Tree** (`max_depth=7`) — primary model, interpretable
- **Logistic Regression** — secondary model, used for comparison

Both are trained on a 70/30 stratified split. Per-task scalers and feature lists are saved alongside the models so that each task uses only its relevant features during inference.

**Model accuracy on held-out test set:**

| Task | DT Accuracy | DT F1 | LR Accuracy | LR F1 |
|---|---|---|---|---|
| expiry_risk | 95.24% | 93.23% | 95.39% | 93.14% |
| sales_velocity | 99.95% | 99.95% | 99.56% | 99.56% |
| customer_preference | 87.35% | 84.56% | 84.77% | 77.86% |
| slow_mover | 92.45% | 92.02% | 88.80% | 88.63% |

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Returns service status and number of models loaded |
| POST | `/train` | Re-trains all models from the dataset |
| POST | `/predict` | Runs all 4 predictions on one or more inventory records |
| GET | `/metrics` | Returns training metrics from the last run |

**Example `/predict` request:**

```json
POST /predict
{
  "records": [
    {
      "product_name": "Peak Milk 400g",
      "qty_in": 100,
      "qty_sold": 30,
      "qty_remaining": 70,
      "qty_damaged": 2,
      "days_to_expiry": 5,
      "shelf_life_days": 180,
      "unit_price_ngn": 1200,
      "total_revenue_ngn": 36000,
      "demand_forecast": 40,
      "holiday_promo": 0,
      "restock_count": 1
    }
  ]
}
```

**Example response:**

```json
{
  "status": "success",
  "results": [
    {
      "product_name": "Peak Milk 400g",
      "predictions": {
        "expiry_risk": {
          "label": "High",
          "confidence": 94.2,
          "dt": { "label": "High", "confidence": 94.2 },
          "lr": { "label": "High", "confidence": 91.7 },
          "recommendation": "⚠️ Discount Peak Milk 400g immediately — expiry is very close with 70 units still on shelf."
        },
        "sales_velocity": { ... },
        "customer_preference": { ... },
        "slow_mover": { ... }
      }
    }
  ]
}
```

---

## Backend API

The Express backend exposes a REST API at port `3001`.

**Authentication** uses JWT tokens. Protected routes require an `Authorization: Bearer <token>` header.

**Core route groups:**

| Prefix | Description |
|---|---|
| `/api/register`, `/api/login`, `/api/me`, etc. | Register, login, email verification, password reset (no `/auth` sub-prefix, and no logout endpoint — JWT is stateless) |
| `/api/inventory` | CRUD for inventory items (bulk create via JSON array; no file/CSV upload endpoint yet) |
| `/api/suppliers` | Supplier management |
| `/api/purchase-orders` | Create and track purchase orders |
| `/api/sales-history` | Log and retrieve sales records |
| `/api/stats` | Dashboard aggregates and KPIs |
| `/api/train`, `/api/metrics` | Proxy to the ML service for training and metrics (no `/ml` sub-prefix) |
| `/api/predict` | Proxy to the ML service for predictions |


Swagger/OpenAPI documentation is available at `/api/docs` when the backend is running.

---

## Frontend

The React SPA provides:

- **Dashboard** — stock KPIs, revenue chart, expiry alerts
- **Inventory** — searchable, filterable product table with inline editing
- **Add Stock** — form with barcode scanner (html5-qrcode)
- **Predictions** — run ML predictions on any inventory item and view recommendations
- **Model Metrics** — view accuracy and F1 scores for each trained model
- **Suppliers** — manage supplier records
- **Purchase Orders** — create and track restock orders
- **Sales History** — log sales and view historical trends
- **Auth pages** — login, register, email verify, forgot/reset password

---

