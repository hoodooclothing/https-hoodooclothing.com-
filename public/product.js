// ── Product Catalog (shared with script.js) ──
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
const pdpContainer = document.getElementById("pdp-container");
const cartBtn = document.getElementById("cart-btn");
const cartCount = document.getElementById("cart-count");
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

// ── Load Product Detail ──
function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

function renderProductDetail() {
  const id = getProductId();
  const product = products.find((p) => p.id === id);

  if (!product) {
    pdpContainer.innerHTML = `
      <div class="pdp-not-found">
        <h1>Product Not Found</h1>
        <p>Sorry, we couldn't find that product.</p>
        <a href="/" class="btn btn-primary">Back to Shop</a>
      </div>
    `;
    return;
  }

  document.title = `${product.name} — HOODOO`;

  const images = [product.image];
  if (product.imageBack) images.push(product.imageBack);

  pdpContainer.innerHTML = `
    <div class="pdp-breadcrumb">
      <a href="/">Home</a> / <a href="/#products">Shop</a> / <span>${product.name}</span>
    </div>
    <div class="pdp-layout">
      <div class="pdp-images">
        <div class="pdp-main-image" id="pdp-main-image">
          <img src="${product.image}" alt="${product.name}" class="pdp-img clickable-img" data-src="${product.image}" />
        </div>
        ${images.length > 1 ? `
          <div class="pdp-thumbs">
            ${images.map((img, i) => `
              <div class="pdp-thumb ${i === 0 ? "active" : ""}" data-src="${img}">
                <img src="${img}" alt="${product.name}" />
              </div>
            `).join("")}
          </div>
        ` : ""}
      </div>
      <div class="pdp-details">
        <h1 class="pdp-title">${product.name}</h1>
        <p class="pdp-price">$${(product.price / 100).toFixed(2)}</p>
        <p class="pdp-description">${product.description}</p>
        <span class="free-shipping-badge">Free Shipping</span>

        <div class="pdp-variants">
          <div class="pdp-variant-group">
            <label class="variant-label">Size</label>
            <div class="pdp-size-options" id="pdp-sizes">
              ${product.sizes.map((s, i) => `
                <button class="pdp-size-btn ${i === 0 ? "active" : ""}" data-size="${s}">${s}</button>
              `).join("")}
            </div>
          </div>
          ${product.colors.length > 1 ? `
            <div class="pdp-variant-group">
              <label class="variant-label">Color</label>
              <div class="pdp-color-options" id="pdp-colors">
                ${product.colors.map((c, i) => `
                  <button class="pdp-color-btn ${i === 0 ? "active" : ""}" data-color="${c}">${c}</button>
                `).join("")}
              </div>
            </div>
          ` : `<input type="hidden" id="pdp-single-color" value="${product.colors[0]}" />`}
        </div>

        <button class="btn btn-primary btn-full pdp-add-to-cart" id="pdp-add-to-cart">Add to Cart</button>

        <div class="pdp-meta">
          <div class="pdp-meta-row"><span>Type</span><span>${product.productType}</span></div>
          <div class="pdp-meta-row"><span>Print Method</span><span>${product.printMethod.toUpperCase()}</span></div>
          <div class="pdp-meta-row"><span>Product ID</span><span>${product.tapstitchProductId}</span></div>
        </div>
      </div>
    </div>
  `;

  // Thumbnail clicks
  const thumbs = pdpContainer.querySelectorAll(".pdp-thumb");
  const mainImage = pdpContainer.querySelector(".pdp-img");
  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      thumbs.forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
      mainImage.src = thumb.dataset.src;
      mainImage.dataset.src = thumb.dataset.src;
    });
  });

  // Size selector
  const sizeBtns = pdpContainer.querySelectorAll(".pdp-size-btn");
  sizeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      sizeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Color selector
  const colorBtns = pdpContainer.querySelectorAll(".pdp-color-btn");
  colorBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      colorBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Add to cart
  document.getElementById("pdp-add-to-cart").addEventListener("click", () => {
    const activeSize = pdpContainer.querySelector(".pdp-size-btn.active");
    const activeColor = pdpContainer.querySelector(".pdp-color-btn.active");
    const singleColor = pdpContainer.querySelector("#pdp-single-color");
    const size = activeSize ? activeSize.dataset.size : product.sizes[0];
    const color = activeColor ? activeColor.dataset.color : (singleColor ? singleColor.value : product.colors[0]);
    addToCart(product.id, size, color);
  });

  // Lightbox on image click
  mainImage.addEventListener("click", () => {
    openLightbox(mainImage.src);
  });
}

// ── Lightbox ──
function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.remove("open");
  document.body.style.overflow = "";
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox.classList.contains("open")) {
    closeLightbox();
  }
});

// ── Cart Functions (shared logic) ──
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
renderProductDetail();
updateCart();

// Track product view
if (window.HoodooAnalytics && getProductId()) {
  HoodooAnalytics.track("product_view");
}
