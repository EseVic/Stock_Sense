const axios = require("axios");
const { ML_URL } = require("../config");

const MLController = {
  async train(req, res) {
    try {
      const r = await axios.post(`${ML_URL}/train`, {}, { timeout: 180000 });
      res.json(r.data);
    } catch (e) {
      console.error("ML train error:", {
        mlUrl: ML_URL,
        message: e.message,
        code: e.code,
        response: e.response?.data,
      });

      res.status(500).json({
        error: "ML service training failed",
        details: e.response?.data || e.message,
      });
    }
  },

  async metrics(req, res) {
    try {
      const r = await axios.get(`${ML_URL}/metrics`, { timeout: 60000 });
      res.json(r.data);
    } catch (e) {
      console.error("ML metrics error:", {
        mlUrl: ML_URL,
        message: e.message,
        code: e.code,
        response: e.response?.data,
      });

      res.status(500).json({
        error: "ML service not available",
        details: e.response?.data || e.message,
      });
    }
  },
};

module.exports = MLController;