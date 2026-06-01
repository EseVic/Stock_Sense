const app    = require("../app");
const { initDB } = require("./db");

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, () =>
    console.log(`✅ StockSense backend running on port ${PORT}`)
  );
});

const { ML_URL } = require('./config');
const axios = require('axios');

setTimeout(() => {
  axios.get(`${ML_URL}/health`, { timeout: 60000 })
    .then(() => console.log('✅ ML service is awake'))
    .catch((e) => console.warn('⚠️ ML wake-up ping failed:', e.message));
}, 3000);