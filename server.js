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
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
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
            fixed_amount: { amount: 700, currency: "usd" },
            display_name: "Standard Shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 7 },
              maximum: { unit: "business_day", value: 10 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 1800, currency: "usd" },
            display_name: "Express Shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 2 },
              maximum: { unit: "business_day", value: 4 },
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
  const orders = readOrders();
  // Most recent first
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
});

// ── Admin: Update Order Status ──
app.patch("/admin/orders/:id", (req, res) => {
  const { status } = req.body;
  const allowed = [
    "pending_fulfillment",
    "submitted_to_tapstitch",
    "in_production",
    "shipped",
    "delivered",
  ];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const orders = readOrders();
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  writeOrders(orders);
  res.json(order);
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
      "active",
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
      quantity: body.quantity !== undefined ? Number(body.quantity) : -1,
      active: true,
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
