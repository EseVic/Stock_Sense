const { pool, memStore } = require("../db");

const UserModel = {
  async findByEmail(email, useDB) {
    if (useDB) {
      const r = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
      return r.rows[0] || null;
    }
    return memStore.users.find((u) => u.email === email) || null;
  },

  async findById(id, useDB) {
    if (useDB) {
      const r = await pool.query(
        "SELECT id, name, email, store_name, city, is_verified FROM users WHERE id=$1",
        [id]
      );
      return r.rows[0] || null;
    }
    const u = memStore.users.find((u) => u.id === id);
    if (!u) return null;
    return { id: u.id, name: u.name, email: u.email, store_name: u.store_name, city: u.city, is_verified: u.is_verified };
  },

  async create({ name, email, password, store_name, city, verify_token, verify_expires }, useDB) {
    if (useDB) {
      const r = await pool.query(
        `INSERT INTO users (name, email, password, store_name, city, verify_token, verify_expires, is_verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,false)
         RETURNING id, name, email, store_name, city, is_verified`,
        [name, email, password, store_name || "", city || "Lagos", verify_token, verify_expires]
      );
      return r.rows[0];
    }
    if (memStore.users.find((u) => u.email === email)) {
      const err = new Error("Email already registered");
      err.code = "23505";
      throw err;
    }
    const user = {
      id: memStore.users.length + 1,
      name, email, password,
      store_name: store_name || "My Store",
      city: city || "Lagos",
      is_verified: false,
      verify_token,
      verify_expires,
      reset_token: null,
      reset_expires: null,
    };
    memStore.users.push(user);
    return { id: user.id, name, email, store_name: user.store_name, city: user.city, is_verified: false };
  },

  async findByVerifyToken(token, useDB) {
    if (useDB) {
      const r = await pool.query("SELECT * FROM users WHERE verify_token=$1", [token]);
      return r.rows[0] || null;
    }
    return memStore.users.find((u) => u.verify_token === token) || null;
  },

  async markVerified(id, useDB) {
    if (useDB) {
      await pool.query(
        "UPDATE users SET is_verified=true, verify_token=NULL, verify_expires=NULL WHERE id=$1",
        [id]
      );
    } else {
      const u = memStore.users.find((u) => u.id === id);
      if (u) { u.is_verified = true; u.verify_token = null; u.verify_expires = null; }
    }
  },

  async setVerifyToken(id, token, expires, useDB) {
    if (useDB) {
      await pool.query(
        "UPDATE users SET verify_token=$1, verify_expires=$2 WHERE id=$3",
        [token, expires, id]
      );
    } else {
      const u = memStore.users.find((u) => u.id === id);
      if (u) { u.verify_token = token; u.verify_expires = expires; }
    }
  },

  async findByResetToken(token, useDB) {
    if (useDB) {
      const r = await pool.query("SELECT * FROM users WHERE reset_token=$1", [token]);
      return r.rows[0] || null;
    }
    return memStore.users.find((u) => u.reset_token === token) || null;
  },

  async setResetToken(id, token, expires, useDB) {
    if (useDB) {
      await pool.query(
        "UPDATE users SET reset_token=$1, reset_expires=$2 WHERE id=$3",
        [token, expires, id]
      );
    } else {
      const u = memStore.users.find((u) => u.id === id);
      if (u) { u.reset_token = token; u.reset_expires = expires; }
    }
  },

  async updatePassword(id, hashedPassword, useDB) {
    if (useDB) {
      await pool.query(
        "UPDATE users SET password=$1, reset_token=NULL, reset_expires=NULL WHERE id=$2",
        [hashedPassword, id]
      );
    } else {
      const u = memStore.users.find((u) => u.id === id);
      if (u) { u.password = hashedPassword; u.reset_token = null; u.reset_expires = null; }
    }
  },
};

module.exports = UserModel;