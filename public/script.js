// ── Tapstitch Product Catalog ──
// Products mapped to actual Tapstitch offerings with realistic cost + margin pricing.
// tapstitchProductId values are placeholders — replace with your real Tapstitch product IDs.
const products = [
  {
    id: 1,
    name: "Heavyweight Tee",
    description: "6.5oz cotton, relaxed boxy fit, DTG printed",
    productType: "tee",
    tapstitchProductId: "TS-HW-TEE-001",
    printMethod: "dtg",
    price: 4500,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "White", "Charcoal", "Sand"],
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop",
  },
  {
    id: 2,
    name: "400GSM Hoodie",
    description: "French terry, dropped shoulders, puff print ready",
    productType: "hoodie",
    tapstitchProductId: "TS-HW-HOOD-001",
    printMethod: "dtg",
    price: 8500,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Cream", "Slate", "Forest"],
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop",
  },
  {
    id: 3,
    name: "Crew Sweatshirt",
    description: "350GSM fleece, boxy silhouette, embroidery available",
    productType: "sweatshirt",
    tapstitchProductId: "TS-CREW-001",
    printMethod: "dtg",
    price: 7200,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "White", "Heather Grey", "Navy"],
    image: "https://images.unsplash.com/photo-1578768079470-0a4536b2d467?w=600&h=800&fit=crop",
  },
  {
    id: 4,
    name: "Jogger Pants",
    description: "Tapered leg, elastic waist, French terry",
    productType: "joggers",
    tapstitchProductId: "TS-JOG-001",
    printMethod: "dtg",
    price: 6800,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Charcoal", "Slate"],
    image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&h=800&fit=crop",
  },
  {
    id: 5,
    name: "Long Sleeve Tee",
    description: "6.5oz cotton, oversized fit, screen print",
    productType: "longsleeve",
    tapstitchProductId: "TS-LS-TEE-001",
    printMethod: "screen",
    price: 5200,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "White", "Olive", "Sand"],
    image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=800&fit=crop",
  },
  {
    id: 6,
    name: "Zip-Up Jacket",
    description: "Heavyweight cotton, full zip, woven label",
    productType: "jacket",
    tapstitchProductId: "TS-ZIP-001",
    printMethod: "embroidery",
    price: 11500,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Navy", "Olive"],
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop",
  },
];

// ── Cart State ──
let cart = [];

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
    <div class="product-card" data-id="${p.id}">
      <div class="product-image">
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
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
          <button class="product-buy" data-id="${p.id}">Add to Cart</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  productGrid.querySelectorAll(".product-buy").forEach((btn) => {
    btn.addEventListener("click", () => {
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

  updateCart();
  openCart();
}

function removeFromCart(key) {
  cart = cart.filter((item) => item.key !== key);
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
