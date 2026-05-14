// ── Product Catalog (fetched from API) ──
let products = [];

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
const cartCount = document.getElementById("cart-count");
const cartDrawer = document.getElementById("cart-drawer");
const cartOverlay = document.getElementById("cart-overlay");
const cartClose = document.getElementById("cart-close");
const cartItemsEl = document.getElementById("cart-items");
const cartFooter = document.getElementById("cart-footer");
const cartTotalEl = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");

// ── Render Products ──
function renderProducts() {
  productGrid.innerHTML = products
    .map(
      (p) => {
        const colors = getColors(p);
        const firstVariant = getVariant(p, colors[0]);
        const frontImg = firstVariant.image || p.image;
        const backImg = firstVariant.imageBack || p.imageBack || "";
        const price = firstVariant.price || p.price;
        return `
    <a href="/product.html?id=${p.id}" class="product-card-link">
      <div class="product-card" data-id="${p.id}">
        <div class="product-image">
          <img src="${frontImg}" alt="${p.name}" loading="lazy" class="product-img-front" />
          ${backImg ? `<img src="${backImg}" alt="${p.name} back" loading="lazy" class="product-img-back" />` : ""}
        </div>
        <div class="product-info">
          <h3 class="product-name">${p.name}</h3>
          <p class="product-desc">${p.description}</p>
          <div class="product-variants">
            <div class="variant-group">
              <label class="variant-label">Size</label>
              <select class="variant-select size-select" data-id="${p.id}">
                ${p.sizes.map((s) => `<option value="${s}">${s}</option>`).join("")}
              </select>
            </div>
            <div class="variant-group">
              <label class="variant-label">Color</label>
              <select class="variant-select color-select" data-id="${p.id}">
                ${colors.map((c) => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="product-bottom">
            <span class="product-price">$${(price / 100).toFixed(2)}</span>
            <button class="product-buy" data-id="${p.id}">Add to Cart</button>
          </div>
        </div>
      </div>
    </a>
  `;
      }
    )
    .join("");

  // Prevent link navigation when interacting with selects and add-to-cart button
  productGrid.querySelectorAll(".variant-select").forEach((sel) => {
    sel.addEventListener("click", (e) => e.preventDefault());
    sel.addEventListener("mousedown", (e) => e.stopPropagation());
  });

  // Color change listener — swap images and price
  productGrid.querySelectorAll(".color-select").forEach((sel) => {
    sel.addEventListener("change", (e) => {
      e.preventDefault();
      const id = Number(sel.dataset.id);
      const product = products.find((pr) => pr.id === id);
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

  productGrid.querySelectorAll(".product-buy").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const card = btn.closest(".product-card");
      const size = card.querySelector(".size-select").value;
      const color = card.querySelector(".color-select").value;
      addToCart(id, size, color);
    });
  });
}

// ── Cart Functions ──
function cartKey(productId, size, color) {
  return `${productId}-${size}-${color}`;
}

function addToCart(productId, size, color) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const variant = getVariant(product, color);
  const key = cartKey(productId, size, color);
  const existing = cart.find((item) => item.key === key);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      ...product,
      key,
      size,
      color,
      price: variant.price || product.price,
      image: variant.image || product.image,
      quantity: 1,
    });
  }

  saveCart();
  updateCart();
  openCart();

  if (window.HoodooAnalytics) HoodooAnalytics.track("add_to_cart");
}

function removeFromCart(key) {
  cart = cart.filter((item) => item.key !== key);
  saveCart();
  updateCart();
}

function updateCart() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    cartFooter.style.display = "none";
    return;
  }

  cartFooter.style.display = "block";

  cartItemsEl.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item">
      <div class="cart-item-image">
        <img src="${item.image}" alt="${item.name}" />
      </div>
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name} ${item.quantity > 1 ? `x${item.quantity}` : ""}</div>
        <div class="cart-item-variant">${item.color} / ${item.size}</div>
        <div class="cart-item-price">$${((item.price * item.quantity) / 100).toFixed(2)}</div>
        <button class="cart-item-remove" data-key="${item.key}">Remove</button>
      </div>
    </div>
  `
    )
    .join("");

  cartItemsEl.querySelectorAll(".cart-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => removeFromCart(btn.dataset.key));
  });

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotalEl.textContent = `$${(total / 100).toFixed(2)}`;
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
cartClose.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

// ── Checkout ──
checkoutBtn.addEventListener("click", async () => {
  if (cart.length === 0) return;

  if (window.HoodooAnalytics) HoodooAnalytics.track("checkout_start");

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Processing...";

  const items = cart.map((item) => ({
    name: item.name,
    description: item.description,
    price: item.price,
    quantity: item.quantity,
    size: item.size,
    color: item.color,
    tapstitchProductId: item.tapstitchProductId,
    productType: item.productType,
    printMethod: item.printMethod,
  }));

  try {
    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
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
  renderProducts();
  updateCart();
}
init();
