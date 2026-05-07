// ── HooDoo Analytics Tracker ──
// Lightweight client-side analytics. Stores in localStorage under "hoodoo_analytics".
// Data is per-browser; real multi-visitor analytics requires a database.
(function () {
  "use strict";

  const STORAGE_KEY = "hoodoo_analytics";
  const MAX_AGE_DAYS = 90;

  // ── Session ID (per tab/session) ──
  function getSessionId() {
    let sid = sessionStorage.getItem("hoodoo_sid");
    if (!sid) {
      sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("hoodoo_sid", sid);
    }
    return sid;
  }

  // ── Load / Save ──
  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData();
    } catch {
      return defaultData();
    }
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* storage full — silently fail */ }
  }

  function defaultData() {
    return {
      dailySummary: {},
      referrers: {},
      devices: {},
      pageViews: {},
      sessions: 0,
    };
  }

  // ── Today key ──
  function todayKey() {
    return new Date().toISOString().split("T")[0];
  }

  // ── Ensure daily summary entry ──
  function ensureDay(data, day) {
    if (!data.dailySummary[day]) {
      data.dailySummary[day] = {
        pageViews: 0,
        productViews: 0,
        addToCarts: 0,
        checkoutStarts: 0,
        purchases: 0,
        timeOnSite: 0,
      };
    }
    return data.dailySummary[day];
  }

  // ── Referrer classification ──
  function classifyReferrer() {
    const ref = document.referrer.toLowerCase();
    if (!ref) return "direct";
    if (ref.includes("google")) return "google";
    if (ref.includes("instagram")) return "instagram";
    if (ref.includes("facebook") || ref.includes("fb.com")) return "facebook";
    if (ref.includes("tiktok")) return "tiktok";
    if (ref.includes("twitter") || ref.includes("x.com")) return "twitter";
    if (ref.includes(location.hostname)) return "direct";
    return "other";
  }

  // ── Device type ──
  function detectDevice() {
    const w = screen.width;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  }

  // ── Prune old data ──
  function prune(data) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    Object.keys(data.dailySummary).forEach(function (day) {
      if (day < cutoffStr) delete data.dailySummary[day];
    });
  }

  // ── Record page view ──
  function recordPageView(data) {
    const day = todayKey();
    const summary = ensureDay(data, day);
    summary.pageViews++;

    const path = location.pathname + location.search;
    data.pageViews[path] = (data.pageViews[path] || 0) + 1;
  }

  // ── Record session ──
  function recordSession(data) {
    var counted = sessionStorage.getItem("hoodoo_session_counted");
    if (!counted) {
      data.sessions = (data.sessions || 0) + 1;
      sessionStorage.setItem("hoodoo_session_counted", "1");
    }
  }

  // ── Record referrer ──
  function recordReferrer(data) {
    var counted = sessionStorage.getItem("hoodoo_ref_counted");
    if (!counted) {
      var source = classifyReferrer();
      data.referrers[source] = (data.referrers[source] || 0) + 1;
      sessionStorage.setItem("hoodoo_ref_counted", "1");
    }
  }

  // ── Record device ──
  function recordDevice(data) {
    var counted = sessionStorage.getItem("hoodoo_device_counted");
    if (!counted) {
      var device = detectDevice();
      data.devices[device] = (data.devices[device] || 0) + 1;
      sessionStorage.setItem("hoodoo_device_counted", "1");
    }
  }

  // ── Track custom event ──
  function track(eventType) {
    var data = loadData();
    var day = todayKey();
    var summary = ensureDay(data, day);
    switch (eventType) {
      case "product_view":
        summary.productViews++;
        break;
      case "add_to_cart":
        summary.addToCarts++;
        break;
      case "checkout_start":
        summary.checkoutStarts++;
        break;
      case "purchase_complete":
        summary.purchases++;
        break;
    }
    saveData(data);
  }

  // ── Time on site tracking ──
  var pageLoadTime = Date.now();

  function recordTimeOnSite() {
    var elapsed = Math.round((Date.now() - pageLoadTime) / 1000);
    if (elapsed < 1) return;
    var data = loadData();
    var day = todayKey();
    var summary = ensureDay(data, day);
    summary.timeOnSite += elapsed;
    saveData(data);
  }

  // ── Initialize ──
  var data = loadData();
  prune(data);
  getSessionId();
  recordPageView(data);
  recordSession(data);
  recordReferrer(data);
  recordDevice(data);
  saveData(data);

  // Record time on site when leaving
  window.addEventListener("beforeunload", recordTimeOnSite);

  // ── Public API ──
  window.HoodooAnalytics = {
    track: track,
    getData: loadData,
  };
})();
