const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { getDiscounts, saveDiscounts } = require("../../lib/discount-store");

module.exports = async (req, res) => {
  // GET — list all discount codes
  if (req.method === "GET") {
    try {
      const discounts = await getDiscounts();
      return res.json(discounts);
    } catch (err) {
      console.error("Failed to fetch discounts:", err.message);
      return res.status(500).json({ error: "Failed to fetch discounts" });
    }
  }

  // POST — create a new discount code
  if (req.method === "POST") {
    try {
      const { code, type, value, minOrder, maxUses, expiresAt } = req.body || {};

      if (!code || !type || !value) {
        return res.status(400).json({ error: "Code, type, and value are required" });
      }

      if (type !== "percent" && type !== "fixed") {
        return res.status(400).json({ error: "Type must be 'percent' or 'fixed'" });
      }

      const discounts = await getDiscounts();

      // Check for duplicate code
      if (discounts.find(d => d.code.toUpperCase() === code.toUpperCase())) {
        return res.status(400).json({ error: "A discount code with this name already exists" });
      }

      // Create Stripe coupon
      const couponParams = {
        name: code.toUpperCase(),
      };

      if (type === "percent") {
        couponParams.percent_off = Number(value);
      } else {
        couponParams.amount_off = Number(value); // in cents
        couponParams.currency = "usd";
      }

      if (maxUses) {
        couponParams.max_redemptions = Number(maxUses);
      }

      if (expiresAt) {
        couponParams.redeem_by = Math.floor(new Date(expiresAt).getTime() / 1000);
      }

      const stripeCoupon = await stripe.coupons.create(couponParams);

      const discount = {
        id: "DSC-" + Date.now(),
        code: code.toUpperCase(),
        type,
        value: Number(value),
        minOrder: minOrder ? Number(minOrder) : 0,
        maxUses: maxUses ? Number(maxUses) : 0,
        usedCount: 0,
        expiresAt: expiresAt || null,
        active: true,
        stripeCouponId: stripeCoupon.id,
        createdAt: new Date().toISOString(),
      };

      discounts.push(discount);
      await saveDiscounts(discounts);

      return res.status(201).json(discount);
    } catch (err) {
      console.error("Failed to create discount:", err.message);
      return res.status(500).json({ error: "Failed to create discount code" });
    }
  }

  // DELETE — delete a discount code
  if (req.method === "DELETE") {
    try {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: "Discount id is required" });

      const discounts = await getDiscounts();
      const idx = discounts.findIndex(d => d.id === id);
      if (idx === -1) return res.status(404).json({ error: "Discount not found" });

      const removed = discounts[idx];

      // Delete Stripe coupon
      if (removed.stripeCouponId) {
        try {
          await stripe.coupons.del(removed.stripeCouponId);
        } catch (e) {
          console.warn("Could not delete Stripe coupon:", e.message);
        }
      }

      discounts.splice(idx, 1);
      await saveDiscounts(discounts);

      return res.json({ success: true, deleted: removed });
    } catch (err) {
      console.error("Failed to delete discount:", err.message);
      return res.status(500).json({ error: "Failed to delete discount" });
    }
  }

  // PATCH — toggle active status
  if (req.method === "PATCH") {
    try {
      const { id, active } = req.body || {};
      if (!id) return res.status(400).json({ error: "Discount id is required" });

      const discounts = await getDiscounts();
      const discount = discounts.find(d => d.id === id);
      if (!discount) return res.status(404).json({ error: "Discount not found" });

      discount.active = !!active;
      await saveDiscounts(discounts);

      return res.json(discount);
    } catch (err) {
      console.error("Failed to update discount:", err.message);
      return res.status(500).json({ error: "Failed to update discount" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
