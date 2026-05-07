const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rangeDays = parseInt(req.query.range) === 30 ? 30 : 7;

    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ["data.line_items"],
    });

    const paidSessions = sessions.data.filter(
      (s) => s.payment_status === "paid"
    );

    // ── Basic totals ──
    let totalRevenue = 0;
    let itemsSold = 0;

    paidSessions.forEach((s) => {
      totalRevenue += s.amount_total || 0;
      if (s.line_items?.data) {
        s.line_items.data.forEach((li) => {
          itemsSold += li.quantity || 0;
        });
      }
    });

    const totalOrders = paidSessions.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // ── Daily revenue (for range) ──
    const now = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyRevenue = [];

    for (let i = rangeDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      let dayTotal = 0;
      paidSessions.forEach((s) => {
        const created = new Date(s.created * 1000);
        if (created >= dayStart && created < dayEnd) {
          dayTotal += s.amount_total || 0;
        }
      });

      dailyRevenue.push({
        day: dayStart.toISOString().split("T")[0],
        label: rangeDays <= 7 ? dayNames[dayStart.getDay()] : `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
        revenue: dayTotal,
      });
    }

    // ── Top Products (by revenue) ──
    const productMap = {};
    paidSessions.forEach((s) => {
      if (!s.line_items?.data) return;
      s.line_items.data.forEach((li) => {
        const name = li.description || "Unknown Product";
        if (!productMap[name]) {
          productMap[name] = { name: name, quantity: 0, revenue: 0 };
        }
        productMap[name].quantity += li.quantity || 0;
        productMap[name].revenue += li.amount_total || 0;
      });
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

    // ── Sales by Type ──
    const salesByType = {};
    paidSessions.forEach((s) => {
      if (!s.metadata?.tapstitch_items) return;
      try {
        const items = JSON.parse(s.metadata.tapstitch_items);
        items.forEach((item) => {
          const type = item.productType || "other";
          salesByType[type] = (salesByType[type] || 0) + (item.quantity || 1);
        });
      } catch { /* skip malformed metadata */ }
    });

    // ── Status Distribution ──
    const statusDistribution = {};
    paidSessions.forEach((s) => {
      const status = (s.metadata && s.metadata.fulfillment_status) || "pending_fulfillment";
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    // ── Revenue by Day of Week ──
    const revenueByDayOfWeek = [
      { day: "Sun", revenue: 0 },
      { day: "Mon", revenue: 0 },
      { day: "Tue", revenue: 0 },
      { day: "Wed", revenue: 0 },
      { day: "Thu", revenue: 0 },
      { day: "Fri", revenue: 0 },
      { day: "Sat", revenue: 0 },
    ];
    paidSessions.forEach((s) => {
      const created = new Date(s.created * 1000);
      revenueByDayOfWeek[created.getDay()].revenue += s.amount_total || 0;
    });

    // ── Customer Insights ──
    const customerData = {};
    paidSessions.forEach((s) => {
      const email = s.customer_details?.email || s.customer_email || "unknown";
      if (!customerData[email]) {
        customerData[email] = {
          email: email,
          name: s.customer_details?.name || "Unknown",
          orders: 0,
          spent: 0,
        };
      }
      customerData[email].orders++;
      customerData[email].spent += s.amount_total || 0;
    });

    const customerList = Object.values(customerData).filter((c) => c.email !== "unknown");
    const repeatCustomers = customerList.filter((c) => c.orders > 1).length;
    const topCustomers = customerList.sort((a, b) => b.spent - a.spent).slice(0, 10);

    // ── Geographic Distribution ──
    const geoDistribution = {};
    paidSessions.forEach((s) => {
      const addr = s.shipping_details?.address || s.customer_details?.address;
      if (addr) {
        const region = addr.state
          ? `${addr.state}, ${addr.country || "US"}`
          : addr.country || "Unknown";
        geoDistribution[region] = (geoDistribution[region] || 0) + 1;
      }
    });

    res.json({
      totalRevenue,
      totalOrders,
      avgOrderValue,
      itemsSold,
      dailyRevenue,
      topProducts,
      salesByType,
      statusDistribution,
      revenueByDayOfWeek,
      customers: {
        total: customerList.length,
        repeat: repeatCustomers,
        new: customerList.length - repeatCustomers,
        topCustomers: topCustomers,
        geoDistribution: geoDistribution,
      },
    });
  } catch (err) {
    console.error("Stats error:", err.message);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
