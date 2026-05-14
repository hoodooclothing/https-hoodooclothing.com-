const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 50,
      expand: ["data.line_items"],
    });

    let orders = sessions.data
      .filter((s) => s.payment_status === "paid")
      .map((s) => ({
        id: s.id,
        status: s.metadata?.fulfillment_status || "pending_fulfillment",
        createdAt: new Date(s.created * 1000).toISOString(),
        customer: {
          email: s.customer_details?.email || "",
          name: s.customer_details?.name || "",
          phone: s.customer_details?.phone || "",
        },
        shipping: s.shipping_details
          ? {
              name: s.shipping_details.name,
              address: s.shipping_details.address,
            }
          : null,
        items: (s.line_items?.data || []).map((li) => ({
          name: li.description,
          quantity: li.quantity,
          unitPrice: li.price?.unit_amount || 0,
          total: li.amount_total,
        })),
        amountTotal: s.amount_total,
        currency: s.currency,
        tapstitchMeta: s.metadata?.tapstitch_items
          ? JSON.parse(s.metadata.tapstitch_items)
          : null,
      }));

    // Search filter (by customer name or email)
    const search = (req.query?.search || "").toLowerCase().trim();
    if (search) {
      orders = orders.filter(
        (o) =>
          (o.customer.name || "").toLowerCase().includes(search) ||
          (o.customer.email || "").toLowerCase().includes(search)
      );
    }

    // Status filter
    const status = (req.query?.status || "").trim();
    if (status && status !== "all") {
      orders = orders.filter((o) => o.status === status);
    }

    res.json(orders);
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};
