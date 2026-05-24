const axios          = require("axios");
const { ML_URL }     = require("../config");
const InventoryModel = require("../models/inventory.model");
const { useDB }      = require("../db");
const { applyPredictions } = require("../utils/inventory.utils");

const PredictController = {
  // Predict all (or specific IDs via body)
  async predict(req, res) {
    try {
      const { ids } = req.body;
      const records = await InventoryModel.findByIds({ userId: req.user.id, ids }, useDB);
      if (!records.length) return res.json({ results: [] });

      const mlRes       = await axios.post(`${ML_URL}/predict`, { records }, { timeout: 30000 });
      const predictions = mlRes.data.results || [];

      for (let i = 0; i < records.length; i++) {
        const updates = applyPredictions(predictions[i]?.predictions || {});
        await InventoryModel.updatePredictions({ id: records[i].id, ...updates }, useDB);
        Object.assign(records[i], updates);
      }

      res.json({
        results: records.map((r, i) => ({ ...r, predictions: predictions[i]?.predictions })),
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  // Predict a single inventory item by its ID
  async predictOne(req, res) {
    try {
      const itemId = parseInt(req.params.id);
      const records = await InventoryModel.findByIds({ userId: req.user.id, ids: [itemId] }, useDB);
      if (!records.length) return res.status(404).json({ error: "Item not found" });

      const mlRes       = await axios.post(`${ML_URL}/predict`, { records }, { timeout: 15000 });
      const predictions = mlRes.data.results || [];

      const updates = applyPredictions(predictions[0]?.predictions || {});
      await InventoryModel.updatePredictions({ id: records[0].id, ...updates }, useDB);
      Object.assign(records[0], updates);

      res.json({
        results: [{ ...records[0], predictions: predictions[0]?.predictions }],
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};

module.exports = PredictController;