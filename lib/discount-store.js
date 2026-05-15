const fs = require("fs");
const path = require("path");

const LOCAL_FILE = path.join(__dirname, "..", "discounts.json");
const isProduction = process.env.VERCEL === "1" && !!process.env.BLOB_READ_WRITE_TOKEN;
const isVercel = process.env.VERCEL === "1";
const BLOB_KEY = "discounts.json";

function readLocal() {
  if (fs.existsSync(LOCAL_FILE)) {
    try { return JSON.parse(fs.readFileSync(LOCAL_FILE, "utf-8")); }
    catch { return []; }
  }
  return [];
}

function writeLocal(data) {
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2));
}

async function readBlob() {
  const { list } = require("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_KEY });
  if (blobs.length === 0) return [];
  const response = await fetch(blobs[0].url);
  return JSON.parse(await response.text());
}

async function writeBlob(data) {
  const { put } = require("@vercel/blob");
  await put(BLOB_KEY, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

async function getDiscounts() {
  if (isProduction) return readBlob();
  if (isVercel) return [];
  return readLocal();
}

async function saveDiscounts(data) {
  if (isProduction) {
    await writeBlob(data);
  } else if (!isVercel) {
    writeLocal(data);
  }
}

module.exports = { getDiscounts, saveDiscounts };
