require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;
const ORDERS_FILE = path.join(__dirname, "orders.json");

// Ensure orders file exists
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, "[]");
}

function readOrders() {
  return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

app.use(cors());

// Image upload needs raw body — must be registered before express.json()
const isProduction = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

app.post(
  "/api/admin/upload-image",
  express.raw({ type: "image/*", limit: "5mb" }),
  async (req, res) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.startsWith("image/")) {
      return res.status(400).json({ error: "Content-Type must be image/*" });
    }

    const filename = req.headers["x-filename"];
    if (!filename) {
      return res.status(400).json({ error: "X-Filename header is required" });
    }

    if (!req.body || !req.body.length) {
      return res.status(400).json({ error: "Empty file" });
    }

    try {
      if (isProduction) {
        const { put } = require("@vercel/blob");
        const blobPath = `products/${Date.now()}-${filename}`;
        const blob = await put(blobPath, req.body, {
          access: "public",
          contentType,
        });
        return res.json({ url: blob.url });
      }

      // Local dev: save to public/ directory
      const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const destPath = path.join(__dirname, "public", safeName);
      fs.writeFileSync(destPath, req.body);
      return res.json({ url: safeName });
    } catch (err) {
      console.error("Image upload failed:", err.message);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

// Stripe webhook needs raw body — must be registered before express.json()
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    if (endpointSecret) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      // No webhook secret configured — parse body directly (dev mode)
      event = JSON.parse(req.body);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      try {
        // Retrieve line items from the completed session
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id
        );

        const order = {
          id: `ORD-${Date.now()}`,
          stripeSessionId: session.id,
          status: "pending_fulfillment",
          createdAt: new Date().toISOString(),
          customer: {
            email: session.customer_details?.email || "",
            name: session.customer_details?.name || "",
            phone: session.customer_details?.phone || "",
          },
          shipping: session.shipping_details
            ? {
                name: session.shipping_details.name,
                address: session.shipping_details.address,
              }
            : null,
          items: lineItems.data.map((li) => ({
            name: li.description,
            quantity: li.quantity,
            unitPrice: li.price?.unit_amount || 0,
            total: li.amount_total,
          })),
          amountTotal: session.amount_total,
          currency: session.currency,
          // Tapstitch metadata passed through from checkout creation
          tapstitchMeta:
            session.metadata?.tapstitch_items
              ? JSON.parse(session.metadata.tapstitch_items)
              : null,
        };

        const orders = readOrders();
        orders.push(order);
        writeOrders(orders);
        console.log(`Order saved: ${order.id}`);
      } catch (err) {
        console.error("Error processing completed session:", err.message);
      }
    }

    res.json({ received: true });
  }
);

app.use(express.json());
app.use(express.static("public"));

// ── Create Checkout Session ──
app.post("/create-checkout-session", async (req, res) => {
  const { items, discountCode } = req.body;

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
      },
      unit_amount: item.price,
    },
    quantity: item.quantity || 1,
  }));

  // Store Tapstitch-relevant data in session metadata for the webhook
  const tapstitchItems = items.map((item) => ({
    tapstitchProductId: item.tapstitchProductId || null,
    productType: item.productType || null,
    name: item.name,
    size: item.size || null,
    color: item.color || null,
    quantity: item.quantity || 1,
    printMethod: item.printMethod || "dtg",
  }));

  try {
    // Read dynamic shipping rates from settings
    let settings;
    try { settings = await getSettings(); } catch { settings = null; }
    const sr = settings?.shippingRates || {};
    const std = sr.standard || { amount: 700, currency: "usd", displayName: "Standard Shipping", minDays: 7, maxDays: 10 };
    const exp = sr.express || { amount: 1800, currency: "usd", displayName: "Express Shipping", minDays: 2, maxDays: 4 };
    const storeCurrency = settings?.currency || "usd";

    // Resolve discount code to Stripe coupon
    let discounts = [];
    if (discountCode) {
      try {
        const allDiscounts = await getDiscounts();
        const dc = allDiscounts.find(d => d.code.toUpperCase() === discountCode.toUpperCase() && d.active);
        if (dc && dc.stripeCouponId) {
          discounts = [{ coupon: dc.stripeCouponId }];
          // Increment usage
          dc.usedCount = (dc.usedCount || 0) + 1;
          await saveDiscounts(allDiscounts);
        }
      } catch (e) { console.warn("Discount lookup failed:", e.message); }
    }

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      ...(discounts.length > 0 ? { discounts } : {}),
      shipping_address_collection: {
        allowed_countries: [
          "US",
          "CA",
          "GB",
          "AU",
          "DE",
          "FR",
          "NL",
          "SE",
          "DK",
          "NO",
          "JP",
        ],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: std.amount, currency: std.currency || storeCurrency },
            display_name: std.displayName,
            delivery_estimate: {
              minimum: { unit: "business_day", value: std.minDays },
              maximum: { unit: "business_day", value: std.maxDays },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: exp.amount, currency: exp.currency || storeCurrency },
            display_name: exp.displayName,
            delivery_estimate: {
              minimum: { unit: "business_day", value: exp.minDays },
              maximum: { unit: "business_day", value: exp.maxDays },
            },
          },
        },
      ],
      metadata: {
        tapstitch_items: JSON.stringify(tapstitchItems),
      },
      success_url: `${req.protocol}://${req.get("host")}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get("host")}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ── Admin: List Orders ──
app.get("/admin/orders", (req, res) => {
  let orders = readOrders();
  // Search filter
  const search = (req.query?.search || "").toLowerCase().trim();
  if (search) {
    orders = orders.filter(
      (o) =>
        (o.customer?.name || "").toLowerCase().includes(search) ||
        (o.customer?.email || "").toLowerCase().includes(search)
    );
  }
  // Status filter
  const status = (req.query?.status || "").trim();
  if (status && status !== "all") {
    orders = orders.filter((o) => o.status === status);
  }
  // Most recent first
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
});

// ── Admin: Stats (local dev) ──
app.get("/admin/stats", async (req, res) => {
  try {
    const rangeDays = parseInt(req.query.range) === 30 ? 30 : 7;
    const orders = readOrders();
    const now = new Date();

    let totalRevenue = 0;
    let itemsSold = 0;
    orders.forEach((o) => {
      totalRevenue += o.amountTotal || 0;
      (o.items || []).forEach((i) => { itemsSold += i.quantity || 0; });
    });

    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Previous period
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - rangeDays);
    const prevStart = new Date(rangeStart);
    prevStart.setDate(prevStart.getDate() - rangeDays);

    let currRevenue = 0, currOrders = 0, currItems = 0;
    let prevRevenue = 0, prevOrders = 0, prevItems = 0;

    orders.forEach((o) => {
      const created = new Date(o.createdAt);
      const oItems = (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
      if (created >= rangeStart) { currRevenue += o.amountTotal || 0; currOrders++; currItems += oItems; }
      else if (created >= prevStart) { prevRevenue += o.amountTotal || 0; prevOrders++; prevItems += oItems; }
    });

    function pctChange(curr, prev) {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    }

    // Daily revenue
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const dailyRevenue = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      let dayTotal = 0;
      orders.forEach((o) => {
        const c = new Date(o.createdAt);
        if (c >= dayStart && c < dayEnd) dayTotal += o.amountTotal || 0;
      });
      dailyRevenue.push({
        day: dayStart.toISOString().split("T")[0],
        label: rangeDays <= 7 ? dayNames[dayStart.getDay()] : (dayStart.getMonth()+1) + "/" + dayStart.getDate(),
        revenue: dayTotal,
      });
    }

    // Top products
    const productMap = {};
    orders.forEach((o) => {
      (o.items || []).forEach((li) => {
        const name = li.name || "Unknown";
        if (!productMap[name]) productMap[name] = { name, quantity: 0, revenue: 0 };
        productMap[name].quantity += li.quantity || 0;
        productMap[name].revenue += li.total || 0;
      });
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

    // Status distribution
    const statusDistribution = {};
    orders.forEach((o) => {
      statusDistribution[o.status || "pending_fulfillment"] = (statusDistribution[o.status || "pending_fulfillment"] || 0) + 1;
    });

    // Sales by type (from tapstitch metadata)
    const salesByType = {};
    orders.forEach((o) => {
      if (!o.tapstitchMeta) return;
      (Array.isArray(o.tapstitchMeta) ? o.tapstitchMeta : []).forEach((item) => {
        const type = item.productType || "other";
        salesByType[type] = (salesByType[type] || 0) + (item.quantity || 1);
      });
    });

    // Revenue by day of week
    const dayNamesAll = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const revenueByDayOfWeek = dayNamesAll.map((d) => ({ day: d, revenue: 0 }));
    orders.forEach((o) => {
      const created = new Date(o.createdAt);
      revenueByDayOfWeek[created.getDay()].revenue += o.amountTotal || 0;
    });

    // Customer insights
    const customerData = {};
    orders.forEach((o) => {
      const email = (o.customer?.email || "").toLowerCase();
      if (!email) return;
      if (!customerData[email]) {
        customerData[email] = { email, name: o.customer?.name || "Unknown", orders: 0, spent: 0 };
      }
      customerData[email].orders++;
      customerData[email].spent += o.amountTotal || 0;
    });
    const customerList = Object.values(customerData);
    const repeatCustomers = customerList.filter((c) => c.orders > 1).length;
    const topCustomers = [...customerList].sort((a, b) => b.spent - a.spent).slice(0, 10);

    // Geographic distribution
    const geoDistribution = {};
    orders.forEach((o) => {
      const addr = o.shipping?.address;
      if (addr) {
        const region = addr.state ? `${addr.state}, ${addr.country || "US"}` : (addr.country || "Unknown");
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
        topCustomers,
        geoDistribution,
      },
      previousPeriod: {
        revenue: prevRevenue,
        orders: prevOrders,
        items: prevItems,
        avgOrderValue: prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0,
        revenueChange: pctChange(currRevenue, prevRevenue),
        ordersChange: pctChange(currOrders, prevOrders),
        itemsChange: pctChange(currItems, prevItems),
        aovChange: pctChange(
          currOrders > 0 ? Math.round(currRevenue / currOrders) : 0,
          prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0
        ),
      },
    });
  } catch (err) {
    console.error("Stats error:", err.message);
    res.status(500).json({ error: "Failed to compute stats" });
  }
});

// ── Admin: Update Order Status / Tracking / Notes ──
app.patch("/admin/orders/:id", (req, res) => {
  const { status, trackingNumber, notes } = req.body;
  const allowedStatuses = [
    "pending_fulfillment",
    "submitted_to_tapstitch",
    "in_production",
    "shipped",
    "delivered",
  ];

  // At least one field must be provided
  if (!status && trackingNumber === undefined && notes === undefined) {
    return res.status(400).json({ error: "No update fields provided" });
  }

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const orders = readOrders();
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (status) order.status = status;
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (notes !== undefined) order.notes = notes;
  order.updatedAt = new Date().toISOString();
  writeOrders(orders);
  res.json(order);
});

// ── Discount Codes API (local dev) ──
const { getDiscounts, saveDiscounts } = require("./lib/discount-store");

app.get("/api/admin/discount-codes", async (req, res) => {
  try {
    const discounts = await getDiscounts();
    res.json(discounts);
  } catch (err) {
    console.error("Discounts read error:", err.message);
    res.status(500).json({ error: "Failed to fetch discounts" });
  }
});

app.post("/api/admin/discount-codes", async (req, res) => {
  try {
    const { code, type, value, minOrder, maxUses, expiresAt } = req.body || {};
    if (!code || !type || !value) return res.status(400).json({ error: "Code, type, and value are required" });
    if (type !== "percent" && type !== "fixed") return res.status(400).json({ error: "Type must be 'percent' or 'fixed'" });

    const discounts = await getDiscounts();
    if (discounts.find(d => d.code.toUpperCase() === code.toUpperCase())) {
      return res.status(400).json({ error: "A discount code with this name already exists" });
    }

    // Create Stripe coupon
    const couponParams = { name: code.toUpperCase() };
    if (type === "percent") { couponParams.percent_off = Number(value); }
    else { couponParams.amount_off = Number(value); couponParams.currency = "usd"; }
    if (maxUses) couponParams.max_redemptions = Number(maxUses);
    if (expiresAt) couponParams.redeem_by = Math.floor(new Date(expiresAt).getTime() / 1000);

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
    res.status(201).json(discount);
  } catch (err) {
    console.error("Discount create error:", err.message);
    res.status(500).json({ error: "Failed to create discount code" });
  }
});

app.delete("/api/admin/discount-codes", async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "Discount id is required" });
    const discounts = await getDiscounts();
    const idx = discounts.findIndex(d => d.id === id);
    if (idx === -1) return res.status(404).json({ error: "Discount not found" });
    const removed = discounts[idx];
    if (removed.stripeCouponId) {
      try { await stripe.coupons.del(removed.stripeCouponId); } catch (e) { console.warn("Stripe coupon delete:", e.message); }
    }
    discounts.splice(idx, 1);
    await saveDiscounts(discounts);
    res.json({ success: true, deleted: removed });
  } catch (err) {
    console.error("Discount delete error:", err.message);
    res.status(500).json({ error: "Failed to delete discount" });
  }
});

app.patch("/api/admin/discount-codes", async (req, res) => {
  try {
    const { id, active } = req.body || {};
    if (!id) return res.status(400).json({ error: "Discount id is required" });
    const discounts = await getDiscounts();
    const discount = discounts.find(d => d.id === id);
    if (!discount) return res.status(404).json({ error: "Discount not found" });
    discount.active = !!active;
    await saveDiscounts(discounts);
    res.json(discount);
  } catch (err) {
    console.error("Discount update error:", err.message);
    res.status(500).json({ error: "Failed to update discount" });
  }
});

// ── Validate Discount (public) ──
app.post("/api/validate-discount", async (req, res) => {
  const { code, cartTotal } = req.body || {};
  if (!code) return res.status(400).json({ error: "Discount code is required" });
  try {
    const discounts = await getDiscounts();
    const discount = discounts.find(d => d.code.toUpperCase() === code.toUpperCase() && d.active);
    if (!discount) return res.json({ valid: false, error: "Invalid discount code" });
    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) return res.json({ valid: false, error: "This code has expired" });
    if (discount.maxUses > 0 && discount.usedCount >= discount.maxUses) return res.json({ valid: false, error: "This code has reached its usage limit" });
    if (discount.minOrder > 0 && cartTotal < discount.minOrder) return res.json({ valid: false, error: "Minimum order of $" + (discount.minOrder / 100).toFixed(2) + " required" });
    let discountAmount = 0;
    if (discount.type === "percent") { discountAmount = Math.round((cartTotal * discount.value) / 100); }
    else { discountAmount = Math.min(discount.value, cartTotal); }
    res.json({ valid: true, code: discount.code, type: discount.type, value: discount.value, discountAmount, stripeCouponId: discount.stripeCouponId });
  } catch (err) {
    console.error("Validate discount error:", err.message);
    res.status(500).json({ error: "Failed to validate discount code" });
  }
});

// ── Settings API (local dev) ──
const { getSettings, saveSettings } = require("./lib/settings-store");

app.get("/api/admin/settings", async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    console.error("Settings read error:", err.message);
    res.status(500).json({ error: "Failed to read settings" });
  }
});

app.post("/api/admin/settings", async (req, res) => {
  try {
    const current = await getSettings();
    const body = req.body || {};
    if (body.storeName !== undefined) current.storeName = body.storeName;
    if (body.storeDescription !== undefined) current.storeDescription = body.storeDescription;
    if (body.currency !== undefined) current.currency = body.currency;
    if (body.lowStockThreshold !== undefined) current.lowStockThreshold = Number(body.lowStockThreshold);
    if (body.adminEmails !== undefined && Array.isArray(body.adminEmails)) current.adminEmails = body.adminEmails;
    if (body.shippingRates !== undefined) current.shippingRates = body.shippingRates;
    if (body.notifications !== undefined) current.notifications = { ...current.notifications, ...body.notifications };
    await saveSettings(current);
    res.json(current);
  } catch (err) {
    console.error("Settings save error:", err.message);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ── Customers API (local dev) ──
app.get("/api/admin/customers", async (req, res) => {
  try {
    // Read orders and aggregate by customer email
    const orders = readOrders();
    const customerMap = {};
    orders.forEach((o) => {
      const email = (o.customer?.email || "").toLowerCase();
      if (!email) return;
      if (!customerMap[email]) {
        customerMap[email] = {
          email,
          name: o.customer?.name || "Unknown",
          orders: [],
          totalSpent: 0,
          orderCount: 0,
        };
      }
      const c = customerMap[email];
      if (o.customer?.name) c.name = o.customer.name;
      c.orderCount++;
      c.totalSpent += o.amountTotal || 0;
      c.orders.push({
        id: o.id,
        createdAt: o.createdAt,
        amountTotal: o.amountTotal,
        currency: o.currency,
        status: o.status,
        items: o.items || [],
      });
    });

    let customers = Object.values(customerMap);
    customers.forEach((c) => {
      c.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      c.lastOrderDate = c.orders.length > 0 ? c.orders[0].createdAt : null;
    });

    const search = (req.query?.search || "").toLowerCase().trim();
    if (search) {
      customers = customers.filter(
        (c) => c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search)
      );
    }

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
      return (a.totalSpent - b.totalSpent) * sortDir;
    });

    res.json(customers);
  } catch (err) {
    console.error("Customers error:", err.message);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// ── Products API (local dev) ──
const { getProducts, saveProducts } = require("./lib/products-store");

app.get("/api/products", async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products.filter(p => p.active !== false));
  } catch (err) {
    console.error("Failed to fetch products:", err.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.get("/api/admin/products", async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (err) {
    console.error("Failed to fetch products:", err.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/admin/products-update", async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || !updates.id) {
      return res.status(400).json({ error: "Product id is required" });
    }

    const products = await getProducts();
    const index = products.findIndex((p) => p.id === updates.id);
    if (index === -1) {
      return res.status(404).json({ error: "Product not found" });
    }

    const allowed = [
      "name", "description", "productType", "tapstitchProductId",
      "printMethod", "price", "sizes", "colors", "image", "imageBack", "quantity",
      "active", "colorVariants",
      "sku", "tags", "seoTitle", "seoDescription",
    ];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        products[index][key] = updates[key];
      }
    }

    await saveProducts(products);
    res.json(products[index]);
  } catch (err) {
    console.error("Failed to update product:", err.message);
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.post("/api/admin/products-create", async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.name || !body.price) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    const products = await getProducts();
    const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
    const newProduct = {
      id: maxId + 1,
      name: body.name,
      description: body.description || "",
      productType: body.productType || "tee",
      tapstitchProductId: body.tapstitchProductId || "",
      printMethod: body.printMethod || "dtg",
      price: Number(body.price),
      sizes: body.sizes || ["S", "M", "L", "XL", "XXL"],
      colors: body.colors || ["Black"],
      image: body.image || "",
      imageBack: body.imageBack || "",
      colorVariants: body.colorVariants || [],
      quantity: body.quantity !== undefined ? Number(body.quantity) : -1,
      active: true,
      sku: body.sku || "",
      tags: body.tags || [],
      seoTitle: body.seoTitle || "",
      seoDescription: body.seoDescription || "",
    };

    products.push(newProduct);
    await saveProducts(products);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error("Failed to create product:", err.message);
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.post("/api/admin/products-delete", async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: "Product id is required" });
    }

    const products = await getProducts();
    const index = products.findIndex((p) => p.id === Number(id));
    if (index === -1) {
      return res.status(404).json({ error: "Product not found" });
    }

    const removed = products.splice(index, 1)[0];
    await saveProducts(products);
    res.json({ success: true, deleted: removed });
  } catch (err) {
    console.error("Failed to delete product:", err.message);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin/index.html`);
});
