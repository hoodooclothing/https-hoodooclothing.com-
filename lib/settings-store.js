const fs = require("fs");
const path = require("path");

const LOCAL_FILE = path.join(__dirname, "..", "settings-data.json");
const isProduction = process.env.VERCEL === "1" && !!process.env.BLOB_READ_WRITE_TOKEN;
const isVercel = process.env.VERCEL === "1";
const BLOB_KEY = "settings.json";

const DEFAULT_SETTINGS = {
  storeName: "HooDoo",
  storeDescription: "",
  currency: "usd",
  lowStockThreshold: 10,
  adminEmails: ["footy1x.ae@gmail.com", "theodorejamespeck@gmail.com"],
  shippingRates: {
    standard: {
      amount: 700,
      currency: "usd",
      displayName: "Standard Shipping",
      minDays: 7,
      maxDays: 10,
    },
    express: {
      amount: 1800,
      currency: "usd",
      displayName: "Express Shipping",
      minDays: 2,
      maxDays: 4,
    },
  },
  notifications: {
    lowStockEnabled: true,
  },
};

function readLocalSettings() {
  if (fs.existsSync(LOCAL_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_FILE, "utf-8"));
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
  return { ...DEFAULT_SETTINGS };
}

function writeLocalSettings(settings) {
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(settings, null, 2));
}

async function readBlobSettings() {
  const { list } = require("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_KEY });

  if (blobs.length === 0) {
    const defaults = { ...DEFAULT_SETTINGS };
    await writeBlobSettings(defaults);
    return defaults;
  }

  const blob = blobs[0];
  const response = await fetch(blob.url);
  const text = await response.text();
  return JSON.parse(text);
}

async function writeBlobSettings(settings) {
  const { put } = require("@vercel/blob");
  await put(BLOB_KEY, JSON.stringify(settings, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

async function getSettings() {
  if (isProduction) return readBlobSettings();
  if (isVercel) return { ...DEFAULT_SETTINGS };
  return readLocalSettings();
}

async function saveSettings(settings) {
  if (isProduction) {
    await writeBlobSettings(settings);
  } else if (!isVercel) {
    writeLocalSettings(settings);
  }
}

module.exports = { getSettings, saveSettings, DEFAULT_SETTINGS };
