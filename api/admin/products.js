const { getProducts } = require("../../lib/products-store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const products = await getProducts();
    res.json(products);
  } catch (err) {
    console.error("Failed to fetch products:", err.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};
