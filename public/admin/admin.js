// ── Admin Shared JS ──

const STATUS_LABELS = {
  pending_fulfillment: "Pending",
  submitted_to_tapstitch: "Submitted",
  in_production: "In Production",
  shipped: "Shipped",
  delivered: "Delivered",
};

const STATUS_BADGES = {
  pending_fulfillment: "badge-pending",
  submitted_to_tapstitch: "badge-submitted",
  in_production: "badge-production",
  shipped: "badge-shipped",
  delivered: "badge-delivered",
};

// ── Fetch Dashboard Stats (with range) ──
async function fetchStats(range) {
  try {
    const param = range ? "?range=" + range : "";
    const res = await fetch("/admin/stats" + param);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    return null;
  }
}

// ── Fetch Orders (with optional search/filter) ──
async function fetchOrders(search = "", status = "") {
  try {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "all") params.set("status", status);
    const url = "/admin/orders" + (params.toString() ? "?" + params.toString() : "");
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch orders:", err);
    return [];
  }
}

// ── Render Vertical Bar Chart (existing revenue chart) ──
function renderBarChart(container, dailyData) {
  if (!dailyData || dailyData.length === 0) {
    container.innerHTML = '<p class="admin-empty">No revenue data available</p>';
    return;
  }

  const maxValue = Math.max(...dailyData.map((d) => d.revenue), 1);

  container.innerHTML = dailyData
    .map((d) => {
      const pct = (d.revenue / maxValue) * 100;
      const label = d.label || d.day;
      const value = "$" + (d.revenue / 100).toFixed(0);
      return `
        <div class="bar-col">
          <span class="bar-value">${value}</span>
          <div class="bar" style="height: ${Math.max(pct, 2)}%;"></div>
          <span class="bar-label">${label}</span>
        </div>
      `;
    })
    .join("");
}

// ── Render Horizontal Bar Chart ──
function renderHorizontalBars(container, data, opts) {
  // data: { label: value, ... } or [{ label, value }]
  var items = Array.isArray(data)
    ? data
    : Object.entries(data).map(function (e) { return { label: e[0], value: e[1] }; });

  if (!items.length) {
    container.innerHTML = '<p class="admin-empty">No data available</p>';
    return;
  }

  var maxVal = Math.max.apply(null, items.map(function (i) { return i.value; })) || 1;
  var prefix = (opts && opts.prefix) || "";

  container.innerHTML = '<div class="h-bar-chart">' + items.map(function (item) {
    var pct = (item.value / maxVal) * 100;
    var display = prefix ? prefix + (item.value / 100).toFixed(0) : item.value;
    return '<div class="h-bar-row">' +
      '<span class="h-bar-label">' + item.label + '</span>' +
      '<div class="h-bar-track"><div class="h-bar-fill" style="width:' + Math.max(pct, 2) + '%;"></div></div>' +
      '<span class="h-bar-value">' + display + '</span>' +
    '</div>';
  }).join("") + '</div>';
}

// ── Render Donut Chart ──
function renderDonut(container, data, centerLabel) {
  // data: { label: value, ... }
  var entries = Object.entries(data);
  if (!entries.length) {
    container.innerHTML = '<p class="admin-empty">No data available</p>';
    return;
  }

  var total = entries.reduce(function (s, e) { return s + e[1]; }, 0);
  if (total === 0) {
    container.innerHTML = '<p class="admin-empty">No data available</p>';
    return;
  }

  var colors = ["#333", "#666", "#999", "#bbb", "#ddd", "#555", "#888", "#aaa"];
  var gradientParts = [];
  var cumulative = 0;

  entries.forEach(function (entry, i) {
    var pct = (entry[1] / total) * 100;
    var color = colors[i % colors.length];
    gradientParts.push(color + " " + cumulative + "% " + (cumulative + pct) + "%");
    cumulative += pct;
  });

  var legendHtml = entries.map(function (entry, i) {
    var pct = ((entry[1] / total) * 100).toFixed(0);
    return '<div class="donut-legend-item">' +
      '<span class="donut-legend-color" style="background:' + colors[i % colors.length] + ';"></span>' +
      '<span>' + (STATUS_LABELS[entry[0]] || entry[0]) + ' (' + entry[1] + ', ' + pct + '%)</span>' +
    '</div>';
  }).join("");

  container.innerHTML = '<div class="donut-wrap">' +
    '<div class="donut" style="background:conic-gradient(' + gradientParts.join(", ") + ');">' +
      '<div class="donut-center">' + (centerLabel || total) + '</div>' +
    '</div>' +
    '<div class="donut-legend">' + legendHtml + '</div>' +
  '</div>';
}

// ── Render Conversion Funnel ──
function renderFunnel(container, funnelData) {
  // funnelData: { pageViews, productViews, addToCarts, checkoutStarts, purchases }
  var stages = [
    { label: "Page Views", value: funnelData.pageViews || 0 },
    { label: "Product Views", value: funnelData.productViews || 0 },
    { label: "Add to Cart", value: funnelData.addToCarts || 0 },
    { label: "Purchases", value: funnelData.purchases || 0 },
  ];

  var base = stages[0].value || 1;

  container.innerHTML = '<div class="funnel">' + stages.map(function (s) {
    var pct = ((s.value / base) * 100).toFixed(0);
    return '<div class="funnel-stage">' +
      '<div class="funnel-count">' + s.value + '</div>' +
      '<div class="funnel-label">' + s.label + '</div>' +
      '<div class="funnel-pct">' + pct + '%</div>' +
    '</div>';
  }).join("") + '</div>';
}

// ── Render Vertical Bar Chart (day of week) ──
function renderVBarChart(container, data) {
  // data: [{ day, revenue }]
  if (!data || !data.length) {
    container.innerHTML = '<p class="admin-empty">No data</p>';
    return;
  }

  var maxVal = Math.max.apply(null, data.map(function (d) { return d.revenue; })) || 1;

  container.innerHTML = '<div class="v-bar-chart">' + data.map(function (d) {
    var pct = (d.revenue / maxVal) * 100;
    var val = "$" + (d.revenue / 100).toFixed(0);
    return '<div class="v-bar-col">' +
      '<span class="v-bar-value">' + val + '</span>' +
      '<div class="v-bar" style="height:' + Math.max(pct, 2) + '%;"></div>' +
      '<span class="v-bar-label">' + d.day + '</span>' +
    '</div>';
  }).join("") + '</div>';
}

// ── Load Local Analytics ──
function loadLocalAnalytics() {
  try {
    return JSON.parse(localStorage.getItem("hoodoo_analytics")) || null;
  } catch {
    return null;
  }
}

// ── Aggregate local analytics for recent days ──
function aggregateLocalAnalytics(data, days) {
  if (!data || !data.dailySummary) return null;
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  var cutoffStr = cutoff.toISOString().split("T")[0];

  var result = {
    pageViews: 0,
    productViews: 0,
    addToCarts: 0,
    checkoutStarts: 0,
    purchases: 0,
    timeOnSite: 0,
  };

  Object.keys(data.dailySummary).forEach(function (day) {
    if (day >= cutoffStr) {
      var d = data.dailySummary[day];
      result.pageViews += d.pageViews || 0;
      result.productViews += d.productViews || 0;
      result.addToCarts += d.addToCarts || 0;
      result.checkoutStarts += d.checkoutStarts || 0;
      result.purchases += d.purchases || 0;
      result.timeOnSite += d.timeOnSite || 0;
    }
  });

  return result;
}

// ── Format Currency ──
function formatCurrency(cents) {
  return "$" + (cents / 100).toFixed(2);
}

// ── Format Date ──
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
