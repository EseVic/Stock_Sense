const axios          = require("axios");
const { ML_URL }     = require("../config");
const InventoryModel = require("../models/inventory.model");
const { useDB, pool } = require("../db");
const { buildPayload, applyPredictions } = require("../utils/inventory.utils");

const InventoryController = {
  async getAll(req, res) {
    try {
      const { page = 1, limit = 50, search = "", risk = "" } = req.query;
      const result = await InventoryModel.findAll(
        { userId: req.user.id, search, risk, page: parseInt(page), limit: parseInt(limit) },
        useDB
      );
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async create(req, res) {
    try {
      const records   = Array.isArray(req.body) ? req.body : [req.body];

        // Validate stock totals before saving to prevent negative inventory.
      for (const rec of records) {
        const qty_in  = parseInt(rec.qty_in, 10)      || 0;
        const qty_sold = parseInt(rec.qty_sold, 10)     || 0;
        const qty_dmg  = parseInt(rec.qty_damaged, 10)  || 0;
        const qty_adj  = parseInt(rec.qty_adjusted, 10) || 0;
        const rawRemaining = qty_in - qty_sold - qty_dmg + qty_adj;
        if (rawRemaining < 0) {
          return res.status(400).json({
            error: `"${rec.product_name || 'This product'}": qty in (${qty_in}) minus qty sold (${qty_sold}) and qty damaged (${qty_dmg}), plus qty adjusted (${qty_adj}), can't go below 0. That's ${Math.abs(rawRemaining)} more than what's physically possible.`,
          });
        }
      }

      const processed = [];

      for (const rec of records) {
        const payload = buildPayload(rec, req.user.id);
        const item    = await InventoryModel.create(payload, useDB);
        processed.push(item);
      }

      // Auto-predict via ML service
      try {
        const mlRes     = await axios.post(`${ML_URL}/predict`, { records: processed }, { timeout: 10000 });
        const predictions = mlRes.data.results || [];
        for (let i = 0; i < processed.length; i++) {
          const updates = applyPredictions(predictions[i]?.predictions || {});
          await InventoryModel.updatePredictions({ id: processed[i].id, ...updates }, useDB);
          Object.assign(processed[i], updates);
        }
      } catch (mlErr) {
        console.log("ML service unavailable — saved without predictions:", mlErr.message);
      }

      res.json({ saved: processed.length, items: processed });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const {
        product_name, category, unit_price, qty_in, qty_sold,
        qty_damaged, qty_adjusted, expiry_date, shelf_life_days, store_city
      } = req.body;

      if (!product_name || !qty_in) {
        return res.status(400).json({ error: "Product name and quantity in are required" });
      }

      const qty_in_int  = parseInt(qty_in);
      const qty_sold_int = parseInt(qty_sold || 0);
      const qty_dmg_int  = parseInt(qty_damaged || 0);
      const qty_adj_int  = parseInt(qty_adjusted || 0);
      const rawRemaining = qty_in_int - qty_sold_int - qty_dmg_int + qty_adj_int;

      if (rawRemaining < 0) {
        return res.status(400).json({
          error: `qty in (${qty_in_int}) minus qty sold (${qty_sold_int}) and qty damaged (${qty_dmg_int}), plus qty adjusted (${qty_adj_int}), can't go below 0. That's ${Math.abs(rawRemaining)} more than what's physically possible.`,
        });
      }

      const qty_remaining = rawRemaining;

      if (useDB) {
        const r = await pool.query(
          `UPDATE inventory
           SET product_name=$1, category=$2, unit_price=$3, qty_in=$4, qty_sold=$5,
               qty_damaged=$6, qty_adjusted=$7, qty_remaining=$8,
               expiry_date=$9, shelf_life_days=$10, store_city=$11
           WHERE id=$12 AND user_id=$13
           RETURNING *`,
          [
            product_name, category || 'Other', parseFloat(unit_price || 0),
            parseInt(qty_in), parseInt(qty_sold || 0),
            parseInt(qty_damaged || 0), parseInt(qty_adjusted || 0), qty_remaining,
            expiry_date || null, parseInt(shelf_life_days || 0), store_city || 'Lagos',
            parseInt(id), userId
          ]
        );
        if (!r.rows.length) return res.status(404).json({ error: "Item not found" });
        return res.json(r.rows[0]);
      } else {
        const { memStore } = require("../db");
        const idx = memStore.inventory.findIndex(i => i.id === parseInt(id) && i.user_id === userId);
        if (idx < 0) return res.status(404).json({ error: "Item not found" });
        Object.assign(memStore.inventory[idx], {
          product_name, category, unit_price: parseFloat(unit_price || 0),
          qty_in: parseInt(qty_in), qty_sold: parseInt(qty_sold || 0),
          qty_damaged: parseInt(qty_damaged || 0), qty_adjusted: parseInt(qty_adjusted || 0),
          qty_remaining, expiry_date: expiry_date || null,
          shelf_life_days: parseInt(shelf_life_days || 0), store_city: store_city || 'Lagos',
        });
        return res.json(memStore.inventory[idx]);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async remove(req, res) {
    try {
      await InventoryModel.delete({ id: req.params.id, userId: req.user.id }, useDB);
      res.json({ deleted: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};

module.exports = InventoryController;