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

// ══════════════════════════════════════════════
// ── Dark / Light Mode ──
// ══════════════════════════════════════════════
(function initTheme() {
  var saved = localStorage.getItem("hoodoo_admin_theme");
  if (saved === "light") document.documentElement.setAttribute("data-theme", "light");
})();

function toggleTheme() {
  var current = document.documentElement.getAttribute("data-theme");
  if (current === "light") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("hoodoo_admin_theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("hoodoo_admin_theme", "light");
  }
  var btn = document.getElementById("theme-toggle-btn");
  if (btn) btn.textContent = document.documentElement.getAttribute("data-theme") === "light" ? "Dark" : "Light";
}

// Inject theme toggle button into sidebar footer
document.addEventListener("DOMContentLoaded", function () {
  var footer = document.querySelector(".sidebar-footer");
  if (footer) {
    var themeLink = document.createElement("a");
    themeLink.href = "#";
    themeLink.id = "theme-toggle-btn";
    themeLink.textContent = document.documentElement.getAttribute("data-theme") === "light" ? "Dark" : "Light";
    themeLink.style.marginTop = "8px";
    themeLink.style.display = "inline-block";
    themeLink.addEventListener("click", function (e) { e.preventDefault(); toggleTheme(); });
    footer.appendChild(document.createElement("br"));
    footer.appendChild(themeLink);
  }
});

// ══════════════════════════════════════════════
// ── Command Palette (Cmd+K / Ctrl+K) ──
// ══════════════════════════════════════════════
var cmdPaletteOpen = false;

var CMD_ACTIONS = [
  { label: "Go to Dashboard", keys: "G D", action: function () { window.location.href = "/admin/index.html"; } },
  { label: "Go to Orders", keys: "G O", action: function () { window.location.href = "/admin/orders.html"; } },
  { label: "Go to Products", keys: "G P", action: function () { window.location.href = "/admin/products.html"; } },
  { label: "Go to Customers", keys: "G C", action: function () { window.location.href = "/admin/customers.html"; } },
  { label: "Go to Analytics", keys: "G A", action: function () { window.location.href = "/admin/analytics.html"; } },
  { label: "Go to Settings", keys: "G S", action: function () { window.location.href = "/admin/settings.html"; } },
  { label: "View Storefront", keys: "", action: function () { window.open("/", "_blank"); } },
  { label: "Toggle Dark/Light Mode", keys: "", action: function () { toggleTheme(); } },
  { label: "Refresh Page", keys: "R", action: function () { location.reload(); } },
  { label: "Open Stripe Dashboard", keys: "", action: function () { window.open("https://dashboard.stripe.com", "_blank"); } },
  { label: "Logout", keys: "", action: function () { if (typeof logout === "function") logout(); } },
];

function openCommandPalette() {
  if (cmdPaletteOpen) return;
  cmdPaletteOpen = true;

  var overlay = document.createElement("div");
  overlay.className = "cmd-palette-overlay";
  overlay.id = "cmd-palette-overlay";

  var palette = document.createElement("div");
  palette.className = "cmd-palette";

  var input = document.createElement("input");
  input.className = "cmd-palette-input";
  input.placeholder = "Type a command...";
  input.autocomplete = "off";

  var list = document.createElement("div");
  list.className = "cmd-palette-list";
  list.id = "cmd-palette-list";

  palette.appendChild(input);
  palette.appendChild(list);
  overlay.appendChild(palette);
  document.body.appendChild(overlay);

  var selectedIdx = 0;

  function renderList(filter) {
    var filtered = CMD_ACTIONS.filter(function (a) {
      return a.label.toLowerCase().includes((filter || "").toLowerCase());
    });
    selectedIdx = Math.min(selectedIdx, Math.max(filtered.length - 1, 0));
    list.innerHTML = filtered.map(function (a, i) {
      return '<div class="cmd-palette-item' + (i === selectedIdx ? ' selected' : '') + '" data-idx="' + i + '">' +
        '<span>' + a.label + '</span>' +
        (a.keys ? '<kbd>' + a.keys + '</kbd>' : '') +
      '</div>';
    }).join("");

    list.querySelectorAll(".cmd-palette-item").forEach(function (el) {
      el.addEventListener("click", function () {
        var idx = parseInt(el.dataset.idx);
        closeCommandPalette();
        filtered[idx].action();
      });
      el.addEventListener("mouseenter", function () {
        selectedIdx = parseInt(el.dataset.idx);
        renderList(input.value);
      });
    });
    return filtered;
  }

  renderList("");

  input.addEventListener("input", function () {
    selectedIdx = 0;
    renderList(input.value);
  });

  input.addEventListener("keydown", function (e) {
    var filtered = CMD_ACTIONS.filter(function (a) {
      return a.label.toLowerCase().includes(input.value.toLowerCase());
    });
    if (e.key === "ArrowDown") { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, filtered.length - 1); renderList(input.value); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); renderList(input.value); }
    else if (e.key === "Enter") { e.preventDefault(); closeCommandPalette(); if (filtered[selectedIdx]) filtered[selectedIdx].action(); }
    else if (e.key === "Escape") { e.preventDefault(); closeCommandPalette(); }
  });

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeCommandPalette();
  });

  setTimeout(function () { input.focus(); }, 50);
}

function closeCommandPalette() {
  cmdPaletteOpen = false;
  var el = document.getElementById("cmd-palette-overlay");
  if (el) el.remove();
}

// ══════════════════════════════════════════════
// ── Keyboard Shortcuts ──
// ══════════════════════════════════════════════
var shortcutsOverlayOpen = false;

var SHORTCUTS = [
  { keys: "Ctrl+K / Cmd+K", desc: "Open command palette" },
  { keys: "?", desc: "Show keyboard shortcuts" },
  { keys: "G then D", desc: "Go to Dashboard" },
  { keys: "G then O", desc: "Go to Orders" },
  { keys: "G then P", desc: "Go to Products" },
  { keys: "G then C", desc: "Go to Customers" },
  { keys: "G then A", desc: "Go to Analytics" },
  { keys: "G then S", desc: "Go to Settings" },
  { keys: "R", desc: "Refresh current page" },
  { keys: "Escape", desc: "Close modal/palette" },
];

function showShortcutsOverlay() {
  if (shortcutsOverlayOpen) return;
  shortcutsOverlayOpen = true;

  var overlay = document.createElement("div");
  overlay.className = "cmd-palette-overlay";
  overlay.id = "shortcuts-overlay";

  var card = document.createElement("div");
  card.className = "cmd-palette";
  card.style.maxWidth = "480px";

  card.innerHTML = '<div class="shortcuts-title">Keyboard Shortcuts</div>' +
    '<div class="shortcuts-list">' + SHORTCUTS.map(function (s) {
      return '<div class="shortcut-row"><kbd>' + s.keys + '</kbd><span>' + s.desc + '</span></div>';
    }).join("") + '</div>';

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeShortcutsOverlay();
  });

  document.addEventListener("keydown", function handler(e) {
    if (e.key === "Escape") {
      closeShortcutsOverlay();
      document.removeEventListener("keydown", handler);
    }
  });
}

function closeShortcutsOverlay() {
  shortcutsOverlayOpen = false;
  var el = document.getElementById("shortcuts-overlay");
  if (el) el.remove();
}

// "G" prefix for navigation shortcuts
var gPending = false;
var gTimeout = null;

document.addEventListener("keydown", function (e) {
  // Ignore when typing in inputs
  var tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;

  // Cmd+K / Ctrl+K
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    openCommandPalette();
    return;
  }

  // ? for shortcuts
  if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    showShortcutsOverlay();
    return;
  }

  // R for refresh
  if (e.key === "r" && !e.metaKey && !e.ctrlKey && !gPending) {
    var refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) { refreshBtn.click(); return; }
  }

  // G prefix for navigation
  if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
    gPending = true;
    clearTimeout(gTimeout);
    gTimeout = setTimeout(function () { gPending = false; }, 1000);
    return;
  }

  if (gPending) {
    gPending = false;
    clearTimeout(gTimeout);
    var routes = { d: "/admin/index.html", o: "/admin/orders.html", p: "/admin/products.html", c: "/admin/customers.html", a: "/admin/analytics.html", s: "/admin/settings.html" };
    if (routes[e.key]) { window.location.href = routes[e.key]; return; }
  }
});

// ══════════════════════════════════════════════
// ── Live Notifications (SSE) ──
// ══════════════════════════════════════════════
var liveNotifications = [];
var notifBadge = null;

function initLiveNotifications() {
  // Create notification bell in sidebar
  var footer = document.querySelector(".sidebar-footer");
  if (!footer) return;

  var bellWrap = document.createElement("div");
  bellWrap.style.cssText = "display:flex; align-items:center; gap:8px; margin-top:8px;";
  bellWrap.innerHTML = '<a href="#" id="notif-bell" style="position:relative; font-size:1.1rem; text-decoration:none;">&#128276;<span id="notif-badge" class="notif-badge" style="display:none;">0</span></a>';
  footer.insertBefore(bellWrap, footer.firstChild);

  notifBadge = document.getElementById("notif-badge");
  document.getElementById("notif-bell").addEventListener("click", function (e) {
    e.preventDefault();
    showNotifPanel();
  });

  // Poll for new orders every 30 seconds (SSE fallback for static hosting)
  setInterval(checkForNewOrders, 30000);
}

var lastKnownOrderCount = -1;

async function checkForNewOrders() {
  try {
    var res = await fetch("/admin/orders");
    var orders = await res.json();
    if (lastKnownOrderCount === -1) {
      lastKnownOrderCount = orders.length;
      return;
    }
    if (orders.length > lastKnownOrderCount) {
      var newCount = orders.length - lastKnownOrderCount;
      lastKnownOrderCount = orders.length;
      for (var i = 0; i < newCount && i < 3; i++) {
        var o = orders[i];
        addNotification("New order from " + (o.customer?.name || o.customer?.email || "Unknown") + " — " + formatCurrency(o.amountTotal || 0));
      }
    }
  } catch (e) { /* ignore polling errors */ }
}

function addNotification(message) {
  liveNotifications.unshift({ message: message, time: new Date().toISOString(), read: false });
  if (liveNotifications.length > 50) liveNotifications.pop();
  updateNotifBadge();
  showLiveToast(message);
}

function updateNotifBadge() {
  var unread = liveNotifications.filter(function (n) { return !n.read; }).length;
  if (notifBadge) {
    notifBadge.textContent = unread;
    notifBadge.style.display = unread > 0 ? "inline-block" : "none";
  }
}

function showNotifPanel() {
  // Mark all as read
  liveNotifications.forEach(function (n) { n.read = true; });
  updateNotifBadge();

  var existing = document.getElementById("notif-panel-overlay");
  if (existing) { existing.remove(); return; }

  var overlay = document.createElement("div");
  overlay.className = "cmd-palette-overlay";
  overlay.id = "notif-panel-overlay";

  var panel = document.createElement("div");
  panel.className = "cmd-palette";
  panel.style.maxWidth = "420px";
  panel.innerHTML = '<div class="shortcuts-title">Notifications</div>' +
    (liveNotifications.length > 0
      ? '<div class="notif-list">' + liveNotifications.map(function (n) {
          return '<div class="notif-item"><span>' + n.message + '</span><small>' + formatDateTime(n.time) + '</small></div>';
        }).join("") + '</div>'
      : '<p class="admin-empty" style="padding:24px;">No notifications yet.</p>'
    );

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) overlay.remove(); });
}

function showLiveToast(message) {
  var toast = document.createElement("div");
  toast.className = "live-toast";
  toast.innerHTML = '<span class="live-toast-dot"></span>' + message;
  document.body.appendChild(toast);
  setTimeout(function () { toast.classList.add("show"); }, 10);
  setTimeout(function () { toast.classList.remove("show"); setTimeout(function () { toast.remove(); }, 300); }, 5000);
}

document.addEventListener("DOMContentLoaded", initLiveNotifications);

// ══════════════════════════════════════════════
// ── Fetch Dashboard Stats (with range) ──
// ══════════════════════════════════════════════
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
async function fetchOrders(search, status) {
  search = search || "";
  status = status || "";
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

// ══════════════════════════════════════════════
// ── Chart Renderers ──
// ══════════════════════════════════════════════

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

function renderHorizontalBars(container, data, opts) {
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

function renderDonut(container, data, centerLabel) {
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

function renderFunnel(container, funnelData) {
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

function renderVBarChart(container, data) {
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

function aggregateLocalAnalytics(data, days) {
  if (!data || !data.dailySummary) return null;
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  var cutoffStr = cutoff.toISOString().split("T")[0];

  var result = {
    pageViews: 0, productViews: 0, addToCarts: 0,
    checkoutStarts: 0, purchases: 0, timeOnSite: 0,
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

// ══════════════════════════════════════════════
// ── Formatters ──
// ══════════════════════════════════════════════

function formatCurrency(cents) {
  return "$" + (cents / 100).toFixed(2);
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function timeAgo(isoString) {
  var diff = Date.now() - new Date(isoString).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + "m ago";
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  var days = Math.floor(hrs / 24);
  return days + "d ago";
}
