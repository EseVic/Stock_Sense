const axios              = require("axios");
const { pool, useDB }    = require("../db");
const { ML_URL }         = require("../config");
const SalesHistoryModel  = require("../models/sales_history.model");
const InventoryModel     = require("../models/inventory.model");
const { applyPredictions } = require("../utils/inventory.utils");

const DAY_MS = 24 * 60 * 60 * 1000;

// Compare calendar dates only.
// This avoids reducing the remaining days because of the current time of day.
function toUtcDateOnly(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

function daysBetween(startValue, endValue) {
  const start = toUtcDateOnly(startValue);
  const end = toUtcDateOnly(endValue);

  if (start === null || end === null) {
    return null;
  }

  return Math.round((end - start) / DAY_MS);
}

function toMLRecord(r) {
  const qty_in = r.qty_in || 0;
  const qty_sold = r.qty_sold || 0;
  const qty_dmg = r.qty_damaged || 0;
  const shelf_life = r.shelf_life_days || 30;

  const has_expiry = shelf_life > 0 && !!r.expiry_date;

  // Use ?? instead of || so that 0 remains a valid value.
  let days_to_expiry = r.days_to_expiry ?? 9999;

  if (has_expiry) {
    const calculatedDays = daysBetween(
      new Date(),
      r.expiry_date,
    );

    if (calculatedDays !== null) {
      // Negative numbers are needed for already expired products.
      days_to_expiry = calculatedDays;
    }
  }

  const calculatedRestockDays =
    has_expiry &&
    r.restock_date &&
    r.expiry_date
      ? daysBetween(
          r.restock_date,
          r.expiry_date,
        )
      : null;

  const restock_days =
    calculatedRestockDays !== null
      ? Math.max(1, calculatedRestockDays)
      : Math.max(shelf_life, 1);

  const weekly_sales_rate = parseFloat(
    ((qty_sold / restock_days) * 7).toFixed(4),
  );

  const sell_through_rate = qty_in
    ? parseFloat((qty_sold / qty_in).toFixed(4))
    : 0;

  const wastage_rate = qty_in
    ? parseFloat((qty_dmg / qty_in).toFixed(4))
    : 0;

  const shelf_utilisation = has_expiry
    ? parseFloat(
        (
          1 -
          days_to_expiry /
            Math.max(shelf_life, 1)
        ).toFixed(4),
      )
    : 0;

  return {
    product_name: r.product_name,
    qty_in,
    qty_sold,
    qty_remaining: r.qty_remaining || 0,
    qty_damaged: qty_dmg,
    shelf_life_days: shelf_life,
    unit_price_ngn: r.unit_price || 0,
    total_revenue_ngn:
      (r.unit_price || 0) * qty_sold,
    demand_forecast:
      r.demand_forecast || 0,
    holiday_promo:
      r.holiday_promo || 0,
    restock_count:
      r.restock_count || 1,
    sell_through_rate,
    wastage_rate,
    weekly_sales_rate,
    days_to_expiry,
    shelf_utilisation,
    purchase_frequency:
      r.purchase_frequency || 1,
    total_units_sold_all:
      qty_sold,
    expiry_date:
      r.expiry_date || null,

    has_expiry,
  };
}

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
      let updatedInventoryId = null;
      try {
        if (inventory_id) {
          if (useDB) {
            await pool.query(
              `UPDATE inventory
               SET qty_sold      = qty_sold + $1,
                   qty_remaining = GREATEST(0, qty_remaining - $1)
               WHERE id = $2 AND user_id = $3`,
              [qtySoldInt, inventory_id, req.user.id]
            );
            updatedInventoryId = inventory_id;
          } else {
            const { memStore } = require("../db");
            const idx = memStore.inventory.findIndex(
              (i) => i.id === parseInt(inventory_id) && i.user_id === req.user.id
            );
            if (idx >= 0) {
              memStore.inventory[idx].qty_sold      = (memStore.inventory[idx].qty_sold || 0) + qtySoldInt;
              memStore.inventory[idx].qty_remaining = Math.max(0, (memStore.inventory[idx].qty_remaining || 0) - qtySoldInt);
              updatedInventoryId = inventory_id;
            }
          }
        } else {
          if (useDB) {
            const upd = await pool.query(
              `UPDATE inventory
               SET qty_sold      = qty_sold + $1,
                   qty_remaining = GREATEST(0, qty_remaining - $1)
               WHERE id = (
                 SELECT id FROM inventory
                 WHERE user_id = $2
                   AND LOWER(product_name) = LOWER($3)
                 ORDER BY created_at DESC
                 LIMIT 1
               ) RETURNING id`,
              [qtySoldInt, req.user.id, product_name]
            );
            if (upd.rows.length > 0) updatedInventoryId = upd.rows[0].id;
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
                updatedInventoryId = userItems[0].id;
              }
            }
          }
        }
      } catch (syncErr) {
        console.warn("Inventory sync warning:", syncErr.message);
      }

      // --- Auto re-predict the updated inventory item in background ---
      if (updatedInventoryId) {
        (async () => {
          try {
            const records = await InventoryModel.findByIds(
              { userId: req.user.id, ids: [updatedInventoryId] }, useDB
            );
            if (records.length) {
              const mlRecords = records.map(toMLRecord);
              const mlRes = await axios.post(
                `${ML_URL}/predict`,
                { records: mlRecords },
                { timeout: 30000 }
              );
              const predictions = mlRes.data.results || [];
              const updates = applyPredictions(predictions[0]?.predictions || {});
              await InventoryModel.updatePredictions({ id: updatedInventoryId, ...updates }, useDB);
              console.log(`✅ Auto-predicted ${product_name} after sale`);
            }
          } catch (mlErr) {
            console.log("Auto-predict after sale skipped:", mlErr.message);
          }
        })();
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