const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ["data.line_items"],
    });

    const paidSessions = sessions.data.filter(
      (s) => s.payment_status === "paid"
    );

    // Aggregate by customer email
    const customerMap = {};
    paidSessions.forEach((s) => {
      const email = (s.customer_details?.email || s.customer_email || "").toLowerCase();
      if (!email) return;

      if (!customerMap[email]) {
        customerMap[email] = {
          email: email,
          name: s.customer_details?.name || "Unknown",
          orders: [],
          totalSpent: 0,
          orderCount: 0,
        };
      }

      const customer = customerMap[email];
      // Use the most recent name
      if (s.customer_details?.name) {
        customer.name = s.customer_details.name;
      }

      customer.orderCount++;
      customer.totalSpent += s.amount_total || 0;
      customer.orders.push({
        id: s.id,
        createdAt: new Date(s.created * 1000).toISOString(),
        amountTotal: s.amount_total,
        currency: s.currency,
        status: s.metadata?.fulfillment_status || "pending_fulfillment",
        items: (s.line_items?.data || []).map((li) => ({
          name: li.description,
          quantity: li.quantity,
          total: li.amount_total,
        })),
      });
    });

    let customers = Object.values(customerMap);

    // Sort orders within each customer by date (newest first)
    customers.forEach((c) => {
      c.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      c.lastOrderDate = c.orders.length > 0 ? c.orders[0].createdAt : null;
    });

    // Search filter
    const search = (req.query?.search || "").toLowerCase().trim();
    if (search) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search)
      );
    }

    // Sort
    const sortBy = req.query?.sort || "spent";
    const sortDir = req.query?.dir === "asc" ? 1 : -1;
    customers.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name) * sortDir;
      if (sortBy === "email") return a.email.localeCompare(b.email) * sortDir;
      if (sortBy === "orders") return (a.orderCount - b.orderCount) * sortDir;
      if (sortBy === "date") {
        const da = a.lastOrderDate ? new Date(a.lastOrderDate) : new Date(0);
        const db = b.lastOrderDate ? new Date(b.lastOrderDate) : new Date(0);
        return (da - db) * sortDir;
      }
      // default: spent
      return (a.totalSpent - b.totalSpent) * sortDir;
    });

    res.json(customers);
  } catch (err) {
    console.error("Customers error:", err.message);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};
