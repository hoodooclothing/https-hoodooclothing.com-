const { getProducts, saveProducts } = require("../../lib/products-store");

module.exports = async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: "Product id is required" });
    }

    const products = await getProducts();
    const index = products.findIndex((p) => p.id === id);

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
};
