const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const { JWT_SECRET } = require("../config");
const UserModel      = require("../models/user.model");
const { useDB, pool } = require("../db");
const { sendVerificationEmail, sendResetPasswordEmail } = require("../services/email.service");

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

const AuthController = {
  async register(req, res) {
    const { name, email, password, store_name, city } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password are required" });

    try {
      const hash    = await bcrypt.hash(password, 10);
      const token   = makeToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await UserModel.create(
        { name, email, password: hash, store_name, city, verify_token: token, verify_expires: expires },
        useDB
      );

      console.log(`[register] User created id=${user.id}, verify_token=${token.slice(0,10)}...`);

      try {
        await sendVerificationEmail(email, name, token);
        console.log(`[register] Verification email sent to ${email}`);
      } catch (mailErr) {
        console.warn("[register] Email send failed:", mailErr.message);
      }

      return res.json({
        success: true,
        requiresVerification: true,
        message: "Account created! Please check your email and click the verification link before signing in.",
        email: email,
      });
    } catch (e) {
      if (e.code === "23505") return res.status(400).json({ error: "Email already registered" });
      res.status(500).json({ error: e.message });
    }
  },

  async login(req, res) {
    const { email, password } = req.body;
    try {
      const user = await UserModel.findByEmail(email, useDB);
      if (!user || !(await bcrypt.compare(password, user.password)))
        return res.status(401).json({ error: "Invalid email or password" });

      if (!user.is_verified) {
        return res.status(403).json({
          error: "Please verify your email before logging in. Check your inbox for the verification link.",
          requiresVerification: true,
          email: user.email,
        });
      }

      const token = signToken(user);
      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, store_name: user.store_name, city: user.city, is_verified: user.is_verified },
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async me(req, res) {
    try {
      const user = await UserModel.findById(req.user.id, useDB);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async verifyEmail(req, res) {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
      console.log(`[verifyEmail] Looking up token: ${token.slice(0,10)}... (length=${token.length})`);

      // Direct DB check to debug
      if (useDB) {
        const dbCheck = await pool.query(
          "SELECT id, email, is_verified, verify_token, verify_expires FROM users WHERE verify_token=$1",
          [token]
        );
        console.log(`[verifyEmail] DB rows found: ${dbCheck.rows.length}`);
        if (dbCheck.rows.length > 0) {
          const row = dbCheck.rows[0];
          console.log(`[verifyEmail] Found user id=${row.id}, is_verified=${row.is_verified}, expires=${row.verify_expires}`);
        } else {
          // Try to find any user with a token to debug
          const anyToken = await pool.query(
            "SELECT id, email, LEFT(verify_token,10) as token_preview, verify_expires FROM users WHERE verify_token IS NOT NULL LIMIT 3"
          );
          console.log(`[verifyEmail] Users with tokens:`, anyToken.rows);
        }
      }

      const user = await UserModel.findByVerifyToken(token, useDB);
      if (!user) {
        console.log(`[verifyEmail] No user found for token`);
        return res.status(400).json({ error: "Invalid or expired verification link" });
      }

      if (new Date() > new Date(user.verify_expires)) {
        console.log(`[verifyEmail] Token expired at ${user.verify_expires}`);
        return res.status(400).json({ error: "Verification link has expired. Please request a new one." });
      }

      await UserModel.markVerified(user.id, useDB);
      console.log(`[verifyEmail] User ${user.id} marked verified`);
      res.json({ message: "Email verified successfully. You can now log in." });
    } catch (e) {
      console.error("[verifyEmail] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  },

  async resendVerification(req, res) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const user = await UserModel.findByEmail(email, useDB);
      if (!user) return res.json({ message: "If that email exists, a verification link has been sent." });
      if (user.is_verified) return res.status(400).json({ error: "This email is already verified." });

      const token   = makeToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await UserModel.setVerifyToken(user.id, token, expires, useDB);
      await sendVerificationEmail(email, user.name, token);
      console.log(`[resendVerification] New token sent to ${email}`);

      res.json({ message: "Verification email sent. Please check your inbox." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async forgotPassword(req, res) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const user = await UserModel.findByEmail(email, useDB);
      if (!user) return res.json({ message: "If that email is registered, a reset link has been sent." });

      const token   = makeToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await UserModel.setResetToken(user.id, token, expires, useDB);
      await sendResetPasswordEmail(email, user.name, token);

      res.json({ message: "Password reset email sent. Please check your inbox." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async resetPassword(req, res) {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Token and new password are required" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    try {
      const user = await UserModel.findByResetToken(token, useDB);
      if (!user) return res.status(400).json({ error: "Invalid or expired reset link" });
      if (new Date() > new Date(user.reset_expires))
        return res.status(400).json({ error: "Reset link has expired. Please request a new one." });

      const hash = await bcrypt.hash(password, 10);
      await UserModel.updatePassword(user.id, hash, useDB);
      res.json({ message: "Password updated successfully. You can now log in." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};

module.exports = AuthController;
