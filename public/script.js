// ── Tapstitch Product Catalog ──
// Products mapped to actual Tapstitch offerings with realistic cost + margin pricing.
// tapstitchProductId values are placeholders — replace with your real Tapstitch product IDs.
const products = [
  {
    id: 1,
    name: "Essential HooDoo Cotton Boxy Tee",
    description: "6.5oz heavyweight cotton, boxy relaxed fit, DTG printed",
    productType: "tee",
    tapstitchProductId: "TS-HW-TEE-001",
    printMethod: "dtg",
    price: 4500,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black"],
    image: "hoodoo-tee-front.webp",
    imageBack: "hoodoo-tee-back.png",
  },
  {
    id: 8,
    name: '"2nd Sight" Oversize Graphic Hoodie',
    description: "400GSM French terry, dropped shoulders, oversize fit, DTG printed",
    productType: "hoodie",
    tapstitchProductId: "TS-HW-HOOD-002",
    printMethod: "dtg",
    price: 7200,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Forest"],
    image: "2nd-sight-hoodie-front.png",
    imageBack: "2nd-sight-hoodie-back.png",
  },
  {
    id: 7,
    name: 'Vintage "Build Different" Wash Boxy Tee',
    description: "6.5oz heavyweight cotton, vintage wash finish, boxy relaxed fit, DTG printed",
    productType: "tee",
    tapstitchProductId: "TS-VW-TEE-001",
    printMethod: "dtg",
    price: 4800,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White"],
    image: "build-different-front.webp",
  },
];

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
      (p) => `
    <a href="/product.html?id=${p.id}" class="product-card-link">
      <div class="product-card" data-id="${p.id}">
        <div class="product-image">
          <img src="${p.image}" alt="${p.name}" loading="lazy" class="product-img-front" />
          ${p.imageBack ? `<img src="${p.imageBack}" alt="${p.name} back" loading="lazy" class="product-img-back" />` : ""}
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
                ${p.colors.map((c) => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="product-bottom">
            <span class="product-price">$${(p.price / 100).toFixed(2)}</span>
            <span class="free-shipping-badge">Free Shipping</span>
            <button class="product-buy" data-id="${p.id}">Add to Cart</button>
          </div>
        </div>
      </div>
    </a>
  `
    )
    .join("");

  // Prevent link navigation when interacting with selects and add-to-cart button
  productGrid.querySelectorAll(".variant-select").forEach((sel) => {
    sel.addEventListener("click", (e) => e.preventDefault());
    sel.addEventListener("mousedown", (e) => e.stopPropagation());
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
renderProducts();
updateCart();
