// ── Product Catalog (fetched from API) ──
let products = [];
const FREE_SHIPPING_THRESHOLD = 10000;

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
const pdpContainer = document.getElementById("pdp-container");
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
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.getElementById("lightbox-close");
const lightboxPrev = document.getElementById("lightbox-prev");
const lightboxNext = document.getElementById("lightbox-next");
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

// ── Toast Notifications ──
function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = '<span class="toast-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>' + message;
  container.appendChild(toast);
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { toast.classList.add("show"); });
  });
  setTimeout(function() {
    toast.classList.remove("show");
    setTimeout(function() { toast.remove(); }, 350);
  }, 3000);
}

// ── Lightbox State ──
let lightboxImages = [];
let lightboxIndex = 0;

// ── Load Product Detail ──
function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

function renderProductDetail() {
  const id = getProductId();
  const product = products.find(function(p) { return p.id === id; });

  if (!product) {
    pdpContainer.innerHTML =
      '<div class="pdp-not-found">' +
        '<h1>Product Not Found</h1>' +
        '<p>Sorry, we couldn\'t find that product.</p>' +
        '<a href="/" class="btn btn-primary">Back to Shop</a>' +
      '</div>';
    return;
  }

  document.title = product.name + " — HOODOO";

  // Update meta description if SEO fields exist
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute("content", product.seoDescription || product.description);
  }

  const colors = getColors(product);
  const firstVariant = getVariant(product, colors[0]);
  const initImage = firstVariant.image || product.image;
  const initImageBack = firstVariant.imageBack || product.imageBack || "";
  const initPrice = firstVariant.price || product.price;

  const images = [initImage];
  if (initImageBack) images.push(initImageBack);
  lightboxImages = images.slice();

  pdpContainer.innerHTML =
    '<div class="pdp-breadcrumb">' +
      '<a href="/">Home</a> / <a href="/#products">Shop</a> / <span>' + product.name + '</span>' +
    '</div>' +
    '<div class="pdp-layout">' +
      '<div class="pdp-images">' +
        '<div class="pdp-main-image" id="pdp-main-image">' +
          '<img src="' + initImage + '" alt="' + product.name + '" class="pdp-img clickable-img" data-src="' + initImage + '" />' +
        '</div>' +
        (images.length > 1 ?
          '<div class="pdp-thumbs" id="pdp-thumbs">' +
            images.map(function(img, i) {
              return '<div class="pdp-thumb ' + (i === 0 ? 'active' : '') + '" data-src="' + img + '"><img src="' + img + '" alt="' + product.name + '" /></div>';
            }).join("") +
          '</div>'
        : '<div class="pdp-thumbs" id="pdp-thumbs"></div>') +
      '</div>' +
      '<div class="pdp-details">' +
        '<h1 class="pdp-title">' + product.name + '</h1>' +
        '<p class="pdp-price" id="pdp-price-text">$' + (initPrice / 100).toFixed(2) + '</p>' +
        '<p class="pdp-description">' + product.description + '</p>' +
        '<div class="pdp-variants">' +
          '<div class="pdp-variant-group">' +
            '<label class="variant-label">Size</label>' +
            '<div class="pdp-size-options" id="pdp-sizes">' +
              product.sizes.map(function(s, i) {
                return '<button class="pdp-size-btn ' + (i === 0 ? 'active' : '') + '" data-size="' + s + '">' + s + '</button>';
              }).join("") +
            '</div>' +
          '</div>' +
          (colors.length > 1 ?
            '<div class="pdp-variant-group">' +
              '<label class="variant-label">Color</label>' +
              '<div class="pdp-color-options" id="pdp-colors">' +
                colors.map(function(c, i) {
                  return '<button class="pdp-color-btn ' + (i === 0 ? 'active' : '') + '" data-color="' + c + '">' + c + '</button>';
                }).join("") +
              '</div>' +
            '</div>'
          : '<input type="hidden" id="pdp-single-color" value="' + colors[0] + '" />') +
        '</div>' +
        '<button class="btn btn-primary btn-full pdp-add-to-cart" id="pdp-add-to-cart">Add to Cart</button>' +

        // Share buttons
        '<div class="pdp-share">' +
          '<span class="pdp-share-label">Share</span>' +
          '<button class="pdp-share-btn" id="share-copy" title="Copy link">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
          '</button>' +
          '<button class="pdp-share-btn" id="share-native" title="Share">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
          '</button>' +
        '</div>' +

        // Accordion details
        '<div class="pdp-accordions">' +
          '<div class="pdp-accordion">' +
            '<button class="pdp-accordion-header"><span>Shipping & Returns</span><span class="pdp-accordion-icon">+</span></button>' +
            '<div class="pdp-accordion-body"><div class="pdp-accordion-content">Free shipping on orders over $100. Standard shipping typically takes 5-10 business days. Express shipping available at checkout. Returns accepted within 30 days of delivery.</div></div>' +
          '</div>' +
          '<div class="pdp-accordion">' +
            '<button class="pdp-accordion-header"><span>Care Instructions</span><span class="pdp-accordion-icon">+</span></button>' +
            '<div class="pdp-accordion-body"><div class="pdp-accordion-content">Machine wash cold with like colors. Tumble dry low. Do not bleach. Iron on low heat if needed. See garment label for specific care instructions.</div></div>' +
          '</div>' +
          '<div class="pdp-accordion">' +
            '<button class="pdp-accordion-header"><span>Details</span><span class="pdp-accordion-icon">+</span></button>' +
            '<div class="pdp-accordion-body"><div class="pdp-accordion-content">' +
              'Type: ' + product.productType + '<br/>' +
              'Print: ' + (product.printMethod || '').toUpperCase() + '<br/>' +
              'SKU: ' + (product.sku || product.tapstitchProductId || 'N/A') +
            '</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Related products
    '<div class="pdp-related" id="pdp-related"></div>';

  // ── Wire up interactions ──

  // Thumbnail clicks
  const thumbs = pdpContainer.querySelectorAll(".pdp-thumb");
  const mainImage = pdpContainer.querySelector(".pdp-img");
  thumbs.forEach(function(thumb) {
    thumb.addEventListener("click", function() {
      thumbs.forEach(function(t) { t.classList.remove("active"); });
      thumb.classList.add("active");
      mainImage.src = thumb.dataset.src;
      mainImage.dataset.src = thumb.dataset.src;
    });
  });

  // Size selector
  var sizeBtns = pdpContainer.querySelectorAll(".pdp-size-btn");
  sizeBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      sizeBtns.forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
    });
  });

  // Color selector
  var colorBtns = pdpContainer.querySelectorAll(".pdp-color-btn");
  colorBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      colorBtns.forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");

      var variant = getVariant(product, btn.dataset.color);
      var vImage = variant.image || product.image;
      var vImageBack = variant.imageBack || "";
      var vPrice = variant.price || product.price;

      // Update main image
      var mainImg = pdpContainer.querySelector(".pdp-img");
      if (mainImg) { mainImg.src = vImage; mainImg.dataset.src = vImage; }

      // Rebuild thumbnails
      var thumbImages = [vImage];
      if (vImageBack) thumbImages.push(vImageBack);
      lightboxImages = thumbImages.slice();

      var thumbsContainer = document.getElementById("pdp-thumbs");
      if (thumbsContainer) {
        thumbsContainer.innerHTML = thumbImages.map(function(img, i) {
          return '<div class="pdp-thumb ' + (i === 0 ? 'active' : '') + '" data-src="' + img + '"><img src="' + img + '" alt="' + product.name + '" /></div>';
        }).join("");
        thumbsContainer.querySelectorAll(".pdp-thumb").forEach(function(thumb) {
          thumb.addEventListener("click", function() {
            thumbsContainer.querySelectorAll(".pdp-thumb").forEach(function(t) { t.classList.remove("active"); });
            thumb.classList.add("active");
            var mi = pdpContainer.querySelector(".pdp-img");
            if (mi) { mi.src = thumb.dataset.src; mi.dataset.src = thumb.dataset.src; }
          });
        });
      }

      // Update price
      var priceEl = document.getElementById("pdp-price-text");
      if (priceEl) priceEl.textContent = "$" + (vPrice / 100).toFixed(2);
    });
  });

  // Add to cart
  document.getElementById("pdp-add-to-cart").addEventListener("click", function() {
    var activeSize = pdpContainer.querySelector(".pdp-size-btn.active");
    var activeColor = pdpContainer.querySelector(".pdp-color-btn.active");
    var singleColor = pdpContainer.querySelector("#pdp-single-color");
    var size = activeSize ? activeSize.dataset.size : product.sizes[0];
    var color = activeColor ? activeColor.dataset.color : (singleColor ? singleColor.value : colors[0]);
    addToCart(product.id, size, color);
  });

  // Lightbox on image click
  mainImage.addEventListener("click", function() {
    lightboxIndex = lightboxImages.indexOf(mainImage.src);
    if (lightboxIndex < 0) lightboxIndex = 0;
    openLightbox(lightboxImages[lightboxIndex]);
  });

  // Share buttons
  var shareCopy = document.getElementById("share-copy");
  var shareNative = document.getElementById("share-native");

  if (shareCopy) {
    shareCopy.addEventListener("click", function() {
      navigator.clipboard.writeText(window.location.href).then(function() {
        showToast("Link copied to clipboard");
      });
    });
  }

  if (shareNative) {
    if (navigator.share) {
      shareNative.addEventListener("click", function() {
        navigator.share({ title: product.name, url: window.location.href });
      });
    } else {
      shareNative.style.display = "none";
    }
  }

  // Accordions
  pdpContainer.querySelectorAll(".pdp-accordion-header").forEach(function(header) {
    header.addEventListener("click", function() {
      var accordion = header.parentElement;
      accordion.classList.toggle("open");
    });
  });

  // Related products
  renderRelatedProducts(product);
}

// ── Related Products ──
function renderRelatedProducts(currentProduct) {
  var container = document.getElementById("pdp-related");
  if (!container) return;

  var related = products.filter(function(p) {
    return p.id !== currentProduct.id;
  }).slice(0, 4);

  if (related.length === 0) return;

  container.innerHTML =
    '<h2 class="section-title">You May Also Like</h2>' +
    '<div class="pdp-related-grid">' +
      related.map(function(p) {
        var variant = getVariant(p, getColors(p)[0]);
        var img = variant.image || p.image;
        var price = variant.price || p.price;
        return '<a href="/product.html?id=' + p.id + '" class="pdp-related-card">' +
          '<div class="product-image"><img src="' + img + '" alt="' + p.name + '" loading="lazy" /></div>' +
          '<div class="product-info" style="padding:12px 0;">' +
            '<h3 class="product-name">' + p.name + '</h3>' +
            '<span class="product-price">$' + (price / 100).toFixed(2) + '</span>' +
          '</div>' +
        '</a>';
      }).join("") +
    '</div>';
}

// ── Lightbox ──
function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
  updateLightboxNav();
}

function closeLightbox() {
  lightbox.classList.remove("open");
  document.body.style.overflow = "";
}

function updateLightboxNav() {
  if (lightboxImages.length <= 1) {
    lightboxPrev.style.display = "none";
    lightboxNext.style.display = "none";
  } else {
    lightboxPrev.style.display = "flex";
    lightboxNext.style.display = "flex";
  }
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", function(e) {
  if (e.target === lightbox) closeLightbox();
});

lightboxPrev.addEventListener("click", function(e) {
  e.stopPropagation();
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  lightboxImg.src = lightboxImages[lightboxIndex];
});

lightboxNext.addEventListener("click", function(e) {
  e.stopPropagation();
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  lightboxImg.src = lightboxImages[lightboxIndex];
});

document.addEventListener("keydown", function(e) {
  if (!lightbox.classList.contains("open")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") {
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    lightboxImg.src = lightboxImages[lightboxIndex];
  }
  if (e.key === "ArrowRight") {
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    lightboxImg.src = lightboxImages[lightboxIndex];
  }
});

// ── Cart Functions ──
function cartKey(productId, size, color) {
  return productId + "-" + size + "-" + color;
}

function addToCart(productId, size, color) {
  var product = products.find(function(p) { return p.id === productId; });
  if (!product) return;

  var variant = getVariant(product, color);
  var key = cartKey(productId, size, color);
  var existing = cart.find(function(item) { return item.key === key; });

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
  openCart();
  showToast(product.name + " added to cart");

  if (window.HoodooAnalytics) HoodooAnalytics.track("add_to_cart");
}

function updateItemQty(key, delta) {
  var item = cart.find(function(i) { return i.key === key; });
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
  if (cart.length === 0) { cartShippingBar.style.display = "none"; return; }
  var total = cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);
  cartShippingBar.style.display = "block";
  if (total >= FREE_SHIPPING_THRESHOLD) {
    shippingBarText.textContent = "You've unlocked free shipping!";
    shippingBarFill.style.width = "100%";
  } else {
    var rem = ((FREE_SHIPPING_THRESHOLD - total) / 100).toFixed(2);
    shippingBarText.textContent = "$" + rem + " away from free shipping";
    shippingBarFill.style.width = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100) + "%";
  }
}

function updateCart() {
  var totalItems = cart.reduce(function(sum, item) { return sum + item.quantity; }, 0);

  [cartCount, cartCountMobile].forEach(function(badge) {
    if (!badge) return;
    badge.textContent = totalItems;
    if (totalItems > 0) { badge.classList.add("visible"); }
    else { badge.classList.remove("visible"); }
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
      '<div class="cart-item-image"><img src="' + item.image + '" alt="' + item.name + '" /></div>' +
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

  cartItemsEl.querySelectorAll(".cart-qty-btn").forEach(function(btn) {
    btn.addEventListener("click", function() { updateItemQty(btn.dataset.key, Number(btn.dataset.delta)); });
  });

  cartItemsEl.querySelectorAll(".cart-item-remove").forEach(function(btn) {
    btn.addEventListener("click", function() { removeFromCart(btn.dataset.key); });
  });

  var total = cart.reduce(function(sum, item) { return sum + item.price * item.quantity; }, 0);

  // Show discount line
  var existingDL = document.getElementById("cart-discount-line");
  if (existingDL) existingDL.remove();
  if (appliedDiscount) {
    var da = appliedDiscount.type === "percent" ? Math.round((total * appliedDiscount.value) / 100) : Math.min(appliedDiscount.value, total);
    var dl = document.createElement("div");
    dl.id = "cart-discount-line";
    dl.className = "cart-discount-line";
    dl.innerHTML = '<span>' + appliedDiscount.code + ' (' + (appliedDiscount.type === "percent" ? appliedDiscount.value + '%' : '$' + (appliedDiscount.value / 100).toFixed(2)) + ')<button class="cart-discount-remove" onclick="removeDiscount()">Remove</button></span><span>-$' + (da / 100).toFixed(2) + '</span>';
    var td = cartTotalEl.parentElement;
    td.parentElement.insertBefore(dl, td);
    cartTotalEl.textContent = "$" + ((total - da) / 100).toFixed(2);
  } else {
    cartTotalEl.textContent = "$" + (total / 100).toFixed(2);
  }

  updateShippingBar();
}

// ── Discount Code ──
var appliedDiscount = JSON.parse(sessionStorage.getItem("hoodoo_discount") || "null");

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
  discountInput.addEventListener("keydown", function(e) { if (e.key === "Enter") applyBtn.click(); });
})();

function removeDiscount() {
  appliedDiscount = null;
  saveDiscount();
  var msg = document.getElementById("discount-msg");
  if (msg) { msg.textContent = ""; msg.className = "discount-msg"; }
  updateCart();
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

// ── Checkout ──
checkoutBtn.addEventListener("click", async function() {
  if (cart.length === 0) return;
  if (window.HoodooAnalytics) HoodooAnalytics.track("checkout_start");

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Processing...";

  var items = cart.map(function(item) {
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
    var res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items, discountCode: appliedDiscount ? appliedDiscount.code : null }),
    });
    var data = await res.json();
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
    var res = await fetch("/api/products");
    products = await res.json();
  } catch (err) {
    console.error("Failed to load products:", err);
  }
  renderProductDetail();
  updateCart();

  if (window.HoodooAnalytics && getProductId()) {
    HoodooAnalytics.track("product_view");
  }
}
init();
