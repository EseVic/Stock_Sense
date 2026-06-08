// const axios          = require("axios");
// const { ML_URL }     = require("../config");
// const InventoryModel = require("../models/inventory.model");
// const { useDB }      = require("../db");
// const { applyPredictions } = require("../utils/inventory.utils");

// const PredictController = {

//   async predict(req, res) {
//     try {
//       const { ids } = req.body;
//       const records = await InventoryModel.findByIds(
//         { userId: req.user.id, ids },
//         useDB,
//       );
//       if (!records.length) return res.json({ results: [] });

//       const mlRes = await axios.post(
//         `${ML_URL}/predict`,
//         { records },
//         { timeout: 90000 },
//       );
//       const predictions = mlRes.data.results || [];

//       for (let i = 0; i < records.length; i++) {
//         const updates = applyPredictions(predictions[i]?.predictions || {});
//         await InventoryModel.updatePredictions(
//           { id: records[i].id, ...updates },
//           useDB,
//         );
//         Object.assign(records[i], updates);
//       }

//       res.json({
//         results: records.map((r, i) => ({
//           ...r,
//           predictions: predictions[i]?.predictions,
//         })),
//       });
//     } catch (e) {
//       res.status(500).json({ error: e.message });
//     }
//   },

//   async predictOne(req, res) {
//     try {
//       const itemId = parseInt(req.params.id);
//       const records = await InventoryModel.findByIds(
//         { userId: req.user.id, ids: [itemId] },
//         useDB,
//       );
//       if (!records.length)
//         return res.status(404).json({ error: "Item not found" });

//       const mlRes = await axios.post(
//         `${ML_URL}/predict`,
//         { records },
//         { timeout: 90000 },
//       );
//       const predictions = mlRes.data.results || [];

//       const updates = applyPredictions(predictions[0]?.predictions || {});
//       await InventoryModel.updatePredictions(
//         { id: records[0].id, ...updates },
//         useDB,
//       );
//       Object.assign(records[0], updates);

//       res.json({
//         results: [{ ...records[0], predictions: predictions[0]?.predictions }],
//       });
//     } catch (e) {
//       console.error("ML prediction error:", {
//         mlUrl: ML_URL,
//         message: e.message,
//         code: e.code,
//         response: e.response?.data,
//       });
//       res.status(500).json({
//         error: "Prediction failed",
//         details: e.response?.data || e.message,
//       });
//     }
//   },

//   // What-If Simulator — runs ML on modified values without saving to DB
//   async simulate(req, res) {
//     try {
//       const { inventory_id, qty_sold, days_to_expiry } = req.body;
//       if (!inventory_id) return res.status(400).json({ error: "inventory_id is required" });

//       // Load real record
//       const records = await InventoryModel.findByIds(
//         { userId: req.user.id, ids: [parseInt(inventory_id)] },
//         useDB,
//       );
//       if (!records.length) return res.status(404).json({ error: "Item not found" });

//       const base = records[0];

//       // Build simulated record — override only what user changed
//       const simQtySold = qty_sold      !== undefined ? parseInt(qty_sold)      : base.qty_sold;
//       const simDays    = days_to_expiry !== undefined ? parseInt(days_to_expiry) : base.days_to_expiry;
//       const simRemaining = Math.max(0, base.qty_in - simQtySold - (base.qty_damaged || 0));

//       const shelf_life  = base.shelf_life_days || 30;
//       const has_expiry  = shelf_life > 0 && !!base.expiry_date && simDays < 9999;
//       const restock_days = has_expiry && base.restock_date && base.expiry_date
//         ? Math.max(1, Math.round((new Date(base.expiry_date) - new Date(base.restock_date)) / (1000 * 60 * 60 * 24)))
//         : Math.max(shelf_life, 1);

//       const simRecord = {
//         ...base,
//         qty_sold:          simQtySold,
//         qty_remaining:     simRemaining,
//         days_to_expiry:    simDays,
//         has_expiry,
//         sell_through_rate: base.qty_in ? parseFloat((simQtySold / base.qty_in).toFixed(4)) : 0,
//         weekly_sales_rate: parseFloat((simQtySold / restock_days * 7).toFixed(4)),
//         shelf_utilisation: has_expiry
//           ? parseFloat((1 - simDays / Math.max(shelf_life, 1)).toFixed(4))
//           : 0,
//       };

//       // Send to ML — no DB save
//       const mlRes = await axios.post(
//         `${ML_URL}/predict`,
//         { records: [simRecord] },
//         { timeout: 30000 },
//       );
//       const predictions = mlRes.data.results?.[0]?.predictions || {};

//       // Build recommendation list
//       const recommendations = Object.values(predictions)
//         .map(p => p?.recommendation)
//         .filter(Boolean);

//       res.json({
//         product_name:    base.product_name,
//         simulated_values: {
//           qty_sold:      simQtySold,
//           qty_remaining: simRemaining,
//           days_to_expiry: simDays < 9999 ? simDays : null,
//         },
//         predictions,
//         recommendations,
//       });
//     } catch (e) {
//       console.error("Simulate error:", e.message);
//       res.status(500).json({ error: "Simulation failed", details: e.message });
//     }
//   },
// };

// module.exports = PredictController;


const axios          = require("axios");
const { ML_URL }     = require("../config");
const InventoryModel = require("../models/inventory.model");
const { useDB }      = require("../db");
const { applyPredictions } = require("../utils/inventory.utils");

// Recalculate features live and map DB field names to ML field names
function toMLRecord(r) {
  const qty_in   = r.qty_in   || 0;
  const qty_sold = r.qty_sold || 0;
  const qty_dmg  = r.qty_damaged || 0;
  const shelf_life = r.shelf_life_days || 30;

  // Recalculate days_to_expiry from today — not from stale DB value
  let days_to_expiry = 9999;
  const has_expiry = shelf_life > 0 && !!r.expiry_date;
  if (has_expiry) {
    const today = new Date();
    const exp   = new Date(r.expiry_date);
    days_to_expiry = Math.max(0, Math.round((exp - today) / (1000 * 60 * 60 * 24)));
  }

  const restock_days = has_expiry && r.restock_date && r.expiry_date
    ? Math.max(1, Math.round((new Date(r.expiry_date) - new Date(r.restock_date)) / (1000 * 60 * 60 * 24)))
    : Math.max(shelf_life, 1);

  // Recalculate all derived features from current qty values
  const weekly_sales_rate = parseFloat((qty_sold / restock_days * 7).toFixed(4));
  const sell_through_rate = qty_in ? parseFloat((qty_sold / qty_in).toFixed(4)) : 0;
  const wastage_rate      = qty_in ? parseFloat((qty_dmg  / qty_in).toFixed(4)) : 0;
  const shelf_utilisation = has_expiry
    ? parseFloat((1 - days_to_expiry / Math.max(shelf_life, 1)).toFixed(4))
    : 0;

  return {
    product_name:         r.product_name,
    // Map DB field names → ML field names
    qty_in,
    qty_sold,
    qty_remaining:        r.qty_remaining || 0,
    qty_damaged:          qty_dmg,
    shelf_life_days:      shelf_life,
    unit_price_ngn:       r.unit_price || 0,        // DB=unit_price → ML=unit_price_ngn
    total_revenue_ngn:    (r.unit_price || 0) * qty_sold,
    demand_forecast:      r.demand_forecast  || 0,
    holiday_promo:        r.holiday_promo    || 0,
    restock_count:        r.restock_count    || 1,
    sell_through_rate,
    wastage_rate,
    weekly_sales_rate,
    days_to_expiry,
    shelf_utilisation,
    purchase_frequency:   r.purchase_frequency || 1,
    total_units_sold_all: qty_sold,
    // Expiry control flag
    expiry_date:          r.expiry_date || null,
    has_expiry,
  };
}

const PredictController = {

  async predict(req, res) {
    try {
      const { ids } = req.body;
      const records = await InventoryModel.findByIds(
        { userId: req.user.id, ids },
        useDB,
      );
      if (!records.length) return res.json({ results: [] });

      const mlRecords = records.map(toMLRecord);

      const mlRes = await axios.post(
        `${ML_URL}/predict`,
        { records: mlRecords },
        { timeout: 90000 },
      );
      const predictions = mlRes.data.results || [];

      for (let i = 0; i < records.length; i++) {
        const updates = applyPredictions(predictions[i]?.predictions || {});
        await InventoryModel.updatePredictions(
          { id: records[i].id, ...updates },
          useDB,
        );
        Object.assign(records[i], updates);
      }

      res.json({
        results: records.map((r, i) => ({
          ...r,
          predictions: predictions[i]?.predictions,
        })),
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async predictOne(req, res) {
    try {
      const itemId = parseInt(req.params.id);
      const records = await InventoryModel.findByIds(
        { userId: req.user.id, ids: [itemId] },
        useDB,
      );
      if (!records.length)
        return res.status(404).json({ error: "Item not found" });

      const mlRecords = records.map(toMLRecord);

      const mlRes = await axios.post(
        `${ML_URL}/predict`,
        { records: mlRecords },
        { timeout: 90000 },
      );
      const predictions = mlRes.data.results || [];

      const updates = applyPredictions(predictions[0]?.predictions || {});
      await InventoryModel.updatePredictions(
        { id: records[0].id, ...updates },
        useDB,
      );
      Object.assign(records[0], updates);

      res.json({
        results: [{ ...records[0], predictions: predictions[0]?.predictions }],
      });
    } catch (e) {
      console.error("ML prediction error:", {
        mlUrl: ML_URL,
        message: e.message,
        code: e.code,
        response: e.response?.data,
      });
      res.status(500).json({
        error: "Prediction failed",
        details: e.response?.data || e.message,
      });
    }
  },

  async simulate(req, res) {
    try {
      const { inventory_id, qty_sold, days_to_expiry } = req.body;
      if (!inventory_id) return res.status(400).json({ error: "inventory_id is required" });

      const records = await InventoryModel.findByIds(
        { userId: req.user.id, ids: [parseInt(inventory_id)] },
        useDB,
      );
      if (!records.length) return res.status(404).json({ error: "Item not found" });

      const base = records[0];
      const simQtySold   = qty_sold       !== undefined ? parseInt(qty_sold)       : base.qty_sold;
      const simDays      = days_to_expiry !== undefined ? parseInt(days_to_expiry) : base.days_to_expiry;
      const simRemaining = Math.max(0, base.qty_in - simQtySold - (base.qty_damaged || 0));

      const shelf_life   = base.shelf_life_days || 30;
      const has_expiry   = shelf_life > 0 && !!base.expiry_date && simDays < 9999;
      const restock_days = has_expiry && base.restock_date && base.expiry_date
        ? Math.max(1, Math.round((new Date(base.expiry_date) - new Date(base.restock_date)) / (1000 * 60 * 60 * 24)))
        : Math.max(shelf_life, 1);

      const simRecord = {
        product_name:         base.product_name,
        qty_in:               base.qty_in || 0,
        qty_sold:             simQtySold,
        qty_remaining:        simRemaining,
        qty_damaged:          base.qty_damaged || 0,
        shelf_life_days:      shelf_life,
        unit_price_ngn:       base.unit_price || 0,
        total_revenue_ngn:    (base.unit_price || 0) * simQtySold,
        demand_forecast:      base.demand_forecast  || 0,
        holiday_promo:        base.holiday_promo    || 0,
        restock_count:        base.restock_count    || 1,
        sell_through_rate:    base.qty_in ? parseFloat((simQtySold / base.qty_in).toFixed(4)) : 0,
        wastage_rate:         base.qty_in ? parseFloat(((base.qty_damaged||0) / base.qty_in).toFixed(4)) : 0,
        weekly_sales_rate:    parseFloat((simQtySold / restock_days * 7).toFixed(4)),
        days_to_expiry:       simDays,
        shelf_utilisation:    has_expiry ? parseFloat((1 - simDays / Math.max(shelf_life, 1)).toFixed(4)) : 0,
        purchase_frequency:   base.purchase_frequency || 1,
        total_units_sold_all: simQtySold,
        expiry_date:          base.expiry_date || null,
        has_expiry,
      };

      const mlRes = await axios.post(
        `${ML_URL}/predict`,
        { records: [simRecord] },
        { timeout: 30000 },
      );
      const predictions = mlRes.data.results?.[0]?.predictions || {};
      const recommendations = Object.values(predictions)
        .map(p => p?.recommendation)
        .filter(Boolean);

      res.json({
        product_name:     base.product_name,
        simulated_values: {
          qty_sold:       simQtySold,
          qty_remaining:  simRemaining,
          days_to_expiry: simDays < 9999 ? simDays : null,
        },
        predictions,
        recommendations,
      });
    } catch (e) {
      console.error("Simulate error:", e.message);
      res.status(500).json({ error: "Simulation failed", details: e.message });
    }
  },
};

module.exports = PredictController;