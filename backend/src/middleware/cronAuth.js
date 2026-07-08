const { CRON_SECRET } = require("../config");

// Protects endpoints meant to be called by an external scheduler
// (e.g. a GitHub Actions cron job), not by a logged-in user.
// Uses a shared secret instead of a JWT since there's no user session here.
function cronAuth(req, res, next) {
  const provided = req.headers["x-cron-secret"];

  if (!CRON_SECRET) {
    return res.status(500).json({ error: "CRON_SECRET is not configured on the server" });
  }
  if (!provided || provided !== CRON_SECRET) {
    return res.status(401).json({ error: "Invalid or missing cron secret" });
  }
  next();
}

module.exports = cronAuth;
