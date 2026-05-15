// ── Product Catalog (fetched from API) ──
let products = [];
const FREE_SHIPPING_THRESHOLD = 10000; // $100 in cents

// ── Color Variant Helpers ──
function getVariant(product, color) {
  if (product.colorVariants && product.colorVariants.length > 0) {
    var v = product.colorVariants.find(function (cv) { return cv.color === color; });
    return v || product.colorVariants[0];
  }
  return { color: color, image: product.image, imageBack: product.imageBack || "", price: product.price };
}

function getColors(product) {
  if (product.colorVariants && product.colorVariants.length > 0) {
    return product.colorVariants.map(function (cv) { return cv.color; });
  }
  return product.colors || [];
}

// ── Cart State (localStorage-backed) ──
let cart = JSON.parse(localStorage.getItem("hoodoo_cart") || "[]");

function saveCart() {
  localStorage.setItem("hoodoo_cart", JSON.stringify(cart));
}

// ── DOM Elements ──
const productGrid = document.getElementById("product-grid");
const cartBtn = document.getElementById("cart-btn");
const cartBtnMobile = document.getElementById("cart-btn-mobile");
const cartCount = document.getElementById("cart-count");
const cartCountMobile = document.getElementById("cart-count-mobile");
const cartDrawer = document.getElementById("cart-drawer");
const cartOverlay = document.getElementById("cart-overlay");
const cartClose = document.getElementById("cart-close");
const cartItemsEl = document.getElementById("cart-items");
const cartFooter = document.getElementById("cart-footer");
const cartTotalEl = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const cartShippingBar = document.getElementById("cart-shipping-bar");
const shippingBarText = document.getElementById("shipping-bar-text");
const shippingBarFill = document.getElementById("shipping-bar-fill");

// ── Announcement Bar Rotation ──
(function() {
  const msgs = document.querySelectorAll(".announcement-msg");
  if (msgs.length <= 1) return;
  let idx = 0;
  setInterval(function() {
    msgs[idx].classList.remove("active");
    idx = (idx + 1) % msgs.length;
    msgs[idx].classList.add("active");
  }, 4000);
})();

// ── Mobile Menu ──
(function() {
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileMenuClose = document.getElementById("mobile-menu-close");
  const links = document.querySelectorAll(".mobile-menu-link");

  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener("click", function() {
    mobileMenu.classList.add("open");
    document.body.style.overflow = "hidden";
  });

  function closeMobileMenu() {
    mobileMenu.classList.remove("open");
    document.body.style.overflow = "";
  }

  mobileMenuClose.addEventListener("click", closeMobileMenu);
  links.forEach(function(link) {
    link.addEventListener("click", closeMobileMenu);
  });
})();

// ── Search Overlay ──
(function() {
  const searchOverlay = document.getElementById("search-overlay");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const searchClose = document.getElementById("search-close");
  const searchBtn = document.getElementById("search-btn");
  const searchBtnMobile = document.getElementById("search-btn-mobile");

  function openSearch() {
    searchOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(function() { searchInput.focus(); }, 100);
  }

  function closeSearch() {
    searchOverlay.classList.remove("open");
    document.body.style.overflow = "";
    searchInput.value = "";
    searchResults.innerHTML = "";
  }

  if (searchBtn) searchBtn.addEventListener("click", openSearch);
  if (searchBtnMobile) searchBtnMobile.addEventListener("click", openSearch);
  searchClose.addEventListener("click", closeSearch);

  searchOverlay.addEventListener("click", function(e) {
    if (e.target === searchOverlay) closeSearch();
  });

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && searchOverlay.classList.contains("open")) {
      closeSearch();
    }
    if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !searchOverlay.classList.contains("open")) {
      const tag = document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      openSearch();
    }
  });

  searchInput.addEventListener("input", function() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      searchResults.innerHTML = "";
      return;
    }

    const matches = products.filter(function(p) {
      return p.name.toLowerCase().includes(q) ||
             p.description.toLowerCase().includes(q) ||
             (p.productType && p.productType.toLowerCase().includes(q));
    });

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">No products found for &ldquo;' + q + '&rdquo;</div>';
      return;
    }

    searchResults.innerHTML = matches.map(function(p) {
      const variant = getVariant(p, getColors(p)[0]);
      const img = variant.image || p.image;
      const price = variant.price || p.price;
      return '<a href="/product.html?id=' + p.id + '" class="search-result-item">' +
        '<img src="' + img + '" alt="' + p.name + '" class="search-result-img" />' +
        '<div class="search-result-info">' +
          '<div class="search-result-name">' + p.name + '</div>' +
          '<div class="search-result-price">$' + (price / 100).toFixed(2) + '</div>' +
        '</div>' +
      '</a>';
    }).join("");
  });
})();

// ── Scroll Reveal ──
(function() {
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

  function observeReveals() {
    document.querySelectorAll(".reveal:not(.visible)").forEach(function(el) {
      observer.observe(el);
    });
  }

  // Initial observe
  observeReveals();
  // Re-observe after products load
  window._observeReveals = observeReveals;
})();

// ── Back to Top ──
(function() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;

  window.addEventListener("scroll", function() {
    if (window.scrollY > 600) {
      btn.classList.add("visible");
    } else {
      btn.classList.remove("visible");
    }
  }, { passive: true });

  btn.addEventListener("click", function() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

// ── Toast Notifications ──
function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = '<span class="toast-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>' + message;
  container.appendChild(toast);

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      toast.classList.add("show");
    });
  });

  setTimeout(function() {
    toast.classList.remove("show");
    setTimeout(function() { toast.remove(); }, 350);
  }, 3000);
}

// ── Newsletter ──
(function() {
  const form = document.getElementById("newsletter-form");
  const note = document.getElementById("newsletter-note");
  if (!form) return;

  form.addEventListener("submit", function(e) {
    e.preventDefault();
    const email = document.getElementById("newsletter-email").value.trim();
    if (!email) return;

    // Store locally (could be sent to backend in the future)
    const subs = JSON.parse(localStorage.getItem("hoodoo_newsletter") || "[]");
    if (!subs.includes(email)) subs.push(email);
    localStorage.setItem("hoodoo_newsletter", JSON.stringify(subs));

    note.textContent = "You're in! We'll keep you updated.";
    note.className = "newsletter-note success";
    form.reset();
  });
})();

// ── Product Filtering & Sorting ──
let currentFilter = "all";
let currentSort = "default";

function getFilteredSortedProducts() {
  let list = products.slice();

  // Filter
  if (currentFilter !== "all") {
    list = list.filter(function(p) {
      return (p.productType || "").toLowerCase() === currentFilter.toLowerCase();
    });
  }

  // Sort
  if (currentSort === "price-low") {
    list.sort(function(a, b) { return (a.price || 0) - (b.price || 0); });
  } else if (currentSort === "price-high") {
    list.sort(function(a, b) { return (b.price || 0) - (a.price || 0); });
  } else if (currentSort === "name-az") {
    list.sort(function(a, b) { return a.name.localeCompare(b.name); });
  } else if (currentSort === "name-za") {
    list.sort(function(a, b) { return b.name.localeCompare(a.name); });
  }

  return list;
}

function buildFilterTabs() {
  const tabs = document.getElementById("filter-tabs");
  if (!tabs) return;

  const types = new Set();
  products.forEach(function(p) {
    if (p.productType) types.add(p.productType);
  });

  let html = '<button class="filter-tab active" data-filter="all">All</button>';
  types.forEach(function(type) {
    html += '<button class="filter-tab" data-filter="' + type + '">' + type + '</button>';
  });
  tabs.innerHTML = html;

  tabs.querySelectorAll(".filter-tab").forEach(function(tab) {
    tab.addEventListener("click", function() {
      tabs.querySelectorAll(".filter-tab").forEach(function(t) { t.classList.remove("active"); });
      tab.classList.add("active");
      currentFilter = tab.dataset.filter;
      renderProducts();
    });
  });
}

(function() {
  const sortSelect = document.getElementById("sort-select");
  if (!sortSelect) return;
  sortSelect.addEventListener("change", function() {
    currentSort = sortSelect.value;
    renderProducts();
  });
})();

// ── Quick View ──
function openQuickView(productId) {
  const product = products.find(function(p) { return p.id === productId; });
  if (!product) return;

  const overlay = document.getElementById("quick-view-overlay");
  const body = document.getElementById("quick-view-body");
  const colors = getColors(product);
  const firstVariant = getVariant(product, colors[0]);
  const img = firstVariant.image || product.image;
  const price = firstVariant.price || product.price;

  body.innerHTML =
    '<div class="qv-image"><img src="' + img + '" alt="' + product.name + '" id="qv-img" /></div>' +
    '<div class="qv-details">' +
      '<h2 class="qv-title">' + product.name + '</h2>' +
      '<p class="qv-price" id="qv-price">$' + (price / 100).toFixed(2) + '</p>' +
      '<p class="qv-desc">' + product.description + '</p>' +
      '<div class="qv-variants">' +
        '<div class="qv-variant-group">' +
          '<label class="variant-label">Size</label>' +
          '<div class="qv-options" id="qv-sizes">' +
            product.sizes.map(function(s, i) {
              return '<button class="qv-opt' + (i === 0 ? ' active' : '') + '" data-size="' + s + '">' + s + '</button>';
            }).join("") +
          '</div>' +
        '</div>' +
        (colors.length > 1 ?
          '<div class="qv-variant-group">' +
            '<label class="variant-label">Color</label>' +
            '<div class="qv-options" id="qv-colors">' +
              colors.map(function(c, i) {
                return '<button class="qv-opt' + (i === 0 ? ' active' : '') + '" data-color="' + c + '">' + c + '</button>';
              }).join("") +
            '</div>' +
          '</div>'
        : '') +
      '</div>' +
      '<button class="btn btn-primary btn-full qv-add" id="qv-add-to-cart">Add to Cart</button>' +
      '<a href="/product.html?id=' + product.id + '" class="qv-view-full">View Full Details</a>' +
    '</div>';

  // Size selector
  body.querySelectorAll("#qv-sizes .qv-opt").forEach(function(btn) {
    btn.addEventListener("click", function() {
      body.querySelectorAll("#qv-sizes .qv-opt").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
    });
  });

  // Color selector
  body.querySelectorAll("#qv-colors .qv-opt").forEach(function(btn) {
    btn.addEventListener("click", function() {
      body.querySelectorAll("#qv-colors .qv-opt").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      const variant = getVariant(product, btn.dataset.color);
      const qvImg = document.getElementById("qv-img");
      if (qvImg) qvImg.src = variant.image || product.image;
      const qvPrice = document.getElementById("qv-price");
      if (qvPrice) qvPrice.textContent = "$" + ((variant.price || product.price) / 100).toFixed(2);
    });
  });

  // Add to cart
  document.getElementById("qv-add-to-cart").addEventListener("click", function() {
    const activeSize = body.querySelector("#qv-sizes .qv-opt.active");
    const activeColor = body.querySelector("#qv-colors .qv-opt.active");
    const size = activeSize ? activeSize.dataset.size : product.sizes[0];
    const color = activeColor ? activeColor.dataset.color : colors[0];
    addToCart(product.id, size, color);
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  });

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

(function() {
  const overlay = document.getElementById("quick-view-overlay");
  const closeBtn = document.getElementById("quick-view-close");
  if (!overlay || !closeBtn) return;

  function closeQV() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  closeBtn.addEventListener("click", closeQV);
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) closeQV();
  });
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeQV();
  });
})();

// ── Render Products ──
function renderProducts() {
  const list = getFilteredSortedProducts();

  if (list.length === 0) {
    productGrid.innerHTML = '<div class="empty-state">No products found.</div>';
    return;
  }

  productGrid.innerHTML = list.map(function(p) {
    const colors = getColors(p);
    const firstVariant = getVariant(p, colors[0]);
    const frontImg = firstVariant.image || p.image;
    const backImg = firstVariant.imageBack || p.imageBack || "";
    const price = firstVariant.price || p.price;
    return '<div class="product-card reveal" data-id="' + p.id + '">' +
      '<a href="/product.html?id=' + p.id + '" class="product-card-link">' +
        '<div class="product-image">' +
          '<img src="' + frontImg + '" alt="' + p.name + '" loading="lazy" class="product-img-front" />' +
          (backImg ? '<img src="' + backImg + '" alt="' + p.name + ' back" loading="lazy" class="product-img-back" />' : '') +
          '<div class="product-card-overlay">' +
            '<button class="quick-view-btn" data-id="' + p.id + '">Quick View</button>' +
          '</div>' +
        '</div>' +
      '</a>' +
      '<div class="product-info">' +
        '<h3 class="product-name"><a href="/product.html?id=' + p.id + '" style="color:inherit;text-decoration:none;">' + p.name + '</a></h3>' +
        '<p class="product-desc">' + p.description + '</p>' +
        '<div class="product-variants">' +
          '<div class="variant-group">' +
            '<label class="variant-label">Size</label>' +
            '<select class="variant-select size-select" data-id="' + p.id + '">' +
              p.sizes.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join("") +
            '</select>' +
          '</div>' +
          '<div class="variant-group">' +
            '<label class="variant-label">Color</label>' +
            '<select class="variant-select color-select" data-id="' + p.id + '">' +
              colors.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join("") +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="product-bottom">' +
          '<span class="product-price">$' + (price / 100).toFixed(2) + '</span>' +
          '<button class="product-buy" data-id="' + p.id + '">Add to Cart</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join("");

  // Prevent link navigation on selects
  productGrid.querySelectorAll(".variant-select").forEach(function(sel) {
    sel.addEventListener("click", function(e) { e.preventDefault(); });
    sel.addEventListener("mousedown", function(e) { e.stopPropagation(); });
  });

  // Color change listener
  productGrid.querySelectorAll(".color-select").forEach(function(sel) {
    sel.addEventListener("change", function(e) {
      e.preventDefault();
      const id = Number(sel.dataset.id);
      const product = products.find(function(pr) { return pr.id === id; });
      if (!product) return;
      const variant = getVariant(product, sel.value);
      const card = sel.closest(".product-card");
      const frontImg = card.querySelector(".product-img-front");
      const backImg = card.querySelector(".product-img-back");
      if (frontImg) frontImg.src = variant.image || product.image;
      if (backImg) {
        if (variant.imageBack) {
          backImg.src = variant.imageBack;
          backImg.style.display = "";
        } else {
          backImg.style.display = "none";
        }
      }
      const priceEl = card.querySelector(".product-price");
      if (priceEl) priceEl.textContent = "$" + ((variant.price || product.price) / 100).toFixed(2);
    });
  });

  // Add to cart buttons
  productGrid.querySelectorAll(".product-buy").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const card = btn.closest(".product-card");
      const size = card.querySelector(".size-select").value;
      const color = card.querySelector(".color-select").value;
      addToCart(id, size, color);
    });
  });

  // Quick view buttons
  productGrid.querySelectorAll(".quick-view-btn").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      openQuickView(Number(btn.dataset.id));
    });
  });

  // Observe reveals for newly added cards
  if (window._observeReveals) window._observeReveals();
}

// ── Cart Functions ──
function cartKey(productId, size, color) {
  return productId + "-" + size + "-" + color;
}

function addToCart(productId, size, color) {
  const product = products.find(function(p) { return p.id === productId; });
  if (!product) return;

  const variant = getVariant(product, color);
  const key = cartKey(productId, size, color);
  const existing = cart.find(function(item) { return item.key === key; });

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      description: product.description,
      key: key,
      size: size,
      color: color,
      price: variant.price || product.price,
      image: variant.image || product.image,
      quantity: 1,
      tapstitchProductId: product.tapstitchProductId,
      productType: product.productType,
      printMethod: product.printMethod,
    });
  }

  saveCart();
  updateCart();
  showToast(product.name + " added to cart");

  if (window.HoodooAnalytics) HoodooAnalytics.track("add_to_cart");
}

function updateItemQty(key, delta) {
  const item = cart.find(function(i) { return i.key === key; });
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(function(i) { return i.key !== key; });
  }
  saveCart();
  updateCart();
}

function removeFromCart(key) {
  cart = cart.filter(function(item) { return item.key !== key; });
  saveCart();
  updateCart();
}

function updateShippingBar() {
  if (!cartShippingBar) return;
  if (cart.length === 0) {
    cartShippingBar.style.display = "none";
    return;
  }

  const total = cart.reduce(function(sum, item) { return sum + item.price * item.quantity; }, 0);
  cartShippingBar.style.display = "block";

  if (total >= FREE_SHIPPING_THRESHOLD) {
    shippingBarText.textContent = "You've unlocked free shipping!";
    shippingBarFill.style.width = "100%";
  } else {
    const remaining = ((FREE_SHIPPING_THRESHOLD - total) / 100).toFixed(2);
    shippingBarText.textContent = "$" + remaining + " away from free shipping";
    const pct = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
    shippingBarFill.style.width = pct + "%";
  }
}

function updateCart() {
  const totalItems = cart.reduce(function(sum, item) { return sum + item.quantity; }, 0);

  // Update badge(s)
  [cartCount, cartCountMobile].forEach(function(badge) {
    if (!badge) return;
    badge.textContent = totalItems;
    if (totalItems > 0) {
      badge.classList.add("visible");
    } else {
      badge.classList.remove("visible");
    }
  });

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    cartFooter.style.display = "none";
    updateShippingBar();
    return;
  }

  cartFooter.style.display = "block";

  cartItemsEl.innerHTML = cart.map(function(item) {
    return '<div class="cart-item">' +
      '<div class="cart-item-image">' +
        '<img src="' + item.image + '" alt="' + item.name + '" />' +
      '</div>' +
      '<div class="cart-item-details">' +
        '<div class="cart-item-name">' + item.name + '</div>' +
        '<div class="cart-item-variant">' + item.color + ' / ' + item.size + '</div>' +
        '<div class="cart-item-qty">' +
          '<button class="cart-qty-btn" data-key="' + item.key + '" data-delta="-1">&minus;</button>' +
          '<span class="cart-qty-num">' + item.quantity + '</span>' +
          '<button class="cart-qty-btn" data-key="' + item.key + '" data-delta="1">+</button>' +
        '</div>' +
        '<div class="cart-item-price">$' + ((item.price * item.quantity) / 100).toFixed(2) + '</div>' +
        '<button class="cart-item-remove" data-key="' + item.key + '">Remove</button>' +
      '</div>' +
    '</div>';
  }).join("");

  // Qty buttons
  cartItemsEl.querySelectorAll(".cart-qty-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      updateItemQty(btn.dataset.key, Number(btn.dataset.delta));
    });
  });

  // Remove buttons
  cartItemsEl.querySelectorAll(".cart-item-remove").forEach(function(btn) {
    btn.addEventListener("click", function() { removeFromCart(btn.dataset.key); });
  });

  const total = cart.reduce(function(sum, item) { return sum + item.price * item.quantity; }, 0);

  // Show discount line if applied
  var existingDiscountLine = document.getElementById("cart-discount-line");
  if (existingDiscountLine) existingDiscountLine.remove();
  if (appliedDiscount) {
    var discAmt = appliedDiscount.type === "percent"
      ? Math.round((total * appliedDiscount.value) / 100)
      : Math.min(appliedDiscount.value, total);
    var discLine = document.createElement("div");
    discLine.id = "cart-discount-line";
    discLine.className = "cart-discount-line";
    discLine.innerHTML = '<span>' + appliedDiscount.code + ' (' + (appliedDiscount.type === "percent" ? appliedDiscount.value + '%' : '$' + (appliedDiscount.value / 100).toFixed(2)) + ')<button class="cart-discount-remove" onclick="removeDiscount()">Remove</button></span><span>-$' + (discAmt / 100).toFixed(2) + '</span>';
    var totalDiv = cartTotalEl.parentElement;
    totalDiv.parentElement.insertBefore(discLine, totalDiv);
    cartTotalEl.textContent = "$" + ((total - discAmt) / 100).toFixed(2);
  } else {
    cartTotalEl.textContent = "$" + (total / 100).toFixed(2);
  }

  updateShippingBar();
}

// ── Cart Drawer Toggle ──
function openCart() {
  cartDrawer.classList.add("open");
  cartOverlay.classList.add("open");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.remove("open");
}

cartBtn.addEventListener("click", openCart);
if (cartBtnMobile) cartBtnMobile.addEventListener("click", openCart);
cartClose.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

// ── Discount Code ──
let appliedDiscount = JSON.parse(sessionStorage.getItem("hoodoo_discount") || "null");

function saveDiscount() {
  if (appliedDiscount) sessionStorage.setItem("hoodoo_discount", JSON.stringify(appliedDiscount));
  else sessionStorage.removeItem("hoodoo_discount");
}

(function() {
  var applyBtn = document.getElementById("discount-apply-btn");
  var discountInput = document.getElementById("discount-input");
  var discountMsg = document.getElementById("discount-msg");
  if (!applyBtn) return;

  applyBtn.addEventListener("click", async function() {
    var code = discountInput.value.trim();
    if (!code) return;
    applyBtn.disabled = true;
    applyBtn.textContent = "...";
    discountMsg.textContent = "";
    discountMsg.className = "discount-msg";

    var cartTotal = cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);

    try {
      var res = await fetch("/api/validate-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code, cartTotal: cartTotal }),
      });
      var data = await res.json();
      if (data.valid) {
        appliedDiscount = data;
        saveDiscount();
        discountMsg.textContent = data.type === "percent" ? data.value + "% off applied!" : "$" + (data.value / 100).toFixed(2) + " off applied!";
        discountMsg.className = "discount-msg success";
        discountInput.value = "";
        updateCart();
      } else {
        discountMsg.textContent = data.error || "Invalid code";
        discountMsg.className = "discount-msg error";
      }
    } catch (err) {
      discountMsg.textContent = "Failed to validate code";
      discountMsg.className = "discount-msg error";
    } finally {
      applyBtn.disabled = false;
      applyBtn.textContent = "Apply";
    }
  });

  discountInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") applyBtn.click();
  });
})();

function removeDiscount() {
  appliedDiscount = null;
  saveDiscount();
  var msg = document.getElementById("discount-msg");
  if (msg) { msg.textContent = ""; msg.className = "discount-msg"; }
  updateCart();
}

// ── Checkout ──
checkoutBtn.addEventListener("click", async function() {
  if (cart.length === 0) return;

  if (window.HoodooAnalytics) HoodooAnalytics.track("checkout_start");

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Processing...";

  const items = cart.map(function(item) {
    return {
      name: item.name,
      description: item.description,
      price: item.price,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      tapstitchProductId: item.tapstitchProductId,
      productType: item.productType,
      printMethod: item.printMethod,
    };
  });

  try {
    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items, discountCode: appliedDiscount ? appliedDiscount.code : null }),
    });

    const data = await res.json();

    if (data.url) {
      cart = [];
      saveCart();
      window.location.href = data.url;
    } else {
      alert("Something went wrong. Please try again.");
    }
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Could not connect to the server. Please try again.");
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Checkout";
  }
});

// ── Init ──
async function init() {
  try {
    const res = await fetch("/api/products");
    products = await res.json();
  } catch (err) {
    console.error("Failed to load products:", err);
  }

  buildFilterTabs();
  renderProducts();
  updateCart();
}
init();

// ══════════════════════════════════════
// v4.0 — Premium Interactions
// ══════════════════════════════════════

// Nav: transparent → solid on scroll
(function() {
  var nav = document.querySelector('.nav');
  if (!nav) return;
  function onScroll() {
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Hero word reveal (clip + translate)
(function() {
  var words = document.querySelectorAll('.hero-word-inner');
  if (!words.length) return;
  words.forEach(function(word, i) {
    setTimeout(function() {
      word.classList.add('in-view');
    }, 250 + i * 200);
  });
})();

// Hero glow: smooth mouse parallax
(function() {
  var glow = document.querySelector('.hero-glow');
  if (!glow || window.innerWidth < 768) return;
  var tx = 0, ty = 0, cx = 0, cy = 0;
  document.addEventListener('mousemove', function(e) {
    tx = (e.clientX / window.innerWidth - 0.5) * 40;
    ty = (e.clientY / window.innerHeight - 0.5) * 40;
  }, { passive: true });
  (function loop() {
    cx += (tx - cx) * 0.04;
    cy += (ty - cy) * 0.04;
    glow.style.transform = 'translateY(-50%) translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
    requestAnimationFrame(loop);
  })();
})();
