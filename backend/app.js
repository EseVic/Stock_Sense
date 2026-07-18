const express = require("express");
const cors    = require("cors");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const authRoutes          = require("./src/routes/auth.routes");
const inventoryRoutes     = require("./src/routes/inventory.routes");
const predictRoutes       = require("./src/routes/predict.routes");
const statsRoutes         = require("./src/routes/stats.routes");
const mlRoutes            = require("./src/routes/ml.routes");
const supplierRoutes      = require("./src/routes/supplier.routes");
const purchaseOrderRoutes = require("./src/routes/purchase_order.routes");
const salesHistoryRoutes  = require("./src/routes/sales_history.routes");
const alertsRoutes        = require("./src/routes/alerts.routes");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "20mb" }));

// ── API docs (Swagger UI) ───────────────────────────────────────────────────
const openapiSpec = YAML.load(path.join(__dirname, "src/docs/openapi.yaml"));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api",                authRoutes);       
app.use("/api/inventory",      inventoryRoutes);
app.use("/api",                predictRoutes);
app.use("/api",                statsRoutes);
app.use("/api",                mlRoutes);
app.use("/api/suppliers",      supplierRoutes);
app.use("/api/purchase-orders",purchaseOrderRoutes);
app.use("/api/sales-history",  salesHistoryRoutes);
app.use("/api",                alertsRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  const { useDB } = require("./src/db");
  res.json({ status: "ok", db: useDB ? "postgres" : "memory", port: process.env.PORT || 3001 });
});

module.exports = app;
