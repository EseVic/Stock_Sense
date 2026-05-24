# StockSense — Complete Setup & Run Guide
### Victoria Iria · MIT Project · MIVA Open University 2026

---

## What you are running

| Service | Technology | Port | Purpose |
|---|---|---|---|
| ML Service | Python + Flask + scikit-learn | 5001 | Trains models, serves predictions |
| Backend | Node.js + Express + PostgreSQL | 3001 | REST API, user auth, data storage |
| Frontend | React + Vite | 5173 (dev) / 5173 (Docker) | Web interface |

---

## OPTION A — Run without Docker (Recommended for development)

This is the easiest way to get started. You run each service in a separate terminal.

---

### STEP 1 — Install prerequisites

Make sure these are installed on your computer:

- **Python 3.10+** → https://www.python.org/downloads/
- **Node.js 18+** → https://nodejs.org/
- **Git** → https://git-scm.com/

To check versions, open a terminal and run:
```
python --version
node --version
npm --version
```

---

### STEP 2 — Copy your dataset into the ML service

Copy the cleaned inventory file you already have into the ml-service data folder:

```
# From the project root folder:
mkdir -p ml-service/data
cp path/to/03_inventory_cleaned.csv ml-service/data/03_inventory_cleaned.csv
```

If you are on Windows:
```
mkdir ml-service\data
copy 03_inventory_cleaned.csv ml-service\data\03_inventory_cleaned.csv
```

---

### STEP 3 — Start the ML Service (Terminal 1)

Open a new terminal and run:

```bash
cd stocksense/ml-service

# Create a Python virtual environment
python -m venv venv

# Activate it
# On Mac/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install Python packages
pip install -r requirements.txt

# Train the models first (this takes 1-2 minutes)
python train.py

# Start the Flask API
python app.py
```

You should see:
```
Loaded 9 model objects
✅ StockSense ML service running on port 5001
```

**Keep this terminal open.**

---

### STEP 4 — Start the Backend (Terminal 2)

Open a second terminal and run:

```bash
cd stocksense/backend

# Install Node packages
npm install

# Start the server
npm start
```

You should see:
```
⚠️  No PostgreSQL found — running in memory-only mode
✅ StockSense backend running on port 3001
```

> The app works in memory-only mode with no database setup needed.
> If you want data to persist between restarts, install PostgreSQL
> and create a database called `stocksense` (see Optional step below).

**Keep this terminal open.**

---

### STEP 5 — Start the Frontend (Terminal 3)

Open a third terminal and run:

```bash
cd stocksense/frontend

# Install packages
npm install

# Start the development server
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

---

### STEP 6 — Open the app

Open your browser and go to:
```
http://localhost:5173
```

Login with the demo account:
```
Email:    demo@stocksense.ng
Password: demo1234
```

Or click "Create account" to register your own account.

---

### STEP 7 — Load your data

**Option 1 — Upload your CSV:**
1. Click "Add Stock" in the sidebar
2. Click the "Upload CSV" tab
3. Upload your `03_inventory_cleaned.csv` file
4. Click "Save all & predict"

**Option 2 — Manual entry:**
1. Click "Add Stock" in the sidebar
2. Fill in the form fields
3. Click "+ Add to queue" for multiple products
4. Click "Save & predict"

---

### STEP 8 — View predictions

1. Go to **Predictions** in the sidebar
2. If predictions are not showing, click "Run all predictions"
3. Click any product card to expand its full recommendation
4. Use the filter buttons to see only high-risk or slow-mover products

---

### STEP 9 — View model metrics

1. Go to **Model Metrics** in the sidebar
2. If you see an error, click "Train / Retrain models"
3. You will see accuracy, F1, precision and recall for all 8 models

---

## OPTION B — Run with Docker (All services at once)

Use this when you want everything running with one command.

### Prerequisites
- Docker Desktop installed → https://www.docker.com/products/docker-desktop/

### Steps

```bash
# 1. Copy your dataset
mkdir -p ml-service/data
cp 03_inventory_cleaned.csv ml-service/data/

# 2. Build and start all services
cd stocksense
docker-compose up --build

# Wait about 2-3 minutes for everything to start
# Then open: http://localhost:5173
```

To stop everything:
```bash
docker-compose down
```

To stop and delete all data:
```bash
docker-compose down -v
```

---

## Optional — Set up PostgreSQL for persistent storage

If you want data to survive server restarts:

**Install PostgreSQL** → https://www.postgresql.org/download/

Then create the database:
```sql
CREATE DATABASE stocksense;
```

Copy the env file and set your credentials:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your DB password
```

Restart the backend and it will auto-create the tables.

---

## Project folder structure

```
stocksense/
├── ml-service/
│   ├── app.py              ← Flask prediction API
│   ├── train.py            ← Model training script
│   ├── requirements.txt    ← Python dependencies
│   ├── Dockerfile
│   ├── data/
│   │   └── 03_inventory_cleaned.csv   ← PUT YOUR DATA HERE
│   └── models/             ← Trained .pkl files saved here
│
├── backend/
│   ├── src/server.js       ← Express REST API
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── components/Layout.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx
│   │       ├── AddStock.jsx
│   │       ├── Inventory.jsx
│   │       ├── Predictions.jsx
│   │       └── ModelMetrics.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── nginx.conf
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Common problems and fixes

| Problem | Fix |
|---|---|
| "Cannot find module" in backend | Run `npm install` inside the backend folder |
| "No module named flask" | Run `pip install -r requirements.txt` inside ml-service with venv activated |
| "Models not trained yet" | Run `python train.py` inside ml-service first |
| "ML service not available" | Make sure `python app.py` is running in Terminal 1 |
| Frontend shows blank page | Check Terminal 3 for errors. Try `npm install` again |
| Login fails with demo account | Backend must be running on port 3001 |
| Data not saving between restarts | Set up PostgreSQL (memory mode resets on restart) |
| Port already in use | Kill the process: `lsof -ti:3001 \| xargs kill` (Mac/Linux) |

---

## For your dissertation Chapter 4

When writing up system implementation, reference:
- **ML Service**: `ml-service/train.py` for training methodology
- **Model files**: `ml-service/models/*.pkl` for trained artefacts
- **API endpoints**: Backend `/api/predict`, `/api/inventory`, `/api/stats`
- **Frontend**: React components in `frontend/src/pages/`

Screenshots to take for your report:
1. Dashboard showing stats cards and charts
2. Add Stock form with a filled-in product
3. Predictions page with expanded recommendation card
4. Model Metrics page showing accuracy comparison chart
