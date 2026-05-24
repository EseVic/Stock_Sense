const SalesHistoryModel = require("../models/sales_history.model");
const InventoryModel    = require("../models/inventory.model");
const { useDB }         = require("../db");
const { pool }          = require("../db");

const SalesHistoryController = {
  async getAll(req, res) {
    try {
      const { product, from, to, page = 1, limit = 30 } = req.query;
      const result = await SalesHistoryModel.findAll(
        { userId: req.user.id, product, from, to, page: parseInt(page), limit: parseInt(limit) },
        useDB
      );
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async getSummary(req, res) {
    try {
      const { days = 30 } = req.query;
      const [daily, topProducts] = await Promise.all([
        SalesHistoryModel.getDailySummary(req.user.id, days, useDB),
        SalesHistoryModel.getTopProducts(req.user.id, days, useDB),
      ]);
      res.json({ daily, topProducts });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async create(req, res) {
    try {
      const { product_name, category, store_city, qty_sold, unit_price, sale_date, inventory_id, notes } = req.body;
      if (!product_name || !qty_sold) return res.status(400).json({ error: "Product name and qty_sold are required" });

      const qtySoldInt = parseInt(qty_sold);

      const item = await SalesHistoryModel.create(
        {
          user_id:      req.user.id,
          inventory_id: inventory_id || null,
          product_name,
          category:     category   || "Other",
          store_city:   store_city || "Lagos",
          qty_sold:     qtySoldInt,
          unit_price:   parseFloat(unit_price || 0),
          sale_date:    sale_date  || new Date().toISOString().split("T")[0],
          notes:        notes      || null,
        },
        useDB
      );

      // --- Sync inventory: update qty_sold and qty_remaining ---
      try {
        if (inventory_id) {
          // Update by exact inventory_id if provided
          if (useDB) {
            await pool.query(
              `UPDATE inventory
               SET qty_sold      = qty_sold + $1,
                   qty_remaining = GREATEST(0, qty_remaining - $1)
               WHERE id = $2 AND user_id = $3`,
              [qtySoldInt, inventory_id, req.user.id]
            );
          } else {
            const { memStore } = require("../db");
            const idx = memStore.inventory.findIndex(
              (i) => i.id === parseInt(inventory_id) && i.user_id === req.user.id
            );
            if (idx >= 0) {
              memStore.inventory[idx].qty_sold      = (memStore.inventory[idx].qty_sold || 0) + qtySoldInt;
              memStore.inventory[idx].qty_remaining = Math.max(0, (memStore.inventory[idx].qty_remaining || 0) - qtySoldInt);
            }
          }
        } else {
          // Match by product name (most recent matching record for this user)
          if (useDB) {
            await pool.query(
              `UPDATE inventory
               SET qty_sold      = qty_sold + $1,
                   qty_remaining = GREATEST(0, qty_remaining - $1)
               WHERE id = (
                 SELECT id FROM inventory
                 WHERE user_id = $2
                   AND LOWER(product_name) = LOWER($3)
                 ORDER BY created_at DESC
                 LIMIT 1
               )`,
              [qtySoldInt, req.user.id, product_name]
            );
          } else {
            const { memStore } = require("../db");
            const userItems = memStore.inventory
              .filter((i) => i.user_id === req.user.id &&
                             i.product_name.toLowerCase() === product_name.toLowerCase())
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            if (userItems.length > 0) {
              const idx = memStore.inventory.findIndex((i) => i.id === userItems[0].id);
              if (idx >= 0) {
                memStore.inventory[idx].qty_sold      = (memStore.inventory[idx].qty_sold || 0) + qtySoldInt;
                memStore.inventory[idx].qty_remaining = Math.max(0, (memStore.inventory[idx].qty_remaining || 0) - qtySoldInt);
              }
            }
          }
        }
      } catch (syncErr) {
        console.warn("Inventory sync warning:", syncErr.message);
        // Non-fatal: sale was still logged
      }

      res.json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async remove(req, res) {
    try {
      await SalesHistoryModel.delete(req.params.id, req.user.id, useDB);
      res.json({ deleted: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};

module.exports = SalesHistoryController;