const axios      = require("axios");
const { ml }     = require("../config");
const ML_URL     = ml.url;

const MLController = {
  async train(req, res) {
    try {
      const r = await axios.post(`${ML_URL}/train`, {}, { timeout: 120000 });
      res.json(r.data);
    } catch (e) {
      res.status(500).json({ error: "ML service error: " + e.message });
    }
  },

  async metrics(req, res) {
    try {
      const r = await axios.get(`${ML_URL}/metrics`, { timeout: 5000 });
      res.json(r.data);
    } catch (e) {
      res.status(500).json({ error: "ML service not available" });
    }
  },
};

module.exports = MLController;
