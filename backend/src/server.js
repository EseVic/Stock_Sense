const app    = require("../app");
const { initDB } = require("./db");

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, () =>
    console.log(`✅ StockSense backend running on port ${PORT}`)
  );
});
