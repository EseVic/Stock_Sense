const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM    = `"StockSense" <${process.env.SMTP_USER}>`;
const APP_URL = process.env.APP_URL || "http://localhost:5173";

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({ from: FROM, to, subject, html });
};

const sendVerificationEmail = async (to, name, token) => {
  const url = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail(
    to,
    "Verify your StockSense email",
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#1B7A5A">Welcome to StockSense, ${name}! 👋</h2>
      <p>Thanks for creating an account. Please verify your email address to get started.</p>
      <a href="${url}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#1B7A5A;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Verify Email
      </a>
      <p style="color:#888;font-size:13px">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#aaa;font-size:12px">StockSense — Intelligent inventory for Nigerian retail</p>
    </div>`
  );
};

const sendResetPasswordEmail = async (to, name, token) => {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail(
    to,
    "Reset your StockSense password",
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#1B7A5A">Password Reset Request</h2>
      <p>Hi ${name}, we received a request to reset your StockSense password.</p>
      <a href="${url}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#1B7A5A;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Reset Password
      </a>
      <p style="color:#888;font-size:13px">This link expires in 1 hour. If you did not request a password reset, ignore this email — your password will not change.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#aaa;font-size:12px">StockSense — Intelligent inventory for Nigerian retail</p>
    </div>`
  );
};

module.exports = { sendEmail, sendVerificationEmail, sendResetPasswordEmail };