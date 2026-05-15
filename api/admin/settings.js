const { getSettings, saveSettings } = require("../../lib/settings-store");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const settings = await getSettings();
      return res.json(settings);
    } catch (err) {
      console.error("Settings read error:", err.message);
      return res.status(500).json({ error: "Failed to read settings" });
    }
  }

  if (req.method === "POST") {
    try {
      const current = await getSettings();
      const body = req.body || {};

      // Merge allowed fields
      if (body.storeName !== undefined) current.storeName = body.storeName;
      if (body.storeDescription !== undefined) current.storeDescription = body.storeDescription;
      if (body.currency !== undefined) current.currency = body.currency;
      if (body.lowStockThreshold !== undefined) current.lowStockThreshold = Number(body.lowStockThreshold);
      if (body.adminEmails !== undefined && Array.isArray(body.adminEmails)) current.adminEmails = body.adminEmails;
      if (body.shippingRates !== undefined) current.shippingRates = body.shippingRates;
      if (body.notifications !== undefined) current.notifications = { ...current.notifications, ...body.notifications };

      await saveSettings(current);
      return res.json(current);
    } catch (err) {
      console.error("Settings save error:", err.message);
      return res.status(500).json({ error: "Failed to save settings" });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
};
