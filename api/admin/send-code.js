const { Resend } = require("resend");

// In-memory code store (resets on cold start, but codes are short-lived anyway)
// For Vercel serverless, we use a signed approach instead.
const resend = new Resend(process.env.RESEND_API_KEY);

const ALLOWED = ["footy1x.ae@gmail.com", "theodorejamespeck@gmail.com"];
const SECRET = process.env.ADMIN_CODE_SECRET || "hoodoo-admin-secret-2026";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple HMAC-like signature using built-in crypto
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

  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  const normalized = email.trim().toLowerCase();
  if (ALLOWED.indexOf(normalized) === -1) {
    // Don't reveal whether the email is valid
    return res.status(200).json({ sent: true });
  }

  const code = generateCode();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(code, normalized, timestamp);

  try {
    await resend.emails.send({
      from: "HooDoo Admin <onboarding@resend.dev>",
      to: normalized,
      subject: "Your HooDoo Admin Code",
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px;text-align:center;">
          <h2 style="font-size:18px;font-weight:400;margin-bottom:24px;">HooDoo Admin Access</h2>
          <div style="font-size:36px;font-weight:600;letter-spacing:8px;background:#f5f5f5;padding:20px;border-radius:8px;margin-bottom:24px;">${code}</div>
          <p style="color:#666;font-size:14px;">This code expires in 10 minutes.</p>
          <p style="color:#999;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Resend error:", err.message);
    return res.status(500).json({ error: "Failed to send code" });
  }

  // Return the signature + timestamp so the client can send it back for verification
  res.json({ sent: true, token: signature + "." + timestamp });
};
