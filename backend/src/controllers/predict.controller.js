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

const PredictController = {

  async predict(req, res) {
    try {
      const { ids } = req.body;
      const records = await InventoryModel.findByIds(
        { userId: req.user.id, ids },
        useDB,
      );
      if (!records.length) return res.json({ results: [] });

      const mlRes = await axios.post(
        `${ML_URL}/predict`,
        { records },
        { timeout: 90000 },
      );
      const predictions = mlRes.data.results || [];

      for (let i = 0; i < records.length; i++) {
        const updates = applyPredictions(predictions[i]?.predictions || {});

        // ── FIX START: Post-processing rules applied after ML predictions ────────

        // Rule 1 — Expiry correctness:
        // The ML model sometimes labels a product "Expired" when days_to_expiry is
        // just low but not actually 0. We correct this using the real days_to_expiry
        // value from the DB. Products with no expiry date are not touched here at all
        // because hasExpiry will be false, and the if block below won't run.
        const daysLeft  = records[i].days_to_expiry;
        const hasExpiry = !!records[i].expiry_date && daysLeft !== 9999;
        if (hasExpiry) {
          if (daysLeft <= 0) {
            updates.expiry_risk = "Expired"; // truly expired — force it
          } else if (updates.expiry_risk === "Expired") {
            updates.expiry_risk = "High";   // not expired yet — downgrade to High
          }
        }

        // Rule 2 — Consistency between sales_velocity and slow_mover:
        // A product cannot be both Fast-selling and a slow mover at the same time.
        if (updates.sales_velocity === "Fast" && updates.slow_mover === "Yes") {
          updates.slow_mover = "No";
        } else if (updates.sales_velocity === "Slow" && updates.slow_mover === "No") {
          updates.slow_mover = "Yes";
        }

        // ── FIX END ──────────────────────────────────────────────────────────────

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

      const mlRes = await axios.post(
        `${ML_URL}/predict`,
        { records },
        { timeout: 90000 },
      );
      const predictions = mlRes.data.results || [];

      const updates = applyPredictions(predictions[0]?.predictions || {});

      // ── FIX START: Post-processing rules applied after ML predictions ──────────

      // Rule 1 — Expiry correctness:
      // Same logic as the predict() function above. Products with no expiry date
      // are unaffected because hasExpiry will be false.
      const daysLeft  = records[0].days_to_expiry;
      const hasExpiry = !!records[0].expiry_date && daysLeft !== 9999;
      if (hasExpiry) {
        if (daysLeft <= 0) {
          updates.expiry_risk = "Expired"; // truly expired — force it
        } else if (updates.expiry_risk === "Expired") {
          updates.expiry_risk = "High";   // not expired yet — downgrade to High
        }
      }

      // Rule 2 — Consistency between sales_velocity and slow_mover:
      // A product cannot be both Fast-selling and a slow mover at the same time.
      if (updates.sales_velocity === "Fast" && updates.slow_mover === "Yes") {
        updates.slow_mover = "No";
      } else if (updates.sales_velocity === "Slow" && updates.slow_mover === "No") {
        updates.slow_mover = "Yes";
      }

      // ── FIX END ────────────────────────────────────────────────────────────────

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

  // What-If Simulator — runs ML on modified values without saving to DB
  async simulate(req, res) {
    try {
      const { inventory_id, qty_sold, days_to_expiry } = req.body;
      if (!inventory_id) return res.status(400).json({ error: "inventory_id is required" });

      // Load real record
      const records = await InventoryModel.findByIds(
        { userId: req.user.id, ids: [parseInt(inventory_id)] },
        useDB,
      );
      if (!records.length) return res.status(404).json({ error: "Item not found" });

      const base = records[0];

      // Build simulated record — override only what user changed
      const simQtySold = qty_sold      !== undefined ? parseInt(qty_sold)      : base.qty_sold;
      const simDays    = days_to_expiry !== undefined ? parseInt(days_to_expiry) : base.days_to_expiry;
      const simRemaining = Math.max(0, base.qty_in - simQtySold - (base.qty_damaged || 0));

      const shelf_life  = base.shelf_life_days || 30;
      const has_expiry  = shelf_life > 0 && !!base.expiry_date && simDays < 9999;
      const restock_days = has_expiry && base.restock_date && base.expiry_date
        ? Math.max(1, Math.round((new Date(base.expiry_date) - new Date(base.restock_date)) / (1000 * 60 * 60 * 24)))
        : Math.max(shelf_life, 1);

      const simRecord = {
        ...base,
        qty_sold:          simQtySold,
        qty_remaining:     simRemaining,
        days_to_expiry:    simDays,
        has_expiry,
        sell_through_rate: base.qty_in ? parseFloat((simQtySold / base.qty_in).toFixed(4)) : 0,
        weekly_sales_rate: parseFloat((simQtySold / restock_days * 7).toFixed(4)),
        shelf_utilisation: has_expiry
          ? parseFloat((1 - simDays / Math.max(shelf_life, 1)).toFixed(4))
          : 0,
      };

      // Send to ML — no DB save
      const mlRes = await axios.post(
        `${ML_URL}/predict`,
        { records: [simRecord] },
        { timeout: 30000 },
      );
      const predictions = mlRes.data.results?.[0]?.predictions || {};

      // Build recommendation list
      const recommendations = Object.values(predictions)
        .map(p => p?.recommendation)
        .filter(Boolean);

      res.json({
        product_name:    base.product_name,
        simulated_values: {
          qty_sold:      simQtySold,
          qty_remaining: simRemaining,
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