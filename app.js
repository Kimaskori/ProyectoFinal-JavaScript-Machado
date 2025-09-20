// app.js - Lógica del simulador Ecommerce
// Variables y estado
const productListEl = document.getElementById('product-list');
const cartCountEl = document.getElementById('cart-count');
const btnOpenCart = document.getElementById('btn-open-cart');
const btnCloseCart = document.getElementById('btn-close-cart');
const cartPanel = document.getElementById('cart-panel');
const cartItemsEl = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const btnCheckout = document.getElementById('btn-checkout');

let products = [];
let cart = loadCartFromStorage();

function saveCartToStorage() {
  localStorage.setItem('simulator_cart_v1', JSON.stringify(cart));
}

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem('simulator_cart_v1');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function findProductById(id) {
  return products.find(p => p.id === id);
}

function calculateCartTotal() {
  return cart.reduce((sum, item) => {
    const p = findProductById(item.id);
    return p ? sum + p.price * item.qty : sum;
  }, 0);
}

function updateCartCountUI() {
  const totalQty = cart.reduce((s,i)=>s+i.qty,0);
  cartCountEl.textContent = totalQty;
}

function renderStockBar(stock) {
  let level, color;

  if (stock > 15) {
    level = "100%";
    color = "green";
  } else if (stock > 5) {
    level = "60%";
    color = "orange";
  } else {
    level = "20%";
    color = "red";
  }

  return `
    <div class="stock-wrapper">
      <div class="stock-label">Stock</div>
      <div class="stock-inline">
        <div class="stock-fill-inline" style="width:${level}; background:${color}"></div>
      </div>
    </div>
  `;
}



function createProductCard(product) {
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `
    <img src="${product.image}" alt="${product.title}" loading="lazy" />
    <h3>${product.title}</h3>
    <p class="price">$${product.price.toFixed(2)}</p>
    <p class="muted">${product.description}</p>
    <div class="button-row">
      <button class="ghost btn-add" data-id="${product.id}">Agregar</button>
      <button class="ghost btn-more" data-id="${product.id}">Ver</button>
      ${renderStockBar(product.stock)}
    </div>
  `;
  return div;
}


function renderProducts() {
  productListEl.innerHTML = '';
  products.forEach(p => {
    const card = createProductCard(p);
    productListEl.appendChild(card);
  });

  document.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id));
  });
  document.querySelectorAll('.btn-more').forEach(btn => {
    btn.addEventListener('click', () => showProductDetails(btn.dataset.id));
  });
}

function renderCart() {
  cartItemsEl.innerHTML = '';
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p>El carrito está vacío.</p>';
    cartTotalEl.textContent = '0.00';
    updateCartCountUI();
    return;
  }

  cart.forEach(item => {
    const p = findProductById(item.id);
    if (!p) return;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${p.image}" alt="${p.title}" />
      <div style="flex:1">
        <div><strong>${p.title}</strong></div>
        <div class="muted">Unit: $${p.price.toFixed(2)}</div>
      </div>
      <div class="qty-controls">
        <button class="ghost btn-decrease" data-id="${item.id}">-</button>
        <div>${item.qty}</div>
        <button class="ghost btn-increase" data-id="${item.id}">+</button>
        <button class="ghost btn-remove" data-id="${item.id}">Eliminar</button>
      </div>
    `;
    cartItemsEl.appendChild(div);
  });

  cartItemsEl.querySelectorAll('.btn-increase').forEach(btn => {
    btn.addEventListener('click', () => changeQty(btn.dataset.id, 1));
  });
  cartItemsEl.querySelectorAll('.btn-decrease').forEach(btn => {
    btn.addEventListener('click', () => changeQty(btn.dataset.id, -1));
  });
  cartItemsEl.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });

  cartTotalEl.textContent = calculateCartTotal().toFixed(2);
  updateCartCountUI();
}

function addToCart(productId, qty = 1) {
  const product = findProductById(productId);
  if (!product) {
    Swal.fire('Error', 'Producto no encontrado', 'error');
    return;
  }
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    if (existing.qty + qty > product.stock) {
      Swal.fire('Stock', 'No hay stock suficiente', 'warning');
      return;
    }
    existing.qty += qty;
  } else {
    cart.push({ id: productId, qty: Math.min(qty, product.stock) });
  }
  saveCartToStorage();
  renderCart();
  Swal.fire({
    icon: 'success',
    title: 'Agregado',
    text: `${product.title} agregado al carrito.`,
    timer: 1100,
    showConfirmButton: false
  });
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  const product = findProductById(productId);
  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }
  if (newQty > product.stock) {
    Swal.fire('Stock', 'No hay stock suficiente', 'warning');
    return;
  }
  item.qty = newQty;
  saveCartToStorage();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCartToStorage();
  renderCart();
}


function showProductDetails(productId) {
  const p = findProductById(productId);
  if (!p) return;
  Swal.fire({
    title: p.title,
    html: `<img src="${p.image}" alt="${p.title}" style="max-width:100%;border-radius:8px"/><p style="text-align:left">${p.description}</p><p><strong>Precio:</strong> $${p.price.toFixed(2)}</p>`,
    showCloseButton: true,
    showCancelButton: true,
    confirmButtonText: 'Agregar al carrito'
  }).then(result => {
    if (result.isConfirmed) addToCart(productId, 1);
  });
}

async function simulatePaymentAndClearCart(buyerInfo) {
  Swal.fire({
    title: 'Procesando pago',
    html: 'Por favor espera...',
    didOpen: () => {
      Swal.showLoading();
    },
    allowOutsideClick: false
  });
  await new Promise(resolve => setTimeout(resolve, 1200));
  Swal.close();

  const total = calculateCartTotal().toFixed(2);
  const itemsList = cart.map(i => {
    const p = findProductById(i.id);
    return `${p.title} x${i.qty} — $${(p.price * i.qty).toFixed(2)}`;
  }).join('<br>');

  Swal.fire({
    icon: 'success',
    title: 'Pago OK',
    html: `<strong>Comprador:</strong> ${buyerInfo.name} <br>
           <strong>Total:</strong> $${total} <br><br>
           <strong>Detalle:</strong><br>${itemsList}`,
    confirmButtonText: 'Cerrar'
  });

  cart = [];
  saveCartToStorage();
  renderCart();
}
function handleCheckout() {
  if (cart.length === 0) {
    Swal.fire('Carrito vacío', 'Agregá productos antes de pagar.', 'info');
    return;
  }
  const preloaded = {
    name: 'Name',
    email: 'user@example.com',
    address: 'direccion'
  };

  Swal.fire({
    title: 'Formulario de pago',
    html:
      `<input id="swal-name" class="swal2-input" placeholder="Nombre" value="${preloaded.name}">
       <input id="swal-email" class="swal2-input" placeholder="Email" value="${preloaded.email}">
       <input id="swal-address" class="swal2-input" placeholder="Dirección" value="${preloaded.address}">`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Confirmar pago',
    preConfirm: () => {
      const name = document.getElementById('swal-name').value.trim();
      const email = document.getElementById('swal-email').value.trim();
      const address = document.getElementById('swal-address').value.trim();
      if (!name || !email) {
        Swal.showValidationMessage('Nombre y email son obligatorios');
        return false;
      }
      return { name, email, address };
    }
  }).then(result => {
    if (result.isConfirmed && result.value) {
      simulatePaymentAndClearCart(result.value);
    }
  });
}

btnOpenCart.addEventListener('click', () => {
  cartPanel.classList.remove('hidden');
  cartPanel.setAttribute('aria-hidden', 'false');
  renderCart();
});
btnCloseCart.addEventListener('click', () => {
  cartPanel.classList.add('hidden');
  cartPanel.setAttribute('aria-hidden', 'true');
});
btnCheckout.addEventListener('click', handleCheckout);

// Carga de productos desde JSON (asincrónico)
async function loadProducts() {
  try {
    const res = await fetch('products.json');
    if (!res.ok) throw new Error('No se pudo cargar products.json');
    products = await res.json();
    renderProducts();
    renderCart();
  } catch (err) {
    Swal.fire('Error', 'No se pudieron cargar los productos.', 'error');
  }
}

// Ejecutar
loadProducts();
