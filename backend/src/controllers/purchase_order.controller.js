const PurchaseOrderModel = require("../models/purchase_order.model");
const InventoryModel     = require("../models/inventory.model");
const { useDB }          = require("../db");
const { buildPayload, applyPredictions } = require("../utils/inventory.utils");
const axios              = require("axios");
const { ML_URL }         = require("../config");

const PurchaseOrderController = {
  async getAll(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const result = await PurchaseOrderModel.findAll(
        { userId: req.user.id, status, page: parseInt(page), limit: parseInt(limit) },
        useDB
      );
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async create(req, res) {
    try {
      const { product_name, category, quantity, unit_price, supplier_id, order_date, expected_date, notes } = req.body;
      if (!product_name || !quantity) return res.status(400).json({ error: "Product name and quantity are required" });

      const item = await PurchaseOrderModel.create(
        {
          user_id:       req.user.id,
          product_name,
          category:      category      || "Other",
          quantity:      parseInt(quantity),
          unit_price:    parseFloat(unit_price || 0),
          supplier_id:   supplier_id   || null,
          order_date:    order_date    || new Date().toISOString().split("T")[0],
          expected_date: expected_date || null,
          notes:         notes         || null,
          status:        "pending",
        },
        useDB
      );
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async updateStatus(req, res) {
    try {
      const { status, received_date, notes, expiry_date, store_city } = req.body;
      if (!["pending", "received", "cancelled"].includes(status))
        return res.status(400).json({ error: "Invalid status" });

      const item = await PurchaseOrderModel.updateStatus(
        req.params.id, req.user.id,
        { status, received_date, notes },
        useDB
      );
      if (!item) return res.status(404).json({ error: "Order not found" });

      // When marked received -> auto-create inventory entry
      if (status === "received") {
        try {
          const restockDate = received_date || new Date().toISOString().split("T")[0];
          const payload = buildPayload(
            {
              product_name:       item.product_name,
              category:           item.category || "Other",
              qty_in:             item.quantity,
              qty_sold:           0,
              qty_damaged:        0,
              qty_adjusted:       0,
              unit_price:         item.unit_price || 0,
              restock_date:       restockDate,
              expiry_date:        expiry_date || null,
              store_city:         store_city  || "Lagos",
              shelf_life_days:    90,
              purchase_frequency: 1,
              restock_count:      1,
            },
            req.user.id
          );

          const invItem = await InventoryModel.create(payload, useDB);

          // Auto-predict the new inventory item
          try {
            const mlRes       = await axios.post(`${ML_URL}/predict`, { records: [invItem] }, { timeout: 10000 });
            const predictions = mlRes.data.results || [];
            const updates     = applyPredictions(predictions[0]?.predictions || {});
            await InventoryModel.updatePredictions({ id: invItem.id, ...updates }, useDB);
            Object.assign(invItem, updates);
          } catch (mlErr) {
            console.log("ML prediction skipped:", mlErr.message);
          }

          return res.json({ ...item, inventory_item: invItem });
        } catch (invErr) {
          console.error("Auto-inventory creation failed:", invErr.message);
          return res.json({ ...item, inventory_warning: invErr.message });
        }
      }

      res.json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async remove(req, res) {
    try {
      await PurchaseOrderModel.delete(req.params.id, req.user.id, useDB);
      res.json({ deleted: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};

module.exports = PurchaseOrderController;