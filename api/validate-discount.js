const { getDiscounts } = require("../lib/discount-store");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, cartTotal } = req.body || {};

  if (!code) {
    return res.status(400).json({ error: "Discount code is required" });
  }

  try {
    const discounts = await getDiscounts();
    const discount = discounts.find(
      d => d.code.toUpperCase() === code.toUpperCase() && d.active
    );

    if (!discount) {
      return res.json({ valid: false, error: "Invalid discount code" });
    }

    // Check expiry
    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      return res.json({ valid: false, error: "This code has expired" });
    }

    // Check usage limit
    if (discount.maxUses > 0 && discount.usedCount >= discount.maxUses) {
      return res.json({ valid: false, error: "This code has reached its usage limit" });
    }

    // Check minimum order
    if (discount.minOrder > 0 && cartTotal < discount.minOrder) {
      return res.json({
        valid: false,
        error: "Minimum order of $" + (discount.minOrder / 100).toFixed(2) + " required",
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === "percent") {
      discountAmount = Math.round((cartTotal * discount.value) / 100);
    } else {
      discountAmount = Math.min(discount.value, cartTotal);
    }

    return res.json({
      valid: true,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      discountAmount,
      stripeCouponId: discount.stripeCouponId,
    });
  } catch (err) {
    console.error("Discount validation error:", err.message);
    return res.status(500).json({ error: "Failed to validate discount code" });
  }
};
