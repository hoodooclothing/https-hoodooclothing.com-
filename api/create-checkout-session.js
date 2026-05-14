const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "No items provided" });
  }

  const lineItems = items.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
        description:
          [item.color, item.size].filter(Boolean).join(" / ") ||
          item.description ||
          undefined,
        metadata: {
          tapstitchProductId: item.tapstitchProductId || "",
          productType: item.productType || "",
          printMethod: item.printMethod || "dtg",
          size: item.size || "",
          color: item.color || "",
        },
      },
      unit_amount: item.price,
    },
    quantity: item.quantity || 1,
  }));

  const tapstitchItems = items.map((item) => ({
    tapstitchProductId: item.tapstitchProductId || null,
    productType: item.productType || null,
    name: item.name,
    size: item.size || null,
    color: item.color || null,
    quantity: item.quantity || 1,
    printMethod: item.printMethod || "dtg",
  }));

  const host = req.headers.host;
  const protocol = host.includes("localhost") ? "http" : "https";

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      shipping_address_collection: {
        allowed_countries: [
          "US", "CA", "GB", "AU", "DE", "FR", "NL", "SE", "DK", "NO", "JP",
        ],
      },
      metadata: {
        tapstitch_items: JSON.stringify(tapstitchItems),
      },
      success_url: `${protocol}://${host}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${protocol}://${host}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
};
