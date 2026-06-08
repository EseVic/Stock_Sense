const axios = require("axios");
const { ML_URL } = require("../config");
const InventoryModel = require("../models/inventory.model");
const { useDB } = require("../db");
const { applyPredictions } = require("../utils/inventory.utils");

const DAY_MS = 24 * 60 * 60 * 1000;

// Convert database values safely into numbers.
function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

// Convert a date into UTC midnight.
// This prevents timezone differences from producing the wrong number of days.
function toUtcDateOnly(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
    );
  }

  const match = String(value)
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  return Date.UTC(year, month - 1, day);
}

function calendarDaysBetween(startDate, endDate) {
  const start = toUtcDateOnly(startDate);
  const end = toUtcDateOnly(endDate);

  if (start === null || end === null) return null;

  return Math.round((end - start) / DAY_MS);
}

function calculateDaysToExpiry(expiryDate) {
  if (!expiryDate) return 9999;

  const today = new Date().toISOString().slice(0, 10);
  const days = calendarDaysBetween(today, expiryDate);

  return days === null ? 9999 : days;
}

function calculateRestockDays(record, shelfLife, hasExpiry) {
  const calculatedDays =
    hasExpiry && record.restock_date && record.expiry_date
      ? calendarDaysBetween(record.restock_date, record.expiry_date)
      : null;

  return calculatedDays !== null
    ? Math.max(1, calculatedDays)
    : Math.max(1, shelfLife);
}

// Map database record names into the feature names expected by Python ML service.
function toMLRecord(record) {
  const qty_in = toNumber(record.qty_in);
  const qty_sold = toNumber(record.qty_sold);
  const qty_damaged = toNumber(record.qty_damaged);
  const qty_remaining = toNumber(
    record.qty_remaining,
    Math.max(0, qty_in - qty_sold - qty_damaged),
  );

  const shelf_life_days = toNumber(record.shelf_life_days, 30);

  // A product has an expiry rule whenever an expiry date exists.
  const has_expiry = Boolean(record.expiry_date);

  // A negative value is important because it means the product has expired.
  const days_to_expiry = has_expiry
    ? calculateDaysToExpiry(record.expiry_date)
    : 9999;

  const restock_days = calculateRestockDays(
    record,
    shelf_life_days,
    has_expiry,
  );

  const weekly_sales_rate = Number(
    ((qty_sold / restock_days) * 7).toFixed(4),
  );

  const sell_through_rate = qty_in
    ? Number((qty_sold / qty_in).toFixed(4))
    : 0;

  const wastage_rate = qty_in
    ? Number((qty_damaged / qty_in).toFixed(4))
    : 0;

  const shelf_utilisation = has_expiry
    ? Number(
        (
          1 -
          days_to_expiry / Math.max(shelf_life_days, 1)
        ).toFixed(4),
      )
    : 0;

  return {
    product_name: record.product_name,
    qty_in,
    qty_sold,
    qty_remaining,
    qty_damaged,
    shelf_life_days,
    unit_price_ngn: toNumber(record.unit_price),

    total_revenue_ngn: toNumber(record.unit_price) * qty_sold,
    demand_forecast: toNumber(record.demand_forecast),
    holiday_promo: toNumber(record.holiday_promo),
    restock_count: toNumber(record.restock_count, 1),
    sell_through_rate,
    wastage_rate,
    weekly_sales_rate,
    days_to_expiry,
    shelf_utilisation,
    purchase_frequency: toNumber(record.purchase_frequency, 1),
    total_units_sold_all: toNumber(record.total_units_sold_all, qty_sold),
    expiry_date: record.expiry_date || null,
    has_expiry,
  };
}

const PredictController = {
  async predict(req, res) {
    try {
      const { ids } = req.body;

      const records = await InventoryModel.findByIds(
        {
          userId: req.user.id,
          ids,
        },
        useDB,
      );

      if (!records.length) {
        return res.json({ results: [] });
      }

      // Send properly mapped and recalculated live records to Python.
      const mlRecords = records.map(toMLRecord);

      const mlRes = await axios.post(
        `${ML_URL}/predict`,
        {
          records: mlRecords,
        },
        {
          timeout: 90000,
        },
      );

      const predictions = mlRes.data.results || [];

      for (let i = 0; i < records.length; i++) {
        const updates = applyPredictions(
          predictions[i]?.predictions || {},
        );

        await InventoryModel.updatePredictions(
          {
            id: records[i].id,
            ...updates,
          },
          useDB,
        );

        Object.assign(records[i], updates);
      }

      return res.json({
        results: records.map((record, index) => ({
          ...record,
          predictions: predictions[index]?.predictions,
        })),
      });
    } catch (e) {
      console.error("ML batch prediction error:", {
        mlUrl: ML_URL,
        message: e.message,
        code: e.code,
        response: e.response?.data,
      });

      return res.status(500).json({
        error: "Prediction failed",
        details: e.response?.data || e.message,
      });
    }
  },

  async predictOne(req, res) {
    try {
      const itemId = parseInt(req.params.id, 10);

      const records = await InventoryModel.findByIds(
        {
          userId: req.user.id,
          ids: [itemId],
        },
        useDB,
      );

      if (!records.length) {
        return res.status(404).json({
          error: "Item not found",
        });
      }

      // CHANGED:
      // Send mapped live feature values.
      const mlRecords = records.map(toMLRecord);

      const mlRes = await axios.post(
        `${ML_URL}/predict`,
        {
          records: mlRecords,
        },
        {
          timeout: 90000,
        },
      );

      const predictions = mlRes.data.results || [];

      const updates = applyPredictions(
        predictions[0]?.predictions || {},
      );

      await InventoryModel.updatePredictions(
        {
          id: records[0].id,
          ...updates,
        },
        useDB,
      );

      Object.assign(records[0], updates);

      return res.json({
        results: [
          {
            ...records[0],
            predictions: predictions[0]?.predictions,
          },
        ],
      });
    } catch (e) {
      console.error("ML prediction error:", {
        mlUrl: ML_URL,
        message: e.message,
        code: e.code,
        response: e.response?.data,
      });

      return res.status(500).json({
        error: "Prediction failed",
        details: e.response?.data || e.message,
      });
    }
  },

  // What-If Simulator:
  // Run ML predictions without saving changes into the database.
  async simulate(req, res) {
    try {
      const {
        inventory_id,
        qty_sold,
        days_to_expiry,
      } = req.body;

      if (!inventory_id) {
        return res.status(400).json({
          error: "inventory_id is required",
        });
      }

      const records = await InventoryModel.findByIds(
        {
          userId: req.user.id,
          ids: [parseInt(inventory_id, 10)],
        },
        useDB,
      );

      if (!records.length) {
        return res.status(404).json({
          error: "Item not found",
        });
      }

      const base = records[0];

      // Start from a properly mapped live record.
      const liveBase = toMLRecord(base);

      const parsedQtySold = parseInt(qty_sold, 10);
      const parsedDays = parseInt(days_to_expiry, 10);

      const simQtySold =
        qty_sold !== undefined && Number.isFinite(parsedQtySold)
          ? parsedQtySold
          : liveBase.qty_sold;

      const simDays =
        days_to_expiry !== undefined && Number.isFinite(parsedDays)
          ? parsedDays
          : liveBase.days_to_expiry;

      const simRemaining = Math.max(
        0,
        liveBase.qty_in -
          simQtySold -
          liveBase.qty_damaged,
      );

      const restockDays = calculateRestockDays(
        base,
        liveBase.shelf_life_days,
        liveBase.has_expiry,
      );

      const simRecord = {
        ...liveBase,
        qty_sold: simQtySold,
        qty_remaining: simRemaining,
        total_revenue_ngn:
          liveBase.unit_price_ngn * simQtySold,

        sell_through_rate: liveBase.qty_in
          ? Number(
              (
                simQtySold / liveBase.qty_in
              ).toFixed(4),
            )
          : 0,

        weekly_sales_rate: Number(
          (
            (simQtySold / restockDays) *
            7
          ).toFixed(4),
        ),

        days_to_expiry: simDays,

        shelf_utilisation: liveBase.has_expiry
          ? Number(
              (
                1 -
                simDays /
                  Math.max(
                    liveBase.shelf_life_days,
                    1,
                  )
              ).toFixed(4),
            )
          : 0,
        use_days_to_expiry_override: true,
      };

      const mlRes = await axios.post(
        `${ML_URL}/predict`,
        {
          records: [simRecord],
        },
        {
          timeout: 30000,
        },
      );

      const predictions =
        mlRes.data.results?.[0]?.predictions || {};

      const recommendations = Object.values(predictions)
        .map((prediction) => prediction?.recommendation)
        .filter(Boolean);

      return res.json({
        product_name: base.product_name,
        simulated_values: {
          qty_sold: simQtySold,
          qty_remaining: simRemaining,
          days_to_expiry:
            simDays < 9999 ? simDays : null,
        },
        predictions,
        recommendations,
      });
    } catch (e) {
      console.error("Simulate error:", e.message);

      return res.status(500).json({
        error: "Simulation failed",
        details: e.message,
      });
    }
  },
};

module.exports = PredictController;