/* ═══════════════════════════════════════════════════════
   ДАЧНЫЙ ДОМ — ЛОГИКА ПРИЛОЖЕНИЯ
   ═══════════════════════════════════════════════════════ */

/* ─── РОУТЕР ─────────────────────────────────── */
let currentPage     = '';
let currentCategory = 'all';

function showPage(page, data = {}) {
  currentPage = page;
  window.scrollTo(0, 0);
  const container = document.getElementById('pageContainer');

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('nav-active'));

  const pageMap = {
    home:     renderHome,
    catalog:  renderCatalog,
    categories: renderCategories,
    cart:     renderCart,
    checkout: renderCheckout,
    contacts: renderContacts,
    reviews:  renderReviews,
    delivery: renderDelivery,
    favorites: renderFavorites,
    privacy:  renderPrivacy,
  };

  if (pageMap[page]) {
    container.innerHTML = pageMap[page](data);
    initPageScripts(page, data);
  }

  history.pushState({ page, data }, '', '#' + page);
}

function filterAndShow(category) {
  currentCategory = category;
  showPage('catalog');
}

function closeMenu() {
  document.getElementById('navMenu').classList.remove('nav-open');
  document.getElementById('menuToggle').classList.remove('is-open');
  document.body.style.overflow = '';
}

/* ─── КОРЗИНА ────────────────────────────────── */
const Cart = {
  _key: 'dd_cart',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this._key)) || []; } catch { return []; }
  },

  save(items) {
    localStorage.setItem(this._key, JSON.stringify(items));
    this.updateBadge();
    document.dispatchEvent(new CustomEvent('cartUpdated'));
  },

  add(productId, qty = 1) {
    const items    = this.getAll();
    const existing = items.find(i => i.id === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      const product = PRODUCTS.find(p => p.id === productId);
      if (!product) return;
      items.push({ id: productId, qty, name: product.name, price: product.price, image: product.image });
    }
    this.save(items);
    Toast.show('Товар добавлен в корзину 🛒', 'success');
    this._animateBadge();
  },

  remove(productId) {
    this.save(this.getAll().filter(i => i.id !== productId));
  },

  setQty(productId, qty) {
    const items = this.getAll();
    const item  = items.find(i => i.id === productId);
    if (item) {
      if (qty <= 0) { this.remove(productId); return; }
      item.qty = qty;
      this.save(items);
    }
  },

  clear() { this.save([]); },

  total()  { return this.getAll().reduce((sum, i) => sum + i.price * i.qty, 0); },
  count()  { return this.getAll().reduce((sum, i) => sum + i.qty, 0); },

  updateBadge() {
    const count = this.count();
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent    = count;
      el.style.display  = count > 0 ? 'flex' : 'none';
    });
  },

  _animateBadge() {
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.classList.remove('badge-pop');
      void el.offsetWidth;
      el.classList.add('badge-pop');
    });
  },
};

/* ─── ИЗБРАННОЕ ──────────────────────────────── */
const Favorites = {
  _key: 'dd_favorites',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this._key)) || []; } catch { return []; }
  },

  toggle(productId) {
    const favs = this.getAll();
    const idx  = favs.indexOf(productId);
    if (idx === -1) {
      favs.push(productId);
      Toast.show('Добавлено в избранное ❤️', 'success');
    } else {
      favs.splice(idx, 1);
      Toast.show('Удалено из избранного', 'info');
    }
    localStorage.setItem(this._key, JSON.stringify(favs));
    this.updateBadge();
    this._updateButtons(productId);
    document.dispatchEvent(new CustomEvent('favoritesUpdated'));
  },

  has(productId) { return this.getAll().includes(productId); },
  count()        { return this.getAll().length; },

  updateBadge() {
    const count = this.count();
    document.querySelectorAll('.fav-badge').forEach(el => {
      el.textContent   = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  _updateButtons(productId) {
    document.querySelectorAll(`[data-fav="${productId}"]`).forEach(btn => {
      btn.classList.toggle('is-fav', this.has(productId));
    });
  },
};

/* ─── TOAST ──────────────────────────────────── */
const Toast = {
  _container: null,

  _ensureContainer() {
    if (!this._container) {
      this._container           = document.createElement('div');
      this._container.className = 'toast-container';
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(message, type = 'info', duration = 3000) {
    const container   = this._ensureContainer();
    const toast       = document.createElement('div');
    toast.className   = `toast toast-${type}`;
    toast.innerHTML   = `<span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },
};

/* ─── FORMAT ─────────────────────────────────── */
const Format = {
  price(n)  { return new Intl.NumberFormat('ru-RU').format(n) + ' ₽'; },
  stars(r)  { return '★'.repeat(Math.floor(r)) + '☆'.repeat(5 - Math.floor(r)); },
};

/* ─── MODAL ──────────────────────────────────── */
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    el.addEventListener('click', e => { if (e.target === el) Modal.close(id); }, { once: true });
  },

  close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('modal-open');
    document.body.style.overflow = '';
  },
};

/* ─── ORDERS ─────────────────────────────────── */
const Orders = {
  _key: 'dd_orders',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this._key)) || []; } catch { return []; }
  },

  saveOrder(order) {
    const orders = this.getAll();
    const idx    = orders.findIndex(o => o.id === order.id);
    if (idx !== -1) orders[idx] = order; else orders.push(order);
    localStorage.setItem(this._key, JSON.stringify(orders));
  },

  createOrderObject(formData, cartItems) {
    return {
      id:        'DD-' + Date.now(),
      createdAt: new Date().toISOString(),
      status:    'new',
      customer:  {
        name:    formData.name,
        phone:   formData.phone,
        email:   formData.email,
        address: formData.address,
        comment: formData.comment,
      },
      delivery:     formData.delivery,
      payment:      formData.payment,
      items:        cartItems,
      total:        cartItems.reduce((s, i) => s + i.price * i.qty, 0),
      deliveryCost: formData.delivery === 'courier' ? CONFIG.deliveryPrice : 0,
    };
  },
};

/* ─── PAYMENT ────────────────────────────────── */
const Payment = {
  async createPayment(order) {
    if (!CONFIG.yookassaShopId) { return this._mockPayment(order); }
    try {
      /* TODO: fetch('/api/create-payment', {method:'POST', body:JSON.stringify(order)}) */
      return this._mockPayment(order);
    } catch (err) {
      this.paymentFail(order, err.message);
    }
  },

  _mockPayment(order) {
    setTimeout(() => this.paymentSuccess(order), 1500);
    return { status: 'mock' };
  },

  paymentSuccess(order) {
    Cart.clear();
    Orders.saveOrder({ ...order, status: 'paid', paidAt: new Date().toISOString() });
    Toast.show('Оплата прошла успешно! 🎉', 'success', 5000);
    window.location.hash = 'success';
  },

  paymentFail(order, reason) {
    Toast.show(`Ошибка оплаты: ${reason || 'попробуйте снова'}`, 'error', 5000);
  },

  paymentPending() {
    Toast.show('Платёж обрабатывается...', 'info', 3000);
  },
};

/* ─── LEADS ──────────────────────────────────── */
const Leads = {
  async send(data) {
    const promises = [];
    if (CONFIG.telegramBotToken && CONFIG.telegramChatId) promises.push(this._sendTelegram(data));
    if (CONFIG.googleScriptUrl) promises.push(this._sendGoogleSheets(data));
    if (promises.length === 0) { console.log('Leads (mock):', data); return { success: true, mock: true }; }
    const results = await Promise.allSettled(promises);
    return { success: results.some(r => r.status === 'fulfilled') };
  },

  async _sendTelegram(data) {
    const itemsText = data.items && data.items.length
      ? '\n\n🛒 <b>Товары:</b>\n' + data.items.map(i => `• ${i.name} × ${i.qty}`).join('\n')
      : '';

    const text = [
      '🌿 <b>Новая заявка — Дачный Дом</b>', '',
      `👤 <b>Имя:</b> ${data.name || '—'}`,
      `📞 <b>Телефон:</b> ${data.phone || '—'}`,
      `📧 <b>Email:</b> ${data.email || '—'}`,
      `💬 <b>Комментарий:</b> ${data.comment || '—'}`,
      data.total ? `💰 <b>Сумма:</b> ${Format.price(data.total)}` : '',
      itemsText,
      `🕐 ${new Date().toLocaleString('ru-RU')}`,
    ].filter(Boolean).join('\n');

    const res = await fetch(
      `https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CONFIG.telegramChatId, text, parse_mode: 'HTML' }) }
    );
    if (!res.ok) throw new Error('Telegram:' + res.status);
    return res.json();
  },

  async _sendGoogleSheets(data) {
    const res = await fetch(CONFIG.googleScriptUrl, {
      method: 'POST',
      body: JSON.stringify({ ...data, timestamp: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error('Sheets:' + res.status);
    return res.json();
  },
};

/* ═══════════════════════════════════════════════════════
   ГАЛЕРЕЯ ТОВАРА
   ═══════════════════════════════════════════════════════ */
const Gallery = {
  _currentIndex: 0,
  _images: [],
  _productId: null,

  init(productId, startIndex = 0) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    this._productId    = productId;
    this._images       = product.images && product.images.length ? product.images : [product.image];
    this._currentIndex = startIndex;
    this._render();
  },

  _render() {
    const wrap = document.getElementById('galleryMainWrap');
    if (!wrap) return;
    const img   = wrap.querySelector('.gallery-main-img');
    const ctr   = wrap.querySelector('.gallery-counter');
    const total = this._images.length;
    if (img) {
      img.style.opacity = '0';
      setTimeout(() => {
        img.src         = this._images[this._currentIndex];
        img.style.opacity = '1';
      }, 120);
    }
    if (ctr) ctr.textContent = `${this._currentIndex + 1} / ${total}`;

    // Обновляем миниатюры
    document.querySelectorAll('.gallery-thumb').forEach((th, i) => {
      th.classList.toggle('active', i === this._currentIndex);
    });
  },

  prev() {
    this._currentIndex = (this._currentIndex - 1 + this._images.length) % this._images.length;
    this._render();
  },

  next() {
    this._currentIndex = (this._currentIndex + 1) % this._images.length;
    this._render();
  },

  goTo(index) {
    this._currentIndex = index;
    this._render();
  },
};

/* ─── РЕНДЕР КАРТОЧКИ ТОВАРА ─────────────────── */
function renderProductCard(product) {
  const isFav    = Favorites.has(product.id);
  const badge    = product.badge
    ? `<span class="card-badge badge-${product.badge}">${product.badge === 'new' ? 'Новинка' : product.badge === 'sale' ? 'Скидка' : 'Хит'}</span>`
    : '';
  const oldPrice = product.oldPrice
    ? `<span class="price-old">${Format.price(product.oldPrice)}</span>`
    : '';

  return `
  <article class="product-card${product.inStock ? '' : ' out-of-stock'}" data-id="${product.id}">
    <a href="#" onclick="showProduct(${product.id});return false" class="card-img-wrap">
      <img src="${product.image}" alt="${product.name}" loading="lazy" class="card-img">
      ${badge}
      <button class="btn-fav ${isFav ? 'is-fav' : ''}" data-fav="${product.id}"
        onclick="event.preventDefault();Favorites.toggle(${product.id})" aria-label="В избранное">
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </a>
    <div class="card-body">
      <p class="card-category">${CATEGORIES.find(c => c.id === product.category)?.name || ''}</p>
      <h3 class="card-title">
        <a href="#" onclick="showProduct(${product.id});return false">${product.name}</a>
      </h3>
      <div class="card-rating">
        <span class="stars">${Format.stars(product.rating)}</span>
        <span class="rating-num">${product.rating}</span>
        <span class="rating-count">(${product.reviews})</span>
      </div>
      <div class="card-footer">
        <div class="card-price">
          <span class="price-current">${Format.price(product.price)}</span>
          ${oldPrice}
        </div>
        ${product.inStock
          ? `<button class="btn-add" onclick="Cart.add(${product.id})">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                 <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                 <line x1="3" y1="6" x2="21" y2="6"/>
                 <path d="M16 10a4 4 0 01-8 0"/>
               </svg>В корзину
             </button>`
          : '<span class="btn-unavailable">Нет в наличии</span>'
        }
      </div>
    </div>
  </article>`;
}

/* ─── МОДАЛЬНОЕ ОКНО ТОВАРА + ГАЛЕРЕЯ ────────── */
function showProduct(id) {
  const p = PRODUCTS.find(pr => pr.id === id);
  if (!p) return;

  const isFav  = Favorites.has(p.id);
  const images = p.images && p.images.length ? p.images : [p.image];
  const total  = images.length;

  const thumbsHtml = total > 1
    ? `<div class="gallery-thumbs">
        ${images.map((src, i) => `
          <div class="gallery-thumb${i === 0 ? ' active' : ''}" onclick="Gallery.goTo(${i})">
            <img src="${src}" alt="${p.name} фото ${i + 1}" loading="lazy">
          </div>`).join('')}
       </div>`
    : '';

  const arrowsHtml = total > 1
    ? `<button class="gallery-arrow gallery-arrow-prev" onclick="Gallery.prev()" aria-label="Назад">
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
           <polyline points="15 18 9 12 15 6"/>
         </svg>
       </button>
       <button class="gallery-arrow gallery-arrow-next" onclick="Gallery.next()" aria-label="Вперёд">
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
           <polyline points="9 18 15 12 9 6"/>
         </svg>
       </button>`
    : '';

  const content = document.getElementById('productModalContent');
  content.innerHTML = `
    <div class="product-page-grid">
      <div class="product-gallery-column">
        <div class="gallery-main-wrap" id="galleryMainWrap">
          ${arrowsHtml}
          <img class="gallery-main-img" src="${images[0]}" alt="${p.name}" id="modalMainImg">
          ${total > 1 ? `<div class="gallery-counter">1 / ${total}</div>` : ''}
        </div>
        ${thumbsHtml}
      </div>
      <div class="product-info-column">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span class="tag">${CATEGORIES.find(c => c.id === p.category)?.name || ''}</span>
          ${p.badge ? `<span class="card-badge badge-${p.badge}">${p.badge === 'new' ? 'Новинка' : p.badge === 'sale' ? 'Скидка' : 'Хит'}</span>` : ''}
        </div>
        <h2 style="font-size:1.5rem;margin-bottom:8px">${p.name}</h2>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;color:var(--text-muted);font-size:14px">
          <span style="color:#f09840">${Format.stars(p.rating)}</span>
          <span>${p.rating} (${p.reviews} отзывов)</span>
        </div>
        <div class="product-price-block">
          <span class="product-price">${Format.price(p.price)}</span>
          ${p.oldPrice ? `<span class="product-price-old">${Format.price(p.oldPrice)}</span>` : ''}
        </div>
        <p style="color:var(--text-muted);font-size:14px;margin-bottom:20px;line-height:1.65">${p.description}</p>
        ${p.features ? `<ul class="product-features">${p.features.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
        <div class="product-actions">
          ${p.inStock
            ? `<button class="btn btn-primary" onclick="Cart.add(${p.id});Modal.close('productModal')">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                   <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                   <line x1="3" y1="6" x2="21" y2="6"/>
                   <path d="M16 10a4 4 0 01-8 0"/>
                 </svg>В корзину
               </button>`
            : '<span class="btn-unavailable">Нет в наличии</span>'
          }
          <button class="btn btn-outline ${isFav ? 'is-fav' : ''}" data-fav="${p.id}" onclick="Favorites.toggle(${p.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            ${isFav ? 'В избранном' : 'В избранное'}
          </button>
        </div>
      </div>
    </div>`;

  Modal.open('productModal');
  Gallery.init(id, 0);

  // Свайп на мобильных
  _initGallerySwipe();
}

function _initGallerySwipe() {
  const wrap = document.getElementById('galleryMainWrap');
  if (!wrap) return;
  let startX = 0;
  wrap.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? Gallery.next() : Gallery.prev();
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════
   РЕНДЕР СТРАНИЦ
   ═══════════════════════════════════════════════════════ */

/* ─── ГЛАВНАЯ ────────────────────────────────── */
function renderHome() {
  const featured = PRODUCTS.filter(p => p.badge).slice(0, 8);
  return `
  <!-- HERO -->
  <section class="hero">
    <div class="container">
      <div class="hero-inner">
        <div class="hero-content">
          <div class="hero-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Премиальная садовая мебель
          </div>
          <h1>Создайте <em>уют</em> на вашей даче</h1>
          <p class="hero-desc">Качели, беседки, шезлонги и комплекты мебели для загородного отдыха. Материалы, которые служат десятилетиями.</p>
          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" onclick="showPage('catalog')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Смотреть каталог
            </button>
            <button class="btn btn-outline btn-lg" onclick="showPage('categories')">Категории</button>
          </div>
          <div class="hero-stats">
            <div class="stat-item"><div class="stat-num">500+</div><div class="stat-label">Товаров в каталоге</div></div>
            <div class="stat-item"><div class="stat-num">4.8★</div><div class="stat-label">Средняя оценка</div></div>
            <div class="stat-item"><div class="stat-num">12 000</div><div class="stat-label">Довольных клиентов</div></div>
          </div>
        </div>
        <div class="hero-img-wrap animate-on-scroll">
          <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
               alt="Садовая мебель Дачный Дом" loading="eager">
        </div>
      </div>
    </div>
  </section>

  <!-- КАТЕГОРИИ -->
  <section class="section" style="background:var(--white)">
    <div class="container">
      <div class="section-header animate-on-scroll">
        <div class="section-label">Ассортимент</div>
        <h2 class="section-title">Категории товаров</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px">
        ${CATEGORIES.filter(c => c.id !== 'all').map(cat => {
          const count = PRODUCTS.filter(p => p.category === cat.id).length;
          return `<button class="category-card animate-on-scroll"
            onclick="filterAndShow('${cat.id}')"
            style="border:none;cursor:pointer;background:var(--white);text-align:center;padding:20px 12px">
            <div class="category-card-name">${cat.name}</div>
            <div class="category-card-count">${count} товаров</div>
          </button>`;
        }).join('')}
      </div>
    </div>
  </section>

  <!-- ХИТЫ -->
  <section class="section">
    <div class="container">
      <div class="section-header animate-on-scroll">
        <div class="section-label">Популярное</div>
        <h2 class="section-title">Хиты продаж</h2>
        <p class="section-desc">Самые популярные товары по отзывам наших покупателей</p>
      </div>
      <div class="products-grid">
        ${featured.map(renderProductCard).join('')}
      </div>
      <div style="text-align:center;margin-top:40px">
        <button class="btn btn-outline btn-lg" onclick="showPage('catalog')">Смотреть все товары</button>
      </div>
    </div>
  </section>

  <!-- ПРЕИМУЩЕСТВА -->
  <section class="section" style="background:var(--white)">
    <div class="container">
      <div class="section-header animate-on-scroll">
        <div class="section-label">Почему мы</div>
        <h2 class="section-title">Наши преимущества</h2>
      </div>
      <div class="info-cards">
        ${[
          { icon: '🚚', title: 'Доставка по России',  text: 'Курьером до двери или самовывоз. Бесплатно от 15 000 ₽.' },
          { icon: '🛡️', title: 'Гарантия качества',  text: 'На все товары официальная гарантия от 1 до 5 лет.' },
          { icon: '📦', title: 'Быстрая сборка',      text: 'Инструкция в комплекте. Собирается за 30–60 минут.' },
          { icon: '💚', title: 'Экологичность',       text: 'Только сертифицированные материалы, безопасные для здоровья.' },
        ].map(i => `
          <div class="info-card animate-on-scroll">
            <div class="info-card-icon" style="font-size:24px">${i.icon}</div>
            <h3>${i.title}</h3>
            <p>${i.text}</p>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- ОТЗЫВЫ -->
  <section class="section">
    <div class="container">
      <div class="section-header animate-on-scroll">
        <div class="section-label">Отзывы</div>
        <h2 class="section-title">Что говорят покупатели</h2>
      </div>
      <div class="reviews-grid">
        ${[
          { name: 'Анна К.',     date: '15 мая 2024',      stars: 5, text: 'Заказала качели «Лесная Сказка» — просто восторг! Сборка заняла 25 минут, всё понятно. Дети от счастья прыгают.',     product: 'Качели «Лесная Сказка»' },
          { name: 'Дмитрий В.',  date: '2 апреля 2024',    stars: 5, text: 'Взял комплект «Загородный» для дачи. Качество выше всяких похвал. Тиковое дерево — это навсегда!',                    product: 'Комплект «Загородный»' },
          { name: 'Марина Л.',   date: '20 марта 2024',    stars: 4, text: 'Шезлонги «Ривьера» стоят у нас уже третий сезон. Пережили всё: дожди, холода. Рекомендую.',                            product: 'Шезлонг «Ривьера»' },
        ].map(r => `
          <div class="review-card animate-on-scroll">
            <div class="review-header">
              <div class="review-avatar">${r.name[0]}</div>
              <div>
                <div class="review-name">${r.name}</div>
                <div class="review-date">${r.date}</div>
              </div>
              <div class="review-stars" style="margin-left:auto">${'★'.repeat(r.stars)}</div>
            </div>
            <p class="review-text">${r.text}</p>
            <div class="review-product">Товар: ${r.product}</div>
          </div>`).join('')}
      </div>
      <div style="text-align:center;margin-top:32px">
        <button class="btn btn-ghost" onclick="showPage('reviews')">Все отзывы</button>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="section-sm" style="background:var(--green);color:white">
    <div class="container" style="text-align:center">
      <h2 style="color:white;margin-bottom:12px">Нужна помощь с выбором?</h2>
      <p style="color:rgba(255,255,255,.8);margin-bottom:24px;font-size:16px">Позвоните нам или оставьте заявку — мы подберём идеальный вариант для вашего участка</p>
      <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
        <button class="btn" style="background:white;color:var(--green)" onclick="showPage('contacts')">Оставить заявку</button>
        <button class="btn" style="background:transparent;color:white;border:2px solid rgba(255,255,255,.5)"
          onclick="window.location.href='tel:+78005550101'">Позвонить</button>
      </div>
    </div>
  </section>`;
}

/* ─── КАТАЛОГ ────────────────────────────────── */
function renderCatalog() {
  const cat      = currentCategory;
  const filtered = cat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === cat);
  return `
  <div class="page-hero">
    <div class="container">
      <h1>Каталог товаров</h1>
      <p>Вся садовая мебель «Дачный Дом» — ${PRODUCTS.length} позиций</p>
    </div>
  </div>
  <section class="section" style="padding-top:40px">
    <div class="container">
      <div class="category-filter" id="categoryFilter">
        ${CATEGORIES.map(c =>
          `<button class="filter-btn${c.id === cat ? ' active' : ''}"
            onclick="currentCategory='${c.id}';showPage('catalog')">${c.name}</button>`
        ).join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
        <p style="color:var(--text-muted);font-size:14px">Найдено: <strong>${filtered.length}</strong> товаров</p>
        <select class="form-select" style="width:auto;padding:8px 32px 8px 12px;font-size:13px"
          onchange="sortProducts(this.value)" id="sortSelect">
          <option value="default">По умолчанию</option>
          <option value="price_asc">Цена: по возрастанию</option>
          <option value="price_desc">Цена: по убыванию</option>
          <option value="rating">По рейтингу</option>
        </select>
      </div>
      ${filtered.length > 0
        ? `<div class="products-grid" id="productsGrid">${filtered.map(renderProductCard).join('')}</div>`
        : `<div class="empty-state">
             <div class="empty-state-icon">🔍</div>
             <h3>Ничего не найдено</h3>
             <p>В этой категории пока нет товаров</p>
             <button class="btn btn-primary" onclick="currentCategory='all';showPage('catalog')">Показать все</button>
           </div>`
      }
    </div>
  </section>`;
}

function sortProducts(val) {
  const cat = currentCategory;
  let arr   = cat === 'all' ? [...PRODUCTS] : PRODUCTS.filter(p => p.category === cat);
  if (val === 'price_asc')  arr.sort((a, b) => a.price - b.price);
  if (val === 'price_desc') arr.sort((a, b) => b.price - a.price);
  if (val === 'rating')     arr.sort((a, b) => b.rating - a.rating);
  const grid = document.getElementById('productsGrid');
  if (grid) grid.innerHTML = arr.map(renderProductCard).join('');
}

/* ─── КАТЕГОРИИ ──────────────────────────────── */
function renderCategories() {
  const catImages = {
    swings:  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70',
    gazebos: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=70',
    loungers:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70',
    sets:    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=70',
    tables:  'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&q=70',
    chairs:  'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=70',
    terrace: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400&q=70',
    storage: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=400&q=70',
  };
  return `
  <div class="page-hero">
    <div class="container">
      <h1>Категории товаров</h1>
      <p>Выберите категорию садовой мебели</p>
    </div>
  </div>
  <section class="section" style="padding-top:40px">
    <div class="container">
      <div class="categories-grid">
        ${CATEGORIES.filter(c => c.id !== 'all').map(cat => {
          const count = PRODUCTS.filter(p => p.category === cat.id).length;
          return `<button class="category-card" onclick="filterAndShow('${cat.id}')" style="border:none;cursor:pointer;text-align:left">
            <img class="category-card-img" src="${catImages[cat.id] || ''}" alt="${cat.name}" loading="lazy">
            <div class="category-card-body">
              <div class="category-card-name">${cat.name}</div>
              <div class="category-card-count">${count} товаров</div>
            </div>
          </button>`;
        }).join('')}
      </div>
    </div>
  </section>`;
}

/* ─── КОРЗИНА ────────────────────────────────── */
function renderCart() {
  const items       = Cart.getAll();
  const total       = Cart.total();
  const deliveryFree = total >= CONFIG.freeDeliveryFrom;
  return `
  <div class="page-hero">
    <div class="container">
      <h1>Корзина</h1>
      <p>${items.length > 0
        ? `${items.length} ${items.length === 1 ? 'товар' : items.length < 5 ? 'товара' : 'товаров'}`
        : 'Ваша корзина пуста'}</p>
    </div>
  </div>
  <section class="section" style="padding-top:40px">
    <div class="container">
      ${items.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <h3>Корзина пуста</h3>
          <p>Добавьте товары из каталога</p>
          <button class="btn btn-primary" onclick="showPage('catalog')">Перейти в каталог</button>
        </div>` : `
        <div style="display:grid;grid-template-columns:1fr;gap:40px;align-items:start">
          <div>
            <div id="cartItems">
              ${items.map(item => `
                <div class="cart-item" id="cartItem-${item.id}">
                  <img class="cart-item-img" src="${item.image}" alt="${item.name}" loading="lazy">
                  <div>
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${Format.price(item.price)} за шт.</div>
                    <div class="qty-control">
                      <button class="qty-btn" onclick="Cart.setQty(${item.id},${item.qty - 1});refreshCart()" aria-label="Меньше">−</button>
                      <span class="qty-num">${item.qty}</span>
                      <button class="qty-btn" onclick="Cart.setQty(${item.id},${item.qty + 1});refreshCart()" aria-label="Больше">+</button>
                      <button class="btn-remove" onclick="Cart.remove(${item.id});refreshCart()" aria-label="Удалить">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div class="cart-item-total">${Format.price(item.price * item.qty)}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-ghost btn-sm" onclick="Cart.clear();showPage('cart')" style="margin-top:16px">
              Очистить корзину
            </button>
          </div>
          <div class="order-summary" id="orderSummary">
            <h3 style="font-size:1.1rem;margin-bottom:20px">Итого</h3>
            <div class="summary-row">
              <span>Товары (${Cart.count()} шт.)</span>
              <span>${Format.price(total)}</span>
            </div>
            <div class="summary-row">
              <span>Доставка</span>
              <span style="color:${deliveryFree ? 'var(--green)' : 'inherit'}">
                ${deliveryFree ? 'Бесплатно' : Format.price(CONFIG.deliveryPrice)}
              </span>
            </div>
            ${!deliveryFree
              ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">
                   До бесплатной доставки: ${Format.price(CONFIG.freeDeliveryFrom - total)}
                 </div>`
              : ''}
            <div class="summary-row total">
              <span>К оплате</span>
              <span>${Format.price(total + (deliveryFree ? 0 : CONFIG.deliveryPrice))}</span>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:16px" onclick="showPage('checkout')">
              Оформить заказ
            </button>
            <button class="btn btn-ghost" style="width:100%;margin-top:10px" onclick="showPage('catalog')">
              Продолжить покупки
            </button>
          </div>
        </div>`}
    </div>
  </section>`;
}

function refreshCart() {
  const container = document.getElementById('pageContainer');
  const scrollY   = window.scrollY;
  container.innerHTML = renderCart();
  window.scrollTo(0, scrollY);
}

/* ─── ОФОРМЛЕНИЕ ЗАКАЗА ──────────────────────── */
function renderCheckout() {
  const items = Cart.getAll();
  if (items.length === 0) { showPage('cart'); return ''; }
  const total = Cart.total();
  return `
  <div class="page-hero">
    <div class="container">
      <h1>Оформление заказа</h1>
    </div>
  </div>
  <section class="section" style="padding-top:40px">
    <div class="container">
      <div class="checkout-steps" style="margin-bottom:40px">
        <div class="checkout-step active"><span class="step-num">1</span>Контакты</div>
        <div class="checkout-step"><span class="step-num">2</span>Доставка</div>
        <div class="checkout-step"><span class="step-num">3</span>Подтверждение</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:40px;align-items:start">
        <form id="checkoutForm" onsubmit="submitOrder(event)">
          <div style="background:var(--white);border-radius:var(--radius-lg);border:1px solid var(--border);padding:28px;margin-bottom:20px">
            <h3 style="margin-bottom:20px;font-size:1rem">Контактные данные</h3>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Имя *</label>
                <input class="form-input" type="text" name="name" placeholder="Иван Иванов" required>
              </div>
              <div class="form-group">
                <label class="form-label">Телефон *</label>
                <input class="form-input" type="tel" name="phone" placeholder="+7 (___) ___-__-__" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-input" type="email" name="email" placeholder="mail@example.ru">
            </div>
          </div>
          <div style="background:var(--white);border-radius:var(--radius-lg);border:1px solid var(--border);padding:28px;margin-bottom:20px">
            <h3 style="margin-bottom:20px;font-size:1rem">Доставка</h3>
            <div class="radio-group" id="deliveryGroup">
              <label class="radio-card selected" onclick="selectRadio(this,'deliveryGroup','courier')">
                <input type="radio" name="delivery" value="courier" checked>
                <div>
                  <div class="radio-card-label">Курьером</div>
                  <div class="radio-card-sub">${total >= CONFIG.freeDeliveryFrom ? 'Бесплатно' : Format.price(CONFIG.deliveryPrice)} · 1–3 рабочих дня</div>
                </div>
              </label>
              <label class="radio-card" onclick="selectRadio(this,'deliveryGroup','pickup')">
                <input type="radio" name="delivery" value="pickup">
                <div>
                  <div class="radio-card-label">Самовывоз</div>
                  <div class="radio-card-sub">Бесплатно · ${CONFIG.shopAddress}</div>
                </div>
              </label>
              <label class="radio-card" onclick="selectRadio(this,'deliveryGroup','sdek')">
                <input type="radio" name="delivery" value="sdek">
                <div>
                  <div class="radio-card-label">СДЭК</div>
                  <div class="radio-card-sub">От 490 ₽ · 2–5 рабочих дней</div>
                </div>
              </label>
            </div>
            <div class="form-group" style="margin-top:16px">
              <label class="form-label">Адрес доставки</label>
              <input class="form-input" type="text" name="address" placeholder="Город, улица, дом, квартира">
            </div>
            <div class="form-group">
              <label class="form-label">Комментарий к заказу</label>
              <textarea class="form-textarea" name="comment" placeholder="Пожелания, время доставки..." style="min-height:80px"></textarea>
            </div>
          </div>
          <div style="background:var(--white);border-radius:var(--radius-lg);border:1px solid var(--border);padding:28px">
            <h3 style="margin-bottom:20px;font-size:1rem">Способ оплаты</h3>
            <div class="radio-group" id="paymentGroup">
              <label class="radio-card" onclick="selectRadio(this,'paymentGroup','cash')">
                <input type="radio" name="payment" value="cash">
                <div>
                  <div class="radio-card-label">При получении</div>
                  <div class="radio-card-sub">Наличными или картой курьеру</div>
                </div>
              </label>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:24px" id="submitBtn">
            Подтвердить заказ
          </button>
          <p style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:12px">
            Нажимая «Подтвердить», вы соглашаетесь с
            <a href="#" onclick="showPage('privacy');return false" style="color:var(--green)">политикой конфиденциальности</a>
          </p>
        </form>
        <div class="order-summary">
          <h3 style="font-size:1rem;margin-bottom:16px">Ваш заказ</h3>
          ${items.map(i => `
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;font-size:14px">
              <img src="${i.image}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0" alt="${i.name}">
              <div style="flex:1">
                <div style="font-weight:500;line-height:1.3">${i.name}</div>
                <div style="color:var(--text-muted)">${i.qty} × ${Format.price(i.price)}</div>
              </div>
            </div>`).join('')}
          <div class="summary-row"><span>Товары</span><span>${Format.price(total)}</span></div>
          <div class="summary-row">
            <span>Доставка</span>
            <span id="deliveryCostDisplay">${total >= CONFIG.freeDeliveryFrom ? 'Бесплатно' : Format.price(CONFIG.deliveryPrice)}</span>
          </div>
          <div class="summary-row total">
            <span>Итого</span>
            <span id="orderTotal">${Format.price(total + (total >= CONFIG.freeDeliveryFrom ? 0 : CONFIG.deliveryPrice))}</span>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function selectRadio(label, groupId) {
  document.querySelectorAll(`#${groupId} .radio-card`).forEach(l => l.classList.remove('selected'));
  label.classList.add('selected');
}

async function submitOrder(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = document.getElementById('submitBtn');
  btn.textContent = 'Обрабатываем...';
  btn.disabled    = true;

  const formData = {
    name:     form.name.value,
    phone:    form.phone.value,
    email:    form.email.value,
    address:  form.address?.value || '',
    comment:  form.comment?.value || '',
    delivery: form.delivery.value,
    payment:  form.payment.value,
  };

  const order = Orders.createOrderObject(formData, Cart.getAll());
  await Leads.send({
    ...formData,
    orderId: order.id,
    total: order.total,
    items: order.items
  });

  if (formData.payment === 'online') {
    await Payment.createPayment(order);
  } else {
    Cart.clear();
    Orders.saveOrder({ ...order, status: 'pending' });
    showSuccessPage(order);
  }
}

function showSuccessPage(order) {
  document.getElementById('pageContainer').innerHTML = `
    <section class="section">
      <div class="container" style="max-width:560px;text-align:center">
        <div style="font-size:72px;margin-bottom:24px">🎉</div>
        <h1 style="font-size:2rem;margin-bottom:12px">Заказ оформлен!</h1>
        <p style="color:var(--text-muted);font-size:16px;margin-bottom:8px">Номер заказа: <strong>${order.id}</strong></p>
        <p style="color:var(--text-muted);margin-bottom:32px">Мы свяжемся с вами в течение 1–2 часов для подтверждения заказа.</p>
        <button class="btn btn-primary btn-lg" onclick="showPage('home')">На главную</button>
      </div>
    </section>`;
  window.scrollTo(0, 0);
}

/* ─── КОНТАКТЫ ───────────────────────────────── */
function renderContacts() {
  return `
  <div class="page-hero">
    <div class="container">
      <h1>Контакты</h1>
      <p>Мы всегда рады помочь вам</p>
    </div>
  </div>
  <section class="section" style="padding-top:40px">
    <div class="container">
      <div class="contacts-grid">
        <div class="contact-info">
          ${[
            { icon: '📞', label: 'Телефон',       value: CONFIG.shopPhone },
            { icon: '📧', label: 'Email',          value: CONFIG.shopEmail },
            { icon: '📍', label: 'Адрес',          value: CONFIG.shopAddress },
            { icon: '🕐', label: 'Режим работы',   value: CONFIG.shopWorkHours },
          ].map(c => `
            <div class="contact-item">
              <div class="contact-item-icon" style="font-size:20px">${c.icon}</div>
              <div>
                <div class="contact-item-label">${c.label}</div>
                <div class="contact-item-value">${c.value}</div>
              </div>
            </div>`).join('')}
        </div>
        <div class="contact-form-wrap">
          <h3 style="margin-bottom:20px">Оставить заявку</h3>
          <form id="contactForm" onsubmit="submitContact(event)">
            <div class="form-group">
              <label class="form-label">Ваше имя *</label>
              <input class="form-input" type="text" name="name" placeholder="Иван" required>
            </div>
            <div class="form-group">
              <label class="form-label">Телефон *</label>
              <input class="form-input" type="tel" name="phone" placeholder="+7 (___) ___-__-__" required>
            </div>
            <div class="form-group">
              <label class="form-label">Комментарий</label>
              <textarea class="form-textarea" name="comment" placeholder="Чем мы можем помочь?"></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%" id="contactBtn">
              Отправить заявку
            </button>
          </form>
        </div>
      </div>
    </div>
  </section>`;
}

async function submitContact(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = document.getElementById('contactBtn');
  btn.textContent = 'Отправляем...';
  btn.disabled    = true;
  await Leads.send({ name: form.name.value, phone: form.phone.value, comment: form.comment.value });
  Toast.show('Заявка отправлена! Мы свяжемся с вами 🌿', 'success', 4000);
  form.reset();
  btn.textContent = 'Отправить заявку';
  btn.disabled    = false;
}

/* ─── ОТЗЫВЫ ─────────────────────────────────── */
function renderReviews() {
  const reviews = [
    { name: 'Анна К.',    date: '15 мая 2024',      stars: 5, text: 'Заказала качели «Лесная Сказка» — просто восторг! Сборка заняла 25 минут. Дети от счастья прыгают. Отдельный плюс — очень быстрая доставка, получила уже через 2 дня.', product: 'Качели «Лесная Сказка»' },
    { name: 'Дмитрий В.', date: '2 апреля 2024',    stars: 5, text: 'Взял комплект «Загородный» для дачи. Качество выше всяких похвал. Тиковое дерево — это навсегда! Уже второй сезон стоит под открытым небом — ни трещины.',             product: 'Комплект «Загородный»' },
    { name: 'Марина Л.',  date: '20 марта 2024',    stars: 4, text: 'Шезлонги «Ривьера» стоят у нас уже третий сезон. Пережили всё: дожди, холода, жару. Рекомендую. Единственный минус — инструкция на маленьком шрифте.',              product: 'Шезлонг «Ривьера»' },
    { name: 'Сергей П.',  date: '10 февраля 2024',  stars: 5, text: 'Беседка «Дубрава» — мечта. Установили с другом за 4 часа. Соседи завидуют. Качество сборки, обработка дерева — всё на высшем уровне.',                              product: 'Беседка «Дубрава»' },
    { name: 'Ольга Н.',   date: '28 января 2024',   stars: 5, text: 'Очень рада покупке кресел «Ротанг». Стоят на веранде, смотрятся изящно. Плести не расплетается, подушки мягкие. Брала 4 штуки — довольна!',                           product: 'Кресло «Ротанг»' },
    { name: 'Алексей М.', date: '15 января 2024',   stars: 4, text: 'Садовый ящик «Ларец» — практичная вещь. Всё лопаты и инвентарь теперь в порядке. Сидеть как на скамейке можно спокойно.',                                             product: 'Ящик садовый «Ларец»' },
  ];
  return `
  <div class="page-hero">
    <div class="container">
      <h1>Отзывы покупателей</h1>
      <p>${reviews.length} отзывов · Средняя оценка 4.8 ★</p>
    </div>
  </div>
  <section class="section" style="padding-top:40px">
    <div class="container">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:36px;flex-wrap:wrap;gap:16px">
        <div style="display:flex;gap:16px">
          <div style="text-align:center;background:var(--white);border-radius:var(--radius-lg);border:1px solid var(--border);padding:20px 28px">
            <div style="font-family:var(--font-heading);font-size:2.5rem;font-weight:800;color:var(--green)">4.8</div>
            <div style="color:#f09840;font-size:18px;margin:4px 0">★★★★★</div>
            <div style="font-size:13px;color:var(--text-muted)">Средняя оценка</div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="Modal.open('reviewModal')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Написать отзыв
        </button>
      </div>
      <div class="reviews-grid">
        ${reviews.map(r => `
          <div class="review-card animate-on-scroll">
            <div class="review-header">
              <div class="review-avatar">${r.name[0]}</div>
              <div>
                <div class="review-name">${r.name}</div>
                <div class="review-date">${r.date}</div>
              </div>
              <div class="review-stars" style="margin-left:auto">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
            </div>
            <p class="review-text">${r.text}</p>
            <div class="review-product">Товар: ${r.product}</div>
          </div>`).join('')}
      </div>
    </div>
  </section>
  <div class="modal" id="reviewModal">
    <div class="modal-overlay"></div>
    <div class="modal-box">
      <button class="modal-close" onclick="Modal.close('reviewModal')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <h3 style="margin-bottom:20px">Написать отзыв</h3>
      <form onsubmit="submitReview(event)">
        <div class="form-group">
          <label class="form-label">Ваше имя *</label>
          <input class="form-input" type="text" name="name" required placeholder="Иван">
        </div>
        <div class="form-group">
          <label class="form-label">Оценка</label>
          <div style="display:flex;gap:8px" id="starRating">
            ${[1,2,3,4,5].map(s =>
              `<button type="button" onclick="setRating(${s})"
                style="font-size:28px;color:#ddd;transition:color .2s" data-star="${s}">★</button>`
            ).join('')}
          </div>
          <input type="hidden" name="rating" id="ratingInput" value="5">
        </div>
        <div class="form-group">
          <label class="form-label">Отзыв *</label>
          <textarea class="form-textarea" name="text" required placeholder="Поделитесь впечатлениями о покупке..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Отправить отзыв</button>
      </form>
    </div>
  </div>`;
}

function setRating(n) {
  document.querySelectorAll('#starRating button').forEach((btn, i) => {
    btn.style.color = i < n ? '#f09840' : '#ddd';
  });
  document.getElementById('ratingInput').value = n;
}

async function submitReview(e) {
  e.preventDefault();
  await Leads.send({ name: e.target.name.value, comment: e.target.text.value, rating: e.target.rating.value, type: 'review' });
  Toast.show('Отзыв отправлен! Спасибо 🌿', 'success', 4000);
  Modal.close('reviewModal');
  e.target.reset();
}

/* ─── ДОСТАВКА ───────────────────────────────── */
function renderDelivery() {
  return `
  <div class="page-hero">
    <div class="container">
      <h1>Доставка и оплата</h1>
      <p>Быстрая доставка по всей России</p>
    </div>
  </div>
  <section class="section" style="padding-top:40px">
    <div class="container">
      <div class="section-header animate-on-scroll">
        <div class="section-label">Доставка</div>
        <h2 class="section-title">Способы доставки</h2>
      </div>
      <div class="info-cards" style="margin-bottom:60px">
        ${[
          { icon: '🚚', title: 'Курьером до двери',        text: `Доставка курьером по Москве и МО. Стоимость ${Format.price(CONFIG.deliveryPrice)}. При заказе от ${Format.price(CONFIG.freeDeliveryFrom)} — бесплатно. Срок: 1–3 рабочих дня.` },
          { icon: '📦', title: 'СДЭК',                     text: 'Доставка в более чем 2000 городов России. Срок: 2–7 рабочих дней. Стоимость рассчитывается при оформлении.' },
          { icon: '🏪', title: 'Самовывоз',                text: `Бесплатно. Адрес: ${CONFIG.shopAddress}. Режим работы: ${CONFIG.shopWorkHours}. Необходимо предварительно позвонить.` },
          { icon: '🚛', title: 'Транспортная компания',    text: 'Для крупногабаритных товаров (беседки, хозблоки). Стоимость по согласованию. Доставка по всей России.' },
        ].map(c => `
          <div class="info-card animate-on-scroll">
            <div class="info-card-icon" style="font-size:24px">${c.icon}</div>
            <h3>${c.title}</h3>
            <p>${c.text}</p>
          </div>`).join('')}
      </div>
      <div class="section-header animate-on-scroll">
        <div class="section-label">Оплата</div>
        <h2 class="section-title">Способы оплаты</h2>
      </div>
      <div class="info-cards">
        ${[
          { icon: '💳', title: 'Онлайн картой',    text: 'Visa, Mastercard, МИР через защищённый шлюз ЮКасса. Оплата занимает 1 минуту.' },
          { icon: '💚', title: 'ЮMoney / СБП',     text: 'Оплата через Систему быстрых платежей или кошелёк ЮMoney. Мгновенное зачисление.' },
          { icon: '💵', title: 'При получении',    text: 'Наличными или картой курьеру при доставке. Предоплата не требуется.' },
          { icon: '🏦', title: 'Для юрлиц',        text: 'Безналичный расчёт по счёту. Предоставляем все закрывающие документы, НДС.' },
        ].map(c => `
          <div class="info-card animate-on-scroll">
            <div class="info-card-icon" style="font-size:24px">${c.icon}</div>
            <h3>${c.title}</h3>
            <p>${c.text}</p>
          </div>`).join('')}
      </div>
    </div>
  </section>`;
}

/* ─── ИЗБРАННОЕ ──────────────────────────────── */
function renderFavorites() {
  const ids         = Favorites.getAll();
  const favProducts = PRODUCTS.filter(p => ids.includes(p.id));
  return `
  <div class="page-hero">
    <div class="container">
      <h1>Избранное</h1>
      <p>${favProducts.length > 0
        ? `${favProducts.length} ${favProducts.length === 1 ? 'товар' : favProducts.length < 5 ? 'товара' : 'товаров'}`
        : 'Список пуст'}</p>
    </div>
  </div>
  <section class="section" style="padding-top:40px">
    <div class="container">
      ${favProducts.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">❤️</div>
          <h3>Избранное пусто</h3>
          <p>Добавляйте товары в избранное, нажимая на иконку сердечка</p>
          <button class="btn btn-primary" onclick="showPage('catalog')">Перейти в каталог</button>
        </div>` : `
        <div class="products-grid">${favProducts.map(renderProductCard).join('')}</div>`}
    </div>
  </section>`;
}

/* ─── КОНФИДЕНЦИАЛЬНОСТЬ ─────────────────────── */
function renderPrivacy() {
  return `
  <div class="page-hero">
    <div class="container">
      <h1>Политика конфиденциальности</h1>
      <p>Последнее обновление: 1 января 2024</p>
    </div>
  </div>
  <section class="section" style="padding-top:40px">
    <div class="container">
      <div class="prose">
        <h2>1. Общие положения</h2>
        <p>Настоящая Политика конфиденциальности регулирует порядок обработки и использования персональных и иных данных пользователей интернет-магазина «Дачный Дом».</p>
        <h2>2. Сбор данных</h2>
        <p>Мы собираем следующие данные, которые вы предоставляете нам добровольно при оформлении заказа:</p>
        <ul>
          <li>Имя и контактный телефон</li>
          <li>Адрес электронной почты</li>
          <li>Адрес доставки</li>
          <li>Данные платёжных транзакций (обрабатываются ЮКасса)</li>
        </ul>
        <h2>3. Использование данных</h2>
        <p>Собранные данные используются исключительно для:</p>
        <ul>
          <li>Оформления и доставки заказов</li>
          <li>Информирования о статусе заказа</li>
          <li>Улучшения качества обслуживания</li>
        </ul>
        <h2>4. Хранение данных</h2>
        <p>Персональные данные хранятся на защищённых серверах и не передаются третьим лицам, за исключением случаев, необходимых для исполнения заказа.</p>
        <h2>5. Cookies</h2>
        <p>Сайт использует файлы cookie для улучшения пользовательского опыта. Данные о корзине и избранном хранятся в localStorage вашего браузера.</p>
        <h2>6. Контакты</h2>
        <p>По вопросам, связанным с обработкой персональных данных, обращайтесь:
          <a href="mailto:${CONFIG.shopEmail}">${CONFIG.shopEmail}</a>
        </p>
      </div>
    </div>
  </section>`;
}

/* ─── ИНИЦИАЛИЗАЦИЯ СКРИПТОВ СТРАНИЦ ─────────── */
function initPageScripts(page) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  if (page === 'reviews') setRating(5);
}

/* ─── ИНИЦИАЛИЗАЦИЯ ──────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Данные магазина в футер
  const ph  = document.getElementById('footerPhone');
  const pe  = document.getElementById('footerEmail');
  const ph2 = document.getElementById('footerHours');
  if (ph)  ph.textContent  = CONFIG.shopPhone;
  if (pe)  pe.textContent  = CONFIG.shopEmail;
  if (ph2) ph2.textContent = CONFIG.shopWorkHours;

  // Бейджи
  Cart.updateBadge();
  Favorites.updateBadge();

  // Навигация по hash
  const hash       = location.hash.slice(1) || 'home';
  const validPages = ['home','catalog','categories','cart','checkout','contacts','reviews','delivery','favorites','privacy'];
  showPage(validPages.includes(hash) ? hash : 'home');

  // Мобильное меню
  document.getElementById('menuToggle').addEventListener('click', () => {
    const menu = document.getElementById('navMenu');
    const btn  = document.getElementById('menuToggle');
    menu.classList.toggle('nav-open');
    btn.classList.toggle('is-open');
    document.body.style.overflow = menu.classList.contains('nav-open') ? 'hidden' : '';
  });

  // Скролл навбара
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
  });

  // События корзины / избранного
  document.addEventListener('cartUpdated', () => {
    Cart.updateBadge();
    if (currentPage === 'cart') refreshCart();
  });
  document.addEventListener('favoritesUpdated', () => {
    Favorites.updateBadge();
  });

  // Escape для модалей
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-open').forEach(m => Modal.close(m.id));
    }
  });

  // Навигация браузером
  window.addEventListener('popstate', e => {
    if (e.state?.page) showPage(e.state.page, e.state.data || {});
  });
});
