const axios = require("axios");

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.SMTP_USER || "esevic111@gmail.com";

const sendEmail = async (to, subject, html) => {
  await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: { name: "StockSense", email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    },
    {
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );
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
      <p style="color:#888;font-size:13px">This link expires in 1 hour. If you did not request a password reset, ignore this email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#aaa;font-size:12px">StockSense — Intelligent inventory for Nigerian retail</p>
    </div>`
  );
};

const SEVERITY_COLOR = { critical: "#7D1A1A", high: "#C0392B", medium: "#C47D0E" };
const SEVERITY_LABEL = { critical: "Expired", high: "High risk", medium: "Slow mover" };

function formatDaysLine(a) {
  if (a.type === "Slow Mover") return "Selling slowly — capital may be tied up on the shelf";
  if (a.type === "Expired") return "Already past its expiry date";
  if (a.days == null || a.days >= 9999) return "Expiry risk is high";
  return `${a.days} day${a.days === 1 ? "" : "s"} left before it expires`;
}

const sendAlertDigestEmail = async (to, name, storeName, alerts) => {
  const rows = alerts
    .map(
      (a) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee">
          <div style="font-weight:600;color:#222">${a.product}</div>
          <div style="font-size:13px;color:#888">${formatDaysLine(a)}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">
          <span style="background:${SEVERITY_COLOR[a.severity] || "#888"};color:#fff;font-size:12px;
                       padding:4px 10px;border-radius:12px;white-space:nowrap">
            ${SEVERITY_LABEL[a.severity] || a.type}
          </span>
        </td>
      </tr>`
    )
    .join("");

  await sendEmail(
    to,
    `StockSense: ${alerts.length} product${alerts.length === 1 ? "" : "s"} need${alerts.length === 1 ? "s" : ""} attention at ${storeName}`,
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#1B7A5A">Daily stock alert 🔔</h2>
      <p>Hi ${name}, here's what needs attention at <strong>${storeName}</strong> today:</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">${rows}</table>
      <a href="${APP_URL}/app/notifications" style="display:inline-block;margin:8px 0 24px;padding:12px 28px;background:#1B7A5A;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        View in StockSense
      </a>
      <p style="color:#888;font-size:13px">You're getting this because you have products approaching expiry or slow-moving stock. Act on it now to avoid loss.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#aaa;font-size:12px">StockSense — Intelligent inventory for Nigerian retail</p>
    </div>`
  );
};

module.exports = { sendEmail, sendVerificationEmail, sendResetPasswordEmail, sendAlertDigestEmail };