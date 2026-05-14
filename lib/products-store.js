const fs = require("fs");
const path = require("path");

const SEED_FILE = path.join(__dirname, "..", "data", "products.json");
const LOCAL_FILE = path.join(__dirname, "..", "products-data.json");

// Use Blob storage only when both on Vercel AND the token is configured
const isProduction = process.env.VERCEL === "1" && !!process.env.BLOB_READ_WRITE_TOKEN;
const isVercel = process.env.VERCEL === "1";

const BLOB_KEY = "products.json";

// ── Seed data (embedded so it works on Vercel without filesystem access) ──
const SEED_PRODUCTS = [
  {
    id: 1,
    name: "Essential HooDoo Cotton Boxy Tee",
    description: "6.5oz heavyweight cotton, boxy relaxed fit, DTG printed",
    productType: "tee",
    tapstitchProductId: "TS-HW-TEE-001",
    printMethod: "dtg",
    price: 3300,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black"],
    image: "hoodoo-tee-front.webp",
    imageBack: "hoodoo-tee-back.png",
    quantity: -1,
    active: true,
  },
  {
    id: 8,
    name: "\"2nd Sight\" Oversize Graphic Hoodie",
    description: "400GSM French terry, dropped shoulders, oversize fit, DTG printed",
    productType: "hoodie",
    tapstitchProductId: "TS-HW-HOOD-002",
    printMethod: "dtg",
    price: 6000,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Forest"],
    image: "2nd-sight-hoodie-front.png",
    imageBack: "2nd-sight-hoodie-back.png",
    quantity: -1,
    active: true,
  },
  {
    id: 7,
    name: "Vintage \"Build Different\" Wash Boxy Tee",
    description: "6.5oz heavyweight cotton, vintage wash finish, boxy relaxed fit, DTG printed",
    productType: "tee",
    tapstitchProductId: "TS-VW-TEE-001",
    printMethod: "dtg",
    price: 3600,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White"],
    image: "build-different-front.webp",
    quantity: -1,
    active: true,
  },
];

// ── Local filesystem helpers ──

function readSeedProducts() {
  try {
    return JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
  } catch {
    return SEED_PRODUCTS;
  }
}

function readLocalProducts() {
  // Use the runtime copy if it exists, otherwise fall back to seed
  if (fs.existsSync(LOCAL_FILE)) {
    return JSON.parse(fs.readFileSync(LOCAL_FILE, "utf-8"));
  }
  return readSeedProducts();
}

function writeLocalProducts(products) {
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(products, null, 2));
}

// ── Vercel Blob helpers ──

async function readBlobProducts() {
  const { list } = require("@vercel/blob");

  const { blobs } = await list({ prefix: BLOB_KEY });

  if (blobs.length === 0) {
    // First run — seed from embedded data
    const seed = readSeedProducts();
    await writeBlobProducts(seed);
    return seed;
  }

  const blob = blobs[0];
  const response = await fetch(blob.url);
  const text = await response.text();
  return JSON.parse(text);
}

async function writeBlobProducts(products) {
  const { put } = require("@vercel/blob");
  const data = JSON.stringify(products, null, 2);
  await put(BLOB_KEY, data, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

// ── Public API ──

async function getProducts() {
  if (isProduction) {
    return readBlobProducts();
  }
  // On Vercel without Blob configured — return seed data (read-only)
  if (isVercel) {
    return readSeedProducts();
  }
  return readLocalProducts();
}

async function saveProducts(products) {
  if (isProduction) {
    await writeBlobProducts(products);
  } else if (!isVercel) {
    writeLocalProducts(products);
  }
}

module.exports = { getProducts, saveProducts };
