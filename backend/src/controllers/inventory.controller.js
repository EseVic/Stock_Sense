const axios          = require("axios");
const { ML_URL }     = require("../config");
const InventoryModel = require("../models/inventory.model");
const { useDB }      = require("../db");
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
      const processed = [];

      for (const rec of records) {
        const payload = buildPayload(rec, req.user.id);
        const item    = await InventoryModel.create(payload, useDB);
        processed.push(item);
      }

      // Auto-predict via ML service
      try {
        const mlRes      = await axios.post(`${ML_URL}/predict`, { records: processed }, { timeout: 10000 });
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
