const { getProducts, saveProducts } = require("../../lib/products-store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const updates = req.body;
    if (!updates || !updates.id) {
      return res.status(400).json({ error: "Product id is required" });
    }

    const products = await getProducts();
    const index = products.findIndex((p) => p.id === Number(updates.id));

    if (index === -1) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Merge updates into existing product
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
};
