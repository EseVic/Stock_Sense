const SupplierModel = require("../models/supplier.model");
const { useDB }     = require("../db");

const SupplierController = {
  async getAll(req, res) {
    try {
      const items = await SupplierModel.findAll(req.user.id, useDB);
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async create(req, res) {
    try {
      const { name, contact_name, phone, email, city, address, category, notes } = req.body;
      if (!name) return res.status(400).json({ error: "Supplier name is required" });

      const item = await SupplierModel.create(
        { user_id: req.user.id, name, contact_name, phone, email, city, address, category, notes },
        useDB
      );
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async update(req, res) {
    try {
      const { name, contact_name, phone, email, city, address, category, notes } = req.body;
      const item = await SupplierModel.update(
        req.params.id, req.user.id,
        { name, contact_name, phone, email, city, address, category, notes },
        useDB
      );
      if (!item) return res.status(404).json({ error: "Supplier not found" });
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async remove(req, res) {
    try {
      await SupplierModel.delete(req.params.id, req.user.id, useDB);
      res.json({ deleted: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};

module.exports = SupplierController;
