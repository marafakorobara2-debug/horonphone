const defaultProducts = [
  { id: 1, name: "Coque Halo MagSafe", category: "iphone", label: "iPhone", price: 14900, oldPrice: 17900, stock: 24, badge: "Best-seller", art: "case", colors: ["#174dca", "#20242b", "#ff9a80"], rating: 4.9, description: "Protection fine, aimants puissants et finition mate douce au toucher. Compatible iPhone 15 et 16." },
  { id: 2, name: "Coque Frame Galaxy", category: "samsung", label: "Samsung", price: 12500, stock: 18, badge: "Nouveau", art: "samsung", colors: ["#272a30", "#c8d0e2", "#89816d"], rating: 4.8, description: "Une coque sobre et robuste avec protection renforcée des objectifs pour Galaxy S24 et S25." },
  { id: 3, name: "Chargeur GaN 30 W", category: "chargeurs", label: "Charge rapide", price: 19900, oldPrice: 22900, stock: 31, badge: "-13%", art: "charger", colors: ["#f5f4ef", "#20242b"], rating: 4.9, description: "Un concentré de puissance compact. Recharge rapide USB-C PD pour iPhone et Samsung Galaxy." },
  { id: 4, name: "Câble USB-C tressé 2 m", category: "chargeurs", label: "Câbles", price: 8900, stock: 42, badge: "Renforcé", art: "cable", colors: ["#ece9df", "#174dca", "#e98a70"], rating: 4.7, description: "Souple, renforcé et certifié 100 W. Pensé pour résister à plus de 20 000 flexions." },
  { id: 5, name: "Verre Shield 9H", category: "iphone", label: "iPhone", price: 7500, stock: 36, badge: "Pack de 2", art: "glass", colors: ["#d9e7f5"], rating: 4.8, description: "Verre bord à bord ultra clair avec kit de pose facile et traitement anti-traces." },
  { id: 6, name: "Batterie Snap 10K", category: "iphone", label: "MagSafe", price: 29900, stock: 12, badge: "Autonomie +", art: "powerbank", colors: ["#262a31", "#e7e3da"], rating: 4.9, description: "Batterie magnétique 10 000 mAh, affichage de charge et recharge USB-C bidirectionnelle." },
  { id: 7, name: "Étui Buds Soft", category: "samsung", label: "Audio", price: 9500, stock: 15, badge: "Doux", art: "buds", colors: ["#f4f2eb", "#8fa7db", "#f09b83"], rating: 4.6, description: "Étui antichoc avec mousqueton discret, compatible Galaxy Buds 3 et Buds 3 Pro." },
  { id: 8, name: "Support voiture Grip", category: "samsung", label: "Voiture", price: 16900, stock: 21, badge: "Universel", art: "holder", colors: ["#20242b"], rating: 4.8, description: "Fixation stable sur grille d’aération, rotation 360° et pose du téléphone à une main." }
];

function loadLocal(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved ?? structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let products = loadLocal("mobilab-products", defaultProducts).map(product => ({ stock: 10, ...product }));
let users = loadLocal("mobilab-users", []);
let orders = loadLocal("mobilab-orders", []);
let sessionUserId = localStorage.getItem("mobilab-session");

if (users.some(user => user.id === "admin-local")) {
  users = users.filter(user => user.id !== "admin-local");
  saveLocal("mobilab-users", users);
  if (sessionUserId === "admin-local") {
    sessionUserId = null;
    localStorage.removeItem("mobilab-session");
  }
}

const productGrid = document.querySelector(".product-grid");
const emptyState = document.querySelector(".empty-state");
const searchPanel = document.querySelector(".search-panel");
const searchInput = document.querySelector("#site-search");
const cartDrawer = document.querySelector(".cart-drawer");
const overlay = document.querySelector(".page-overlay");
const quickView = document.querySelector(".quick-view");
const accountDialog = document.querySelector(".account-dialog");
const accountContent = document.querySelector(".account-content");
const adminDialog = document.querySelector(".admin-dialog");
const adminContent = document.querySelector(".admin-content");
const toast = document.querySelector(".toast");
const installButton = document.querySelector(".install-app-button");
const accountButton = document.querySelector(".account-button");

let activeFilter = "all";
let query = "";
let authMode = "login";
let activeAdminView = "dashboard";
let cart = loadLocal("mobilab-cart", []);
let favorites = new Set(loadLocal("mobilab-favorites", []));
let toastTimer;
let deferredInstallPrompt = null;

const money = value => `${new Intl.NumberFormat("fr-FR").format(Number(value) || 0)} FCFA`;
const formatDate = value => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const escapeHTML = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const currentUser = () => users.find(user => user.id === sessionUserId) || null;
const initials = name => String(name || "ML").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

async function hashPassword(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function iconHeart() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.5 9.5c0 5-8.5 9.5-8.5 9.5S3.5 14.5 3.5 9.5a4.3 4.3 0 0 1 7.5-2.9l1 1.1 1-1.1a4.3 4.3 0 0 1 7.5 2.9Z"></path></svg>`;
}

function artMarkup(type) {
  const safeType = ["case", "samsung", "charger", "cable", "glass", "powerbank", "buds", "holder"].includes(type) ? type : "case";
  return `<span class="product-art art-${safeType}">${safeType === "holder" ? "<span></span>" : ""}</span>`;
}

function productMedia(product) {
  return product.image
    ? `<img class="product-photo" src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" />`
    : artMarkup(product.art);
}

function resizeProductImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) { resolve(""); return; }
    if (file.size > 10 * 1024 * 1024) { reject(new Error("La photo ne doit pas dépasser 10 Mo.")); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire cette photo."));
    reader.onload = () => {
      const image = document.createElement("img");
      image.onerror = () => reject(new Error("Format d’image non reconnu."));
      image.onload = () => {
        const maxSize = 900;
        const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * ratio));
        const height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function updateAccountButton() {
  const user = currentUser();
  document.querySelector(".account-status-dot").hidden = !user;
  accountButton.setAttribute("aria-label", user ? `Compte de ${user.name}` : "Ouvrir mon compte");
}

function renderProducts() {
  const normalized = query.trim().toLocaleLowerCase("fr");
  const filtered = products.filter(product => {
    const matchesFilter = activeFilter === "all" || product.category === activeFilter;
    const haystack = `${product.name} ${product.label} ${product.description}`.toLocaleLowerCase("fr");
    return matchesFilter && haystack.includes(normalized);
  });

  productGrid.innerHTML = filtered.map(product => `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-visual" role="button" tabindex="0" aria-label="Voir ${escapeHTML(product.name)}">
        <span class="product-badge">${product.stock > 0 ? escapeHTML(product.badge) : "Rupture"}</span>
        <button class="icon-button favorite ${favorites.has(product.id) ? "active" : ""}" type="button" aria-label="${favorites.has(product.id) ? "Retirer" : "Ajouter"} ${escapeHTML(product.name)} des favoris">${iconHeart()}</button>
        ${productMedia(product)}
        <button class="quick-add" type="button" ${product.stock <= 0 ? "disabled" : ""}>${product.stock > 0 ? "Ajouter au panier" : "Indisponible"}</button>
      </div>
      <div class="product-info">
        <div class="product-category"><span>${escapeHTML(product.label)}</span><span class="product-rating">★ ${product.rating}</span></div>
        <h3>${escapeHTML(product.name)}</h3>
        <div class="product-bottom">
          <div><span class="price">${money(product.price)}</span>${product.oldPrice ? `<span class="old-price">${money(product.oldPrice)}</span>` : ""}</div>
          <span class="color-dots" aria-label="${product.colors.length} coloris">${product.colors.map(color => `<i style="background:${color}"></i>`).join("")}</span>
        </div>
      </div>
    </article>
  `).join("");
  emptyState.hidden = filtered.length > 0;
}

function saveCart() {
  saveLocal("mobilab-cart", cart);
  updateCart();
}

function addToCart(productId) {
  const product = products.find(item => item.id === productId);
  if (!product || product.stock <= 0) {
    showToast("Ce produit est actuellement indisponible");
    return;
  }
  const existing = cart.find(item => item.id === productId);
  if (existing && existing.quantity >= product.stock) {
    showToast("Stock maximum atteint");
    return;
  }
  if (existing) existing.quantity += 1;
  else cart.push({ id: productId, quantity: 1 });
  saveCart();
  showToast("Ajouté au panier ✓");
}

function updateCart() {
  cart = cart.filter(item => products.some(product => product.id === item.id));
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector(".cart-count").textContent = totalCount;
  document.querySelector(".drawer-count").textContent = totalCount;
  const itemsEl = document.querySelector(".cart-items");
  const emptyEl = document.querySelector(".cart-empty");
  const footerEl = document.querySelector(".cart-footer");
  emptyEl.hidden = cart.length > 0;
  footerEl.hidden = cart.length === 0;

  itemsEl.innerHTML = cart.map(item => {
    const product = products.find(entry => entry.id === item.id);
    return `<article class="cart-item" data-product-id="${product.id}">
      <div class="cart-item-visual">${productMedia(product)}</div>
      <div><h3>${escapeHTML(product.name)}</h3><p>${money(product.price)}</p>
        <div class="quantity-control"><button type="button" data-quantity="minus" aria-label="Diminuer">−</button><span>${item.quantity}</span><button type="button" data-quantity="plus" aria-label="Augmenter">+</button></div>
      </div>
      <button class="remove-item" type="button" aria-label="Retirer ${escapeHTML(product.name)}">×</button>
    </article>`;
  }).join("");
  const total = cart.reduce((sum, item) => sum + products.find(product => product.id === item.id).price * item.quantity, 0);
  document.querySelector(".cart-total").textContent = money(total);
}

function openCart() {
  closeSearch();
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
  document.body.classList.add("locked");
  setTimeout(() => document.querySelector(".drawer-close").focus(), 150);
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  document.body.classList.remove("locked");
}

function closeSearch() {
  searchPanel.classList.remove("open");
  searchPanel.setAttribute("aria-hidden", "true");
}

function openProduct(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) return;
  document.querySelector(".modal-content").innerHTML = `<div class="modal-layout">
    <div class="modal-visual">${productMedia(product)}</div>
    <div class="modal-copy"><p class="section-index">${escapeHTML(product.label)}</p><h2>${escapeHTML(product.name)}</h2><p class="modal-description">${escapeHTML(product.description)}</p><div class="modal-price">${money(product.price)}</div><div class="modal-meta"><span>Expédition sous 24 h</span><span>Garantie 12 mois</span><span>${product.stock} unité(s) en stock</span></div><button class="button button-primary modal-add" type="button" data-id="${product.id}" ${product.stock <= 0 ? "disabled" : ""}>${product.stock > 0 ? "Ajouter au panier" : "Indisponible"} <span>→</span></button></div>
  </div>`;
  quickView.showModal();
}

function authShell(content) {
  return `<div class="auth-layout">
    <aside class="auth-aside">
      <span class="brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i></span><span>Horon Phone</span></span>
      <h2>Votre univers mobile, personnel.</h2>
      <p>Créez un compte pour commander plus vite et retrouver vos achats.</p>
    </aside>
    <div class="auth-main">${content}</div>
  </div>`;
}

function renderAccount() {
  const user = currentUser();
  if (user) {
    accountContent.innerHTML = `<div class="profile-card">
      <span class="profile-avatar">${initials(user.name)}</span>
      <p class="section-index">MON COMPTE</p>
      <h2 id="account-dialog-title">Bonjour, ${escapeHTML(user.name.split(" ")[0])}</h2>
      <p>${escapeHTML(user.email)}</p>
      <span class="profile-role">${user.role === "admin" ? "Administrateur" : "Client Horon Phone"}</span>
      <div class="profile-actions">
        ${user.role === "admin" ? '<button class="button button-primary open-admin" type="button">Ouvrir l’administration <span>→</span></button>' : ""}
        <button class="button button-secondary view-orders" type="button">Mes commandes</button>
        <button class="button button-danger logout-button" type="button">Se déconnecter</button>
      </div>
    </div>`;
    return;
  }

  const login = `<div class="auth-tabs"><button class="auth-tab active" type="button" data-auth-mode="login">Connexion</button><button class="auth-tab" type="button" data-auth-mode="register">Inscription</button></div>
    <form class="auth-form login-form">
      <p class="section-index">BON RETOUR</p><h2 id="account-dialog-title">Se connecter</h2><p>Accédez à votre panier et à vos commandes.</p>
      <label class="field"><span>Adresse email</span><input name="email" type="email" autocomplete="email" required /></label>
      <label class="field"><span>Mot de passe</span><input name="password" type="password" autocomplete="current-password" required /></label>
      <p class="form-error" role="alert"></p>
      <button class="button button-primary auth-submit" type="submit">Connexion <span>→</span></button>
      <p class="auth-note">Vos données sont enregistrées localement sur cet appareil.</p>
    </form>`;

  const firstAccountIsAdmin = !users.some(user => user.role === "admin");
  const register = `<div class="auth-tabs"><button class="auth-tab" type="button" data-auth-mode="login">Connexion</button><button class="auth-tab active" type="button" data-auth-mode="register">Inscription</button></div>
    <form class="auth-form register-form">
      <p class="section-index">NOUVEAU COMPTE</p><h2 id="account-dialog-title">Créer un compte</h2><p>Quelques secondes suffisent pour rejoindre Horon Phone.</p>
      <label class="field"><span>Nom complet</span><input name="name" type="text" autocomplete="name" minlength="2" required /></label>
      <label class="field"><span>Adresse email</span><input name="email" type="email" autocomplete="email" required /></label>
      <label class="field"><span>Téléphone</span><input name="phone" type="tel" autocomplete="tel" placeholder="+223 70 00 00 00" /></label>
      <label class="field"><span>Mot de passe</span><input name="password" type="password" autocomplete="new-password" minlength="8" required /></label>
      <p class="form-error" role="alert"></p>
      <button class="button button-primary auth-submit" type="submit">Créer mon compte <span>→</span></button>
      ${firstAccountIsAdmin ? '<p class="auth-note">Le premier compte créé sur cet appareil devient le compte administrateur local.</p>' : ""}
    </form>`;

  accountContent.innerHTML = authShell(authMode === "register" ? register : login);
}

function openAccount(mode = "login") {
  authMode = mode;
  renderAccount();
  if (!accountDialog.open) accountDialog.showModal();
}

function orderRows(items) {
  if (!items.length) return '<tr><td colspan="5" class="empty-admin">Aucune commande pour le moment.</td></tr>';
  return items.map(order => {
    const user = users.find(entry => entry.id === order.userId);
    return `<tr data-order-id="${order.id}"><td><strong>${escapeHTML(order.id)}</strong></td><td>${escapeHTML(user?.name || order.customerName || "Client")}</td><td>${money(order.total)}</td><td>${formatDate(order.createdAt)}</td><td><span class="status-pill">${escapeHTML(order.status)}</span></td></tr>`;
  }).join("");
}

function renderAdmin(view = activeAdminView) {
  const admin = currentUser();
  if (!admin || admin.role !== "admin") {
    if (adminDialog.open) adminDialog.close();
    showToast("Accès administrateur requis");
    return;
  }
  activeAdminView = view;
  document.querySelectorAll(".admin-nav").forEach(button => button.classList.toggle("active", button.dataset.adminView === view));
  document.querySelector(".admin-identity").innerHTML = `<span class="admin-mini-avatar">${initials(admin.name)}</span><span>${escapeHTML(admin.email)}</span>`;

  if (view === "dashboard") {
    const revenue = orders.filter(order => order.status !== "Annulée").reduce((sum, order) => sum + order.total, 0);
    const lowStock = products.filter(product => product.stock <= 5).length;
    adminContent.innerHTML = `<div class="stats-grid">
      <article class="stat-card"><span>Produits</span><strong>${products.length}</strong><em>${lowStock} stock(s) faible(s)</em></article>
      <article class="stat-card"><span>Commandes</span><strong>${orders.length}</strong><em>${orders.filter(order => order.status === "Nouvelle").length} nouvelle(s)</em></article>
      <article class="stat-card"><span>Utilisateurs</span><strong>${users.length}</strong><em>Comptes enregistrés</em></article>
      <article class="stat-card"><span>Chiffre d’affaires</span><strong>${money(revenue)}</strong><em>Hors commandes annulées</em></article>
    </div>
    <section class="admin-card"><div class="admin-card-header"><div><h3>Commandes récentes</h3><p>Les cinq dernières commandes enregistrées.</p></div><button class="mini-button primary" type="button" data-go-admin="orders">Tout afficher</button></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Référence</th><th>Client</th><th>Total</th><th>Date</th><th>État</th></tr></thead><tbody>${orderRows([...orders].reverse().slice(0, 5))}</tbody></table></div></section>`;
  }

  if (view === "products") {
    adminContent.innerHTML = `<section class="admin-card"><div class="admin-card-header"><div><h3>Catalogue produits</h3><p>Ajoutez un article, modifiez son prix, son stock ou sa photo.</p></div></div>
      <form class="product-create-form">
        <label class="field"><span>Nom du produit</span><input name="name" required /></label>
        <label class="field"><span>Catégorie</span><select name="category"><option value="iphone">iPhone</option><option value="samsung">Samsung</option><option value="chargeurs">Chargeurs</option></select></label>
        <label class="field"><span>Prix FCFA</span><input name="price" type="number" min="0" required /></label>
        <label class="field"><span>Stock</span><input name="stock" type="number" min="0" required /></label>
        <label class="field photo-field"><span>Photo</span><input name="image" type="file" accept="image/png,image/jpeg,image/webp" /></label>
        <button class="button button-primary" type="submit">Ajouter</button>
      </form>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Produit</th><th>Photo</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Actions</th></tr></thead><tbody>${products.map(product => `<tr data-product-id="${product.id}"><td><span class="table-product"><span class="table-product-art">${productMedia(product)}</span><strong>${escapeHTML(product.name)}</strong></span></td><td><span class="photo-actions"><label class="mini-button photo-upload-button">${product.image ? "Remplacer" : "Ajouter"}<input class="product-image-input" type="file" accept="image/png,image/jpeg,image/webp" hidden /></label>${product.image ? '<button class="mini-button remove-product-image" type="button">Retirer</button>' : ""}</span></td><td><select data-product-field="category"><option value="iphone" ${product.category === "iphone" ? "selected" : ""}>iPhone</option><option value="samsung" ${product.category === "samsung" ? "selected" : ""}>Samsung</option><option value="chargeurs" ${product.category === "chargeurs" ? "selected" : ""}>Chargeurs</option></select></td><td><input data-product-field="price" type="number" min="0" value="${product.price}" /></td><td><input data-product-field="stock" type="number" min="0" value="${product.stock}" /></td><td><span class="table-actions"><button class="mini-button primary save-product" type="button">Enregistrer</button><button class="mini-button danger delete-product" type="button">Supprimer</button></span></td></tr>`).join("")}</tbody></table></div>
    </section>`;
  }

  if (view === "orders") {
    adminContent.innerHTML = `<section class="admin-card"><div class="admin-card-header"><div><h3>Gestion des commandes</h3><p>Mettez à jour l’avancement de chaque commande.</p></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Référence</th><th>Client</th><th>Articles</th><th>Total</th><th>Date</th><th>Statut</th></tr></thead><tbody>${orders.length ? [...orders].reverse().map(order => { const user = users.find(entry => entry.id === order.userId); return `<tr data-order-id="${order.id}"><td><strong>${escapeHTML(order.id)}</strong></td><td>${escapeHTML(user?.name || order.customerName || "Client")}</td><td>${order.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td>${money(order.total)}</td><td>${formatDate(order.createdAt)}</td><td><select class="order-status"><option ${order.status === "Nouvelle" ? "selected" : ""}>Nouvelle</option><option ${order.status === "Confirmée" ? "selected" : ""}>Confirmée</option><option ${order.status === "Expédiée" ? "selected" : ""}>Expédiée</option><option ${order.status === "Livrée" ? "selected" : ""}>Livrée</option><option ${order.status === "Annulée" ? "selected" : ""}>Annulée</option></select></td></tr>`; }).join("") : '<tr><td colspan="6" class="empty-admin">Aucune commande pour le moment.</td></tr>'}</tbody></table></div></section>`;
  }

  if (view === "users") {
    adminContent.innerHTML = `<section class="admin-card"><div class="admin-card-header"><div><h3>Comptes utilisateurs</h3><p>Consultez les inscriptions et gérez les rôles.</p></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Utilisateur</th><th>Email</th><th>Téléphone</th><th>Inscription</th><th>Rôle</th><th>Action</th></tr></thead><tbody>${users.map(user => `<tr data-user-id="${user.id}"><td><strong>${escapeHTML(user.name)}</strong></td><td>${escapeHTML(user.email)}</td><td>${escapeHTML(user.phone || "—")}</td><td>${formatDate(user.createdAt)}</td><td><select class="role-select" ${user.id === admin.id ? "disabled" : ""}><option value="customer" ${user.role === "customer" ? "selected" : ""}>Client</option><option value="admin" ${user.role === "admin" ? "selected" : ""}>Administrateur</option></select></td><td>${user.id !== admin.id ? '<button class="mini-button danger delete-user" type="button">Supprimer</button>' : '<span class="status-pill">Vous</span>'}</td></tr>`).join("")}</tbody></table></div></section>`;
  }
}

function openAdmin(view = "dashboard") {
  const user = currentUser();
  if (!user || user.role !== "admin") {
    showToast("Connectez-vous avec un compte administrateur");
    openAccount("login");
    return;
  }
  if (accountDialog.open) accountDialog.close();
  if (!adminDialog.open) adminDialog.showModal();
  renderAdmin(view);
}

productGrid.addEventListener("click", event => {
  const card = event.target.closest(".product-card");
  if (!card) return;
  const id = Number(card.dataset.productId);
  if (event.target.closest(".favorite")) {
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    saveLocal("mobilab-favorites", [...favorites]);
    document.querySelector(".favorite-count").hidden = favorites.size === 0;
    document.querySelector(".favorite-count").textContent = favorites.size;
    renderProducts();
    showToast(favorites.has(id) ? "Ajouté aux favoris ♡" : "Retiré des favoris");
  } else if (event.target.closest(".quick-add")) {
    addToCart(id);
  } else {
    openProduct(id);
  }
});

productGrid.addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.classList.contains("product-visual")) {
    event.preventDefault();
    openProduct(Number(event.target.closest(".product-card").dataset.productId));
  }
});

document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
  renderProducts();
}));

document.querySelectorAll("[data-filter-target]").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filterTarget;
  document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item.dataset.filter === activeFilter));
  renderProducts();
  document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
}));

document.querySelector(".search-toggle").addEventListener("click", () => {
  const willOpen = !searchPanel.classList.contains("open");
  searchPanel.classList.toggle("open", willOpen);
  searchPanel.setAttribute("aria-hidden", String(!willOpen));
  if (willOpen) setTimeout(() => searchInput.focus(), 100);
});

searchInput.addEventListener("input", () => {
  query = searchInput.value;
  renderProducts();
  if (query) document.querySelector("#products").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector(".cart-button").addEventListener("click", openCart);
document.querySelector(".drawer-close").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.querySelector(".modal-close").addEventListener("click", () => quickView.close());
quickView.addEventListener("click", event => { if (event.target === quickView) quickView.close(); });
document.querySelector(".modal-content").addEventListener("click", event => {
  const button = event.target.closest(".modal-add");
  if (button) { addToCart(Number(button.dataset.id)); quickView.close(); openCart(); }
});

document.querySelector(".cart-items").addEventListener("click", event => {
  const itemEl = event.target.closest(".cart-item");
  if (!itemEl) return;
  const item = cart.find(entry => entry.id === Number(itemEl.dataset.productId));
  const product = products.find(entry => entry.id === item.id);
  if (event.target.closest(".remove-item")) cart = cart.filter(entry => entry !== item);
  if (event.target.dataset.quantity === "plus" && item.quantity < product.stock) item.quantity += 1;
  if (event.target.dataset.quantity === "minus") item.quantity > 1 ? item.quantity -= 1 : cart = cart.filter(entry => entry !== item);
  saveCart();
});

document.querySelector(".checkout-button").addEventListener("click", () => {
  const user = currentUser();
  if (!user) {
    closeCart();
    openAccount("login");
    showToast("Connectez-vous pour valider la commande");
    return;
  }
  if (!cart.length) return;
  const orderItems = cart.map(item => {
    const product = products.find(entry => entry.id === item.id);
    return { productId: product.id, name: product.name, price: product.price, quantity: item.quantity };
  });
  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  orders.push({ id: `CMD-${String(Date.now()).slice(-7)}`, userId: user.id, customerName: user.name, items: orderItems, total, status: "Nouvelle", createdAt: new Date().toISOString() });
  orderItems.forEach(item => { const product = products.find(entry => entry.id === item.productId); product.stock = Math.max(0, product.stock - item.quantity); });
  saveLocal("mobilab-orders", orders);
  saveLocal("mobilab-products", products);
  cart = [];
  saveCart();
  closeCart();
  renderProducts();
  showToast("Commande enregistrée avec succès ✓");
});

accountButton.addEventListener("click", () => openAccount("login"));
document.querySelector(".account-close").addEventListener("click", () => accountDialog.close());
accountDialog.addEventListener("click", event => { if (event.target === accountDialog) accountDialog.close(); });
accountContent.addEventListener("click", event => {
  const modeButton = event.target.closest("[data-auth-mode]");
  if (modeButton) { authMode = modeButton.dataset.authMode; renderAccount(); }
  if (event.target.closest(".logout-button")) {
    sessionUserId = null;
    localStorage.removeItem("mobilab-session");
    updateAccountButton();
    accountDialog.close();
    showToast("Vous êtes déconnecté");
  }
  if (event.target.closest(".open-admin")) openAdmin("dashboard");
  if (event.target.closest(".view-orders")) {
    const user = currentUser();
    const count = orders.filter(order => order.userId === user?.id).length;
    showToast(`${count} commande(s) enregistrée(s)`);
  }
});

accountContent.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.target;
  const error = form.querySelector(".form-error");
  const data = new FormData(form);
  const email = String(data.get("email") || "").trim().toLowerCase();
  const password = String(data.get("password") || "");
  error.textContent = "";

  if (form.classList.contains("login-form")) {
    const passwordHash = await hashPassword(password);
    const user = users.find(entry => entry.email.toLowerCase() === email && entry.passwordHash === passwordHash);
    if (!user) { error.textContent = "Email ou mot de passe incorrect."; return; }
    sessionUserId = user.id;
    localStorage.setItem("mobilab-session", user.id);
    updateAccountButton();
    renderAccount();
    showToast(`Bienvenue ${user.name.split(" ")[0]} !`);
  }

  if (form.classList.contains("register-form")) {
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    if (password.length < 8) { error.textContent = "Le mot de passe doit contenir au moins 8 caractères."; return; }
    if (users.some(entry => entry.email.toLowerCase() === email)) { error.textContent = "Un compte existe déjà avec cet email."; return; }
    const role = users.some(entry => entry.role === "admin") ? "customer" : "admin";
    const user = { id: crypto.randomUUID?.() || `user-${Date.now()}`, name, email, phone, passwordHash: await hashPassword(password), role, createdAt: new Date().toISOString() };
    users.push(user);
    saveLocal("mobilab-users", users);
    sessionUserId = user.id;
    localStorage.setItem("mobilab-session", user.id);
    updateAccountButton();
    renderAccount();
    showToast(role === "admin" ? "Compte administrateur créé ✓" : "Votre compte a été créé ✓");
  }
});

document.querySelectorAll(".admin-nav").forEach(button => button.addEventListener("click", () => renderAdmin(button.dataset.adminView)));
document.querySelector(".admin-exit").addEventListener("click", () => adminDialog.close());
adminContent.addEventListener("click", event => {
  const go = event.target.closest("[data-go-admin]");
  if (go) renderAdmin(go.dataset.goAdmin);

  const row = event.target.closest("tr[data-product-id]");
  if (row && event.target.closest(".save-product")) {
    const product = products.find(entry => entry.id === Number(row.dataset.productId));
    product.category = row.querySelector('[data-product-field="category"]').value;
    product.label = product.category === "iphone" ? "iPhone" : product.category === "samsung" ? "Samsung" : "Charge rapide";
    product.price = Math.max(0, Number(row.querySelector('[data-product-field="price"]').value));
    product.stock = Math.max(0, Number(row.querySelector('[data-product-field="stock"]').value));
    saveLocal("mobilab-products", products);
    renderProducts();
    updateCart();
    showToast("Produit mis à jour");
  }
  if (row && event.target.closest(".delete-product")) {
    products = products.filter(entry => entry.id !== Number(row.dataset.productId));
    saveLocal("mobilab-products", products);
    cart = cart.filter(item => products.some(product => product.id === item.id));
    saveCart();
    renderProducts();
    renderAdmin("products");
    showToast("Produit supprimé");
  }
  if (row && event.target.closest(".remove-product-image")) {
    const product = products.find(entry => entry.id === Number(row.dataset.productId));
    product.image = "";
    saveLocal("mobilab-products", products);
    renderProducts();
    updateCart();
    renderAdmin("products");
    showToast("Photo du produit retirée");
  }

  const userRow = event.target.closest("tr[data-user-id]");
  if (userRow && event.target.closest(".delete-user")) {
    const userId = userRow.dataset.userId;
    users = users.filter(entry => entry.id !== userId);
    saveLocal("mobilab-users", users);
    renderAdmin("users");
    showToast("Compte utilisateur supprimé");
  }
});

adminContent.addEventListener("submit", async event => {
  if (!event.target.classList.contains("product-create-form")) return;
  event.preventDefault();
  const data = new FormData(event.target);
  const category = String(data.get("category"));
  const art = category === "iphone" ? "case" : category === "samsung" ? "samsung" : "charger";
  let image = "";
  try {
    image = await resizeProductImage(data.get("image"));
  } catch (error) {
    showToast(error.message);
    return;
  }
  products.push({ id: Date.now(), name: String(data.get("name")).trim(), category, label: category === "iphone" ? "iPhone" : category === "samsung" ? "Samsung" : "Charge rapide", price: Math.max(0, Number(data.get("price"))), stock: Math.max(0, Number(data.get("stock"))), badge: "Nouveau", art, image, colors: ["#174dca"], rating: 4.8, description: "Nouveau produit ajouté depuis l’espace administrateur." });
  saveLocal("mobilab-products", products);
  renderProducts();
  renderAdmin("products");
  showToast("Nouveau produit ajouté");
});

adminContent.addEventListener("change", async event => {
  if (event.target.classList.contains("product-image-input")) {
    const row = event.target.closest("tr[data-product-id]");
    const product = products.find(entry => entry.id === Number(row.dataset.productId));
    try {
      const image = await resizeProductImage(event.target.files[0]);
      if (!image) return;
      product.image = image;
      saveLocal("mobilab-products", products);
      renderProducts();
      updateCart();
      renderAdmin("products");
      showToast("Photo du produit mise à jour");
    } catch (error) {
      showToast(error.message);
    }
    return;
  }
  const orderRow = event.target.closest("tr[data-order-id]");
  if (orderRow && event.target.classList.contains("order-status")) {
    const order = orders.find(entry => entry.id === orderRow.dataset.orderId);
    order.status = event.target.value;
    saveLocal("mobilab-orders", orders);
    showToast("Statut de commande mis à jour");
  }
  const userRow = event.target.closest("tr[data-user-id]");
  if (userRow && event.target.classList.contains("role-select")) {
    const user = users.find(entry => entry.id === userRow.dataset.userId);
    user.role = event.target.value;
    saveLocal("mobilab-users", users);
    showToast("Rôle utilisateur mis à jour");
  }
});

const menuButton = document.querySelector(".menu-button");
const mobileNav = document.querySelector(".mobile-nav");
menuButton.addEventListener("click", () => {
  const open = !mobileNav.classList.contains("open");
  mobileNav.classList.toggle("open", open);
  mobileNav.setAttribute("aria-hidden", String(!open));
  menuButton.setAttribute("aria-expanded", String(open));
});
mobileNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  mobileNav.classList.remove("open");
  mobileNav.setAttribute("aria-hidden", "true");
  menuButton.setAttribute("aria-expanded", "false");
}));

document.querySelector("[data-scroll='categories']").addEventListener("click", () => document.querySelector("#categories").scrollIntoView({ behavior: "smooth" }));

const models = {
  iphone: ["iPhone 16 Pro", "iPhone 16", "iPhone 15 Pro", "iPhone 14"],
  samsung: ["Galaxy S25 Ultra", "Galaxy S25", "Galaxy S24 Ultra", "Galaxy A55"]
};
document.querySelector("#brand-select").addEventListener("change", event => {
  document.querySelector("#model-select").innerHTML = models[event.target.value].map(model => `<option>${model}</option>`).join("");
});
document.querySelector(".device-form").addEventListener("submit", event => {
  event.preventDefault();
  activeFilter = document.querySelector("#brand-select").value;
  document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item.dataset.filter === activeFilter));
  renderProducts();
  document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
  showToast(`Produits compatibles avec ${document.querySelector("#model-select").value}`);
});
document.querySelector(".newsletter-form").addEventListener("submit", event => {
  event.preventDefault();
  event.target.reset();
  showToast("Bienvenue dans la communauté Horon Phone !");
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeSearch();
    if (cartDrawer.classList.contains("open")) closeCart();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) { showToast("Dans Chrome : menu ⋮ puis « Installer l’application »"); return; }
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
  if (choice.outcome === "accepted") showToast("Horon Phone est installée ✓");
});

window.addEventListener("appinstalled", () => { deferredInstallPrompt = null; installButton.hidden = true; });

document.querySelector(".favorite-count").hidden = favorites.size === 0;
document.querySelector(".favorite-count").textContent = favorites.size;
updateAccountButton();
renderProducts();
updateCart();
