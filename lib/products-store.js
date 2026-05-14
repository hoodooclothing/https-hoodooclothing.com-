const fs = require("fs");
const path = require("path");

const SEED_FILE = path.join(__dirname, "..", "data", "products.json");
const LOCAL_FILE = path.join(__dirname, "..", "products-data.json");

// In production (Vercel), use Blob storage; locally, use filesystem
const isProduction = process.env.VERCEL === "1";

const BLOB_KEY = "products.json";

// ── Local filesystem helpers ──

function readLocalProducts() {
  // Use the runtime copy if it exists, otherwise fall back to seed
  const file = fs.existsSync(LOCAL_FILE) ? LOCAL_FILE : SEED_FILE;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeLocalProducts(products) {
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(products, null, 2));
}

// ── Vercel Blob helpers ──

async function readBlobProducts() {
  const { list, download } = require("@vercel/blob");

  // List blobs to find our products file
  const { blobs } = await list({ prefix: BLOB_KEY });

  if (blobs.length === 0) {
    // First run — seed from file
    const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
    await writeBlobProducts(seed);
    return seed;
  }

  // Download the latest blob
  const blob = blobs[0];
  const response = await download(blob.url);
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
  return readLocalProducts();
}

async function saveProducts(products) {
  if (isProduction) {
    await writeBlobProducts(products);
  } else {
    writeLocalProducts(products);
  }
}

module.exports = { getProducts, saveProducts };
