require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET,  
  ML_URL:     process.env.ML_URL,      

  db: process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
      }
    : {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "stocksense",
      },
};
