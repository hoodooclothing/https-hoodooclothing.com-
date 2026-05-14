const SECRET = process.env.ADMIN_CODE_SECRET || "hoodoo-admin-secret-2026";
const ALLOWED = ["footy1x.ae@gmail.com", "theodorejamespeck@gmail.com"];
const CODE_TTL = 600; // 10 minutes

function sign(code, email, timestamp) {
  const crypto = require("crypto");
  return crypto
    .createHmac("sha256", SECRET)
    .update(code + email + timestamp)
    .digest("hex")
    .slice(0, 16);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, code, token } = req.body || {};
  if (!email || !code || !token) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const normalized = email.trim().toLowerCase();
  if (ALLOWED.indexOf(normalized) === -1) {
    return res.status(403).json({ error: "Access denied" });
  }

  // Parse token
  const parts = token.split(".");
  if (parts.length !== 2) {
    return res.status(403).json({ error: "Invalid token" });
  }

  const tokenSig = parts[0];
  const timestamp = parseInt(parts[1]);
  const now = Math.floor(Date.now() / 1000);

  // Check expiry
  if (now - timestamp > CODE_TTL) {
    return res.status(403).json({ error: "Code expired" });
  }

  // Verify signature
  const expected = sign(code.trim(), normalized, timestamp);
  if (expected !== tokenSig) {
    return res.status(403).json({ error: "Invalid code" });
  }

  res.json({ verified: true });
};
