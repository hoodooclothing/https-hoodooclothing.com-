const { getProducts, saveProducts } = require("../../lib/products-store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    if (!body || !body.name || !body.price) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    const products = await getProducts();

    // Generate next ID
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
    };

    products.push(newProduct);
    await saveProducts(products);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error("Failed to create product:", err.message);
    res.status(500).json({ error: "Failed to create product" });
  }
};
