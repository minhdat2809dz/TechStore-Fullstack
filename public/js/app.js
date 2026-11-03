/**
 * app.js - Logic giao diện người dùng Khách hàng (Storefront)
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let state = {
  products: [],
  categories: [],
  activeCategory: 'all',
  activeBrand: '',
  searchQuery: '',
  priceRange: '',
  sortOrder: 'default',
  currentProductDetail: null,
  selectedColor: '',
  selectedStorage: '',
  selectedPrice: 0,
  detailQty: 1
};

async function initApp() {
  store.updateCartBadge();
  store.updateWishlistBadges();
  store.updateUserUI();

  setupEventListeners();
  startFlashSaleCountdown();

  // Kiểm tra sức khỏe kết nối DB (SQL Server & MongoDB)
  await checkDatabaseHealth();
  // Polling nhẹ mỗi 15 giây để update badge trạng thái DB
  setInterval(checkDatabaseHealth, 15000);

  // Tải danh mục và sản phẩm
  await loadCategories();
  await loadProducts();
}

// 1. Kiểm tra trạng thái Database
async function checkDatabaseHealth() {
  try {
    const health = await api.getDbHealth();
    renderDatabaseStatusBadge(health);
  } catch (err) {
    renderDatabaseStatusBadge(null);
  }
}

function renderDatabaseStatusBadge(health) {
  const badgeContainer = document.getElementById('db-status-container');
  if (!badgeContainer) return;

  if (!health) {
    badgeContainer.innerHTML = `
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 text-xs font-bold border border-rose-500/20">
        <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
        <span>Mất kết nối Backend</span>
      </div>
    `;
    return;
  }

  const isSqlOk = health.sqlServer?.status === 'Connected';
  const isMongoOk = health.mongoDb?.status === 'Connected';
  const mode = health.activeMode || 'dual';

  let modeBadge = '';
  if (mode === 'dual') {
    modeBadge = `<span class="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-xs">Dual Sync</span>`;
  } else if (mode === 'sql') {
    modeBadge = `<span class="bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-xs">Chỉ SQL</span>`;
  } else {
    modeBadge = `<span class="bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-xs">Chỉ MongoDB</span>`;
  }

  badgeContainer.innerHTML = `
    <div class="relative group cursor-pointer">
      <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition border border-slate-700/80">
        <span class="flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            ${isSqlOk ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>' : ''}
            <span class="relative inline-flex rounded-full h-2 w-2 ${isSqlOk ? 'bg-blue-400' : 'bg-red-400'}"></span>
          </span>
          <span class="hidden sm:inline font-mono text-[11px]">SQL: ${health.sqlServer.instance || 'SQLEXPRESS2025'}</span>
        </span>
        <span class="text-slate-600">|</span>
        <span class="flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            ${isMongoOk ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>' : ''}
            <span class="relative inline-flex rounded-full h-2 w-2 ${isMongoOk ? 'bg-emerald-400' : 'bg-red-400'}"></span>
          </span>
          <span class="hidden sm:inline font-mono text-[11px]">MongoDB</span>
        </span>
        ${modeBadge}
        <i class="fas fa-chevron-down text-[9px] text-slate-400 ml-0.5"></i>
      </div>

      <!-- Dropdown chuyển nhanh Database Engine -->
      <div class="absolute right-0 top-full mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-4 hidden group-hover:block z-50 text-slate-800">
        <div class="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5 px-1">
          <span>Trạng Thái CSDL</span>
          <span class="text-indigo-600 font-bold lowercase">thời gian thực</span>
        </div>
        <div class="space-y-1.5 text-xs">
          <button onclick="handleSwitchDbMode('dual')" class="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition ${mode === 'dual' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'hover:bg-slate-50 text-slate-700'}">
            <span class="flex items-center gap-2">
              <span>⚡</span>
              <span>Đồng bộ song song (Dual Sync)</span>
            </span>
            ${mode === 'dual' ? '<i class="fas fa-check-circle text-indigo-600"></i>' : ''}
          </button>
          <button onclick="handleSwitchDbMode('sql')" class="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition ${mode === 'sql' ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200' : 'hover:bg-slate-50 text-slate-700'}">
            <span class="flex items-center gap-2">
              <span>🗄️</span>
              <span>Chỉ SQL Server (SQLEXPRESS2025)</span>
            </span>
            ${mode === 'sql' ? '<i class="fas fa-check-circle text-blue-600"></i>' : ''}
          </button>
          <button onclick="handleSwitchDbMode('mongo')" class="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition ${mode === 'mongo' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'hover:bg-slate-50 text-slate-700'}">
            <span class="flex items-center gap-2">
              <span>🍃</span>
              <span>Chỉ MongoDB (TechStoreDB)</span>
            </span>
            ${mode === 'mongo' ? '<i class="fas fa-check-circle text-emerald-600"></i>' : ''}
          </button>
        </div>
        <div class="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold text-slate-500 flex justify-between px-1">
          <span class="flex items-center gap-1"><i class="fas fa-signal text-blue-500"></i> SQL: ${health.sqlServer?.pingMs || 0}ms</span>
          <span class="flex items-center gap-1"><i class="fas fa-signal text-emerald-500"></i> Mongo: ${health.mongoDb?.pingMs || 0}ms</span>
        </div>
      </div>
    </div>
  `;
}

async function handleSwitchDbMode(mode) {
  try {
    const res = await api.switchDbMode(mode);
    api.showToast(res.message, 'success');
    await loadProducts();
  } catch (err) {
    api.showToast(`Lỗi chuyển chế độ: ${err.message}`, 'error');
  }
}

// 2. Tải danh mục
async function loadCategories() {
  try {
    const res = await api.getCategories();
    state.categories = res.data || [];
    renderCategories();
  } catch (err) {
    console.error('Lỗi tải danh mục:', err);
  }
}

function getCategoryColor(id) {
  const colors = {
    all: 'bg-indigo-500/10 text-indigo-600',
    phone: 'bg-blue-500/10 text-blue-600',
    laptop: 'bg-purple-500/10 text-purple-600',
    tablet: 'bg-cyan-500/10 text-cyan-600',
    audio: 'bg-rose-500/10 text-rose-600',
    watch: 'bg-amber-500/10 text-amber-600',
    camera: 'bg-emerald-500/10 text-emerald-600',
    smarthome: 'bg-teal-500/10 text-teal-600',
    accessories: 'bg-orange-500/10 text-orange-600'
  };
  return colors[id] || 'bg-slate-100 text-slate-700';
}

function renderCategories() {
  const container = document.getElementById('categories-bar');
  if (!container) return;

  const defaultCategories = [
    { id: 'all', name: 'Tất Cả Sản Phẩm', icon: 'fa-th-large' },
    ...state.categories
  ];

  container.innerHTML = defaultCategories.map(cat => {
    const isActive = state.activeCategory === cat.id;
    const colorClass = getCategoryColor(cat.id);
    return `
      <button 
        onclick="handleSelectCategory('${cat.id}')"
        class="cat-pill flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
          isActive 
            ? 'active shadow-md' 
            : 'bg-white text-slate-700 hover:text-indigo-600 border border-slate-200/80 shadow-xs'
        }"
      >
        <span class="w-6 h-6 rounded-lg ${isActive ? 'bg-white/20 text-white' : colorClass} flex items-center justify-center text-xs">
          <i class="fas ${cat.icon || 'fa-tag'}"></i>
        </span>
        <span>${cat.name}</span>
      </button>
    `;
  }).join('');
}

function handleSelectCategory(catId) {
  state.activeCategory = catId;
  renderCategories();
  loadProducts();
}

function handleQuickSearch(keyword) {
  const input = document.getElementById('search-input');
  if (input) input.value = keyword;
  state.searchQuery = keyword;
  loadProducts();
}

// 3. Tải và Lọc Sản phẩm
async function loadProducts() {
  const container = document.getElementById('products-grid');
  const countEl = document.getElementById('products-count');
  const sourceEl = document.getElementById('products-source-badge');

  if (container) {
    container.innerHTML = `
      <div class="col-span-full py-20 text-center text-slate-500 bg-white rounded-3xl border border-slate-100 shadow-xs">
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <i class="fas fa-spinner fa-spin text-xl"></i>
        </div>
        <p class="font-bold text-sm text-slate-700">Đang tải sản phẩm từ Database...</p>
        <p class="text-xs text-slate-400 mt-1">Đồng bộ dữ liệu SQL Server & MongoDB</p>
      </div>
    `;
  }

  try {
    const params = {
      category: state.activeCategory,
      brand: state.activeBrand,
      search: state.searchQuery,
      sort: state.sortOrder
    };

    if (state.priceRange) {
      if (state.priceRange === 'under-10m') params.maxPrice = 10000000;
      else if (state.priceRange === '10m-20m') { params.minPrice = 10000000; params.maxPrice = 20000000; }
      else if (state.priceRange === '20m-30m') { params.minPrice = 20000000; params.maxPrice = 30000000; }
      else if (state.priceRange === 'over-30m') params.minPrice = 30000000;
    }

    const res = await api.getProducts(params);
    state.products = res.data || [];

    if (countEl) countEl.textContent = `${state.products.length} sản phẩm`;
    if (sourceEl && res.source) {
      sourceEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700 text-[11px]"><i class="fas fa-database text-indigo-600 text-[10px]"></i> ${res.source}</span>`;
    }

    renderProducts(state.products);
    renderFlashSale(state.products.filter(p => p.flashSale));
  } catch (err) {
    if (container) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center text-rose-500 bg-rose-50/50 rounded-3xl border border-rose-100">
          <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
          <p class="font-bold text-sm">Lỗi nạp sản phẩm: ${err.message}</p>
        </div>
      `;
    }
  }
}

function renderProducts(products) {
  const container = document.getElementById('products-grid');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <div class="w-16 h-16 mx-auto mb-4 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 text-2xl">
          <i class="fas fa-search"></i>
        </div>
        <h3 class="text-base font-black text-slate-900 mb-1">Không tìm thấy sản phẩm phù hợp</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto mb-5">Hãy thử tìm với từ khóa khác hoặc xóa bớt tiêu chí lọc hiện tại.</p>
        <button onclick="handleResetFilters()" class="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 transition shadow-md shadow-indigo-600/25">
          Xóa tất cả bộ lọc
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(product => {
    const isWishlisted = store.wishlist.includes(product.id);
    const discount = product.oldPrice && product.oldPrice > product.price 
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) 
      : 0;

    // Spec pills to showcase
    const specsList = [];
    if (product.storageOptions && product.storageOptions.length > 0) {
      specsList.push(product.storageOptions[0].name);
    }
    if (product.specs) {
      if (product.specs['Màn hình']) specsList.push(product.specs['Màn hình'].split(' ')[0] || 'OLED');
      if (product.specs['Chipset']) specsList.push(product.specs['Chipset'].split(' ')[0] || 'Chip Pro');
    }

    return `
      <div class="product-card group bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-400 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
        
        <!-- Image & Badges Container -->
        <div class="product-img-wrap p-5 flex items-center justify-center h-56 relative">
          
          <!-- Discount Pill -->
          ${discount > 0 ? `
            <span class="badge-discount absolute top-3 left-3 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              -${discount}%
            </span>
          ` : ''}

          <!-- Badge tag -->
          ${product.badge ? `
            <span class="badge-tag-fire absolute top-3 right-3 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              ${product.badge}
            </span>
          ` : `
            <span class="absolute top-3 right-3 bg-slate-900/5 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Chính Hãng
            </span>
          `}

          <img 
            src="${product.image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600'}" 
            alt="${product.name}" 
            class="max-h-44 object-contain filter drop-shadow-sm group-hover:drop-shadow-md transition-all duration-300"
            onerror="this.src='https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600'"
          />

          <!-- Quick Actions on Hover -->
          <div class="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center gap-2.5">
            <button 
              onclick="openProductDetailModal(${product.id})"
              class="w-10 h-10 rounded-full bg-white text-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center shadow-lg transition-all transform translate-y-3 group-hover:translate-y-0"
              title="Xem nhanh chi tiết"
            >
              <i class="fas fa-eye text-sm"></i>
            </button>
            <button 
              onclick="store.toggleWishlist(${product.id})"
              class="w-10 h-10 rounded-full bg-white text-slate-800 hover:bg-rose-600 hover:text-white flex items-center justify-center shadow-lg transition-all transform translate-y-3 group-hover:translate-y-0"
              title="Thêm vào yêu thích"
            >
              <i class="${isWishlisted ? 'fas fa-heart text-rose-500' : 'far fa-heart'} text-sm"></i>
            </button>
          </div>
        </div>

        <!-- Information Area -->
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-[11px] mb-1.5">
              <span class="font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                ${product.brand || 'CHÍNH HÃNG'}
              </span>
              <span class="flex items-center gap-1 text-amber-500 font-bold">
                <i class="fas fa-star text-[10px]"></i>
                <span class="text-slate-700">${product.rating || 5.0}</span>
                <span class="text-slate-400 font-normal">(${product.reviewsCount || 0})</span>
              </span>
            </div>

            <h4 
              onclick="openProductDetailModal(${product.id})"
              class="font-extrabold text-sm text-slate-800 hover:text-indigo-600 transition cursor-pointer line-clamp-2 mb-2 leading-snug"
              title="${product.name}"
            >
              ${product.name}
            </h4>

            <!-- Specs Chips -->
            ${specsList.length > 0 ? `
              <div class="flex flex-wrap gap-1 mb-2.5">
                ${specsList.slice(0, 2).map(s => `
                  <span class="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    ${s}
                  </span>
                `).join('')}
              </div>
            ` : ''}

            ${product.gift ? `
              <div class="text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-100 px-2.5 py-1 rounded-xl mb-3 flex items-center gap-1.5 line-clamp-1">
                <i class="fas fa-gift text-emerald-500 text-xs"></i>
                <span>${product.gift}</span>
              </div>
            ` : ''}
          </div>

          <div>
            <div class="flex items-baseline gap-2 mb-3.5 pt-1">
              <span class="text-lg font-black text-rose-600">${store.formatVND(product.price)}</span>
              ${product.oldPrice && product.oldPrice > product.price ? `
                <span class="text-xs text-slate-400 line-through font-semibold">${store.formatVND(product.oldPrice)}</span>
              ` : ''}
            </div>

            <button 
              onclick="handleQuickAddToCart(${product.id})"
              class="w-full py-3 px-4 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-black rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-indigo-600/30"
            >
              <i class="fas fa-cart-plus text-xs"></i>
              <span>Thêm Vào Giỏ</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 4. Flash Sale Renderer
function renderFlashSale(products) {
  const container = document.getElementById('flash-sale-grid');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `<div class="col-span-full py-8 text-center text-rose-100 text-xs font-semibold">Hiện chưa có sản phẩm Flash Sale</div>`;
    return;
  }

  container.innerHTML = products.slice(0, 4).map(p => {
    const sold = p.soldCount || 12;
    const progress = Math.min(100, Math.round((sold / (sold + 5)) * 100));

    return `
      <div onclick="openProductDetailModal(${p.id})" class="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 hover:border-white transition-all cursor-pointer shadow-lg hover:shadow-xl flex gap-3.5 items-center group">
        <div class="w-24 h-24 flex-shrink-0 bg-slate-50 rounded-xl p-2 flex items-center justify-center group-hover:scale-105 transition-transform">
          <img src="${p.image}" alt="${p.name}" class="max-h-20 object-contain drop-shadow-sm" />
        </div>
        <div class="flex-1 min-w-0">
          <span class="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            🔥 Giảm Sốc
          </span>
          <h5 class="text-xs font-bold text-slate-800 truncate mt-1.5" title="${p.name}">${p.name}</h5>
          <div class="text-sm font-black text-rose-600 mt-1">${store.formatVND(p.price)}</div>
          
          <!-- Progress Bar with Shimmer -->
          <div class="mt-2.5">
            <div class="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
              <span>Đã bán: <strong class="text-rose-600">${sold}</strong></span>
              <span class="text-rose-600 font-bold">${progress}%</span>
            </div>
            <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
              <div class="bg-gradient-to-r from-amber-500 to-rose-600 h-full rounded-full shimmer-bar" style="width: ${progress}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function startFlashSaleCountdown() {
  const hoursEl = document.getElementById('fs-hours');
  const minutesEl = document.getElementById('fs-minutes');
  const secondsEl = document.getElementById('fs-seconds');

  if (!hoursEl || !minutesEl || !secondsEl) return;

  let totalSeconds = 5 * 3600 + 42 * 60 + 19; // 05:42:19

  setInterval(() => {
    if (totalSeconds <= 0) totalSeconds = 24 * 3600;
    totalSeconds--;

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    hoursEl.textContent = String(h).padStart(2, '0');
    minutesEl.textContent = String(m).padStart(2, '0');
    secondsEl.textContent = String(s).padStart(2, '0');
  }, 1000);
}

// 5. Quick Add to Cart
function handleQuickAddToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const defaultColor = (product.colors && product.colors[0]?.name) || '';
  const defaultStorage = (product.storageOptions && product.storageOptions[0]?.name) || '';

  store.addToCart(product, {
    color: defaultColor,
    storage: defaultStorage,
    qty: 1,
    price: product.price
  });
}

// 6. Product Detail / Quick View Modal
async function openProductDetailModal(productId) {
  const modal = document.getElementById('product-detail-modal');
  const content = document.getElementById('product-detail-content');
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="py-20 text-center text-slate-500">
      <i class="fas fa-spinner fa-spin text-3xl text-indigo-600 mb-2"></i>
      <p class="text-sm font-medium">Đang tải thông tin chi tiết...</p>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  try {
    let product = state.products.find(p => p.id === productId);
    if (!product || !product.specs) {
      const res = await api.getProduct(productId);
      product = res.data;
    }

    state.currentProductDetail = product;
    state.detailQty = 1;
    state.selectedColor = (product.colors && product.colors[0]?.name) || '';
    state.selectedStorage = (product.storageOptions && product.storageOptions[0]?.name) || '';
    state.selectedPrice = (product.storageOptions && product.storageOptions[0]?.price) || product.price;

    renderProductDetailModal(product);
  } catch (err) {
    content.innerHTML = `<div class="p-8 text-center text-rose-500">Lỗi tải chi tiết: ${err.message}</div>`;
  }
}

function renderProductDetailModal(product) {
  const content = document.getElementById('product-detail-content');
  if (!content) return;

  const gallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image];
  const specs = product.specs || {};

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8">
      <!-- Gallery Column -->
      <div>
        <div class="bg-slate-50 rounded-2xl p-6 flex items-center justify-center h-80 border border-slate-100 mb-4">
          <img id="detail-main-img" src="${gallery[0]}" alt="${product.name}" class="max-h-72 object-contain transition-all" />
        </div>
        <div class="flex gap-2 overflow-x-auto pb-2">
          ${gallery.map((img, idx) => `
            <button 
              onclick="document.getElementById('detail-main-img').src='${img}'"
              class="w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 hover:border-indigo-600 flex-shrink-0 flex items-center justify-center"
            >
              <img src="${img}" class="max-h-14 object-contain" />
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Info Column -->
      <div class="flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase mb-1">
            <span>${product.brand || 'CHÍNH HÃNG'}</span>
            <span>•</span>
            <span class="text-slate-500 font-normal">Mã SP: TECH-${product.id}</span>
          </div>

          <h2 class="text-xl sm:text-2xl font-black text-slate-800 mb-3">${product.name}</h2>

          <div class="flex items-center gap-4 mb-4 text-xs">
            <span class="flex items-center gap-1 text-amber-500 font-bold">
              <i class="fas fa-star"></i>
              <span>${product.rating || 5.0}</span>
              <span class="text-slate-400 font-normal">(${product.reviewsCount || 0} đánh giá)</span>
            </span>
            <span class="text-slate-300">|</span>
            <span class="text-emerald-600 font-semibold flex items-center gap-1">
              <i class="fas fa-check-circle"></i>
              <span>${product.stock || 'Sẵn hàng'}</span>
            </span>
          </div>

          <!-- Price Display -->
          <div class="p-4 bg-slate-50 rounded-2xl mb-5 flex items-baseline gap-3 border border-slate-100">
            <span id="detail-price" class="text-2xl font-black text-rose-600">${store.formatVND(state.selectedPrice)}</span>
            ${product.oldPrice ? `
              <span class="text-sm text-slate-400 line-through">${store.formatVND(product.oldPrice)}</span>
            ` : ''}
          </div>

          <!-- Storage Options Picker -->
          ${product.storageOptions && product.storageOptions.length > 0 ? `
            <div class="mb-4">
              <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Chọn phiên bản dung lượng:</label>
              <div class="flex flex-wrap gap-2">
                ${product.storageOptions.map(opt => `
                  <button 
                    onclick="handleSelectDetailStorage('${opt.name}', ${opt.price || product.price})"
                    class="detail-storage-btn px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      state.selectedStorage === opt.name 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }"
                  >
                    ${opt.name}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Color Options Picker -->
          ${product.colors && product.colors.length > 0 ? `
            <div class="mb-5">
              <label class="block text-xs font-bold text-slate-700 uppercase mb-2">
                Màu sắc: <span id="detail-color-name" class="font-normal text-slate-500">${state.selectedColor}</span>
              </label>
              <div class="flex flex-wrap gap-2">
                ${product.colors.map(col => `
                  <button 
                    onclick="handleSelectDetailColor('${col.name}')"
                    class="detail-color-btn px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      state.selectedColor === col.name 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' 
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }"
                  >
                    ${col.name}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Description -->
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">${product.description || 'Sản phẩm chính hãng với bảo hành toàn diện 12 tháng, 1 đổi 1 trong 30 ngày.'}</p>
        </div>

        <!-- Add to Cart Controls -->
        <div class="pt-4 border-t border-slate-100 flex items-center gap-3">
          <div class="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button onclick="handleDetailQtyChange(-1)" class="w-9 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold">-</button>
            <span id="detail-qty-display" class="w-10 text-center font-bold text-sm text-slate-800">1</span>
            <button onclick="handleDetailQtyChange(1)" class="w-9 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold">+</button>
          </div>

          <button 
            onclick="handleAddDetailToCart()"
            class="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
          >
            <i class="fas fa-shopping-bag"></i>
            <span>Thêm Vào Giỏ Hàng</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Technical Specs Table -->
    ${Object.keys(specs).length > 0 ? `
      <div class="border-t border-slate-100 px-6 sm:px-8 py-6 bg-slate-50/50">
        <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <i class="fas fa-microchip text-indigo-600"></i>
          <span>Thông Số Kỹ Thuật Chi Tiết</span>
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
          ${Object.entries(specs).map(([key, val]) => `
            <div class="flex justify-between py-2 border-b border-slate-200/60">
              <span class="text-slate-500 font-medium">${key}</span>
              <span class="text-slate-800 font-semibold text-right">${val}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function handleSelectDetailStorage(name, price) {
  state.selectedStorage = name;
  state.selectedPrice = price;
  const priceEl = document.getElementById('detail-price');
  if (priceEl) priceEl.textContent = store.formatVND(price);

  document.querySelectorAll('.detail-storage-btn').forEach(btn => {
    if (btn.textContent.trim() === name) {
      btn.className = 'detail-storage-btn px-3 py-1.5 rounded-xl text-xs font-bold border transition border-indigo-600 bg-indigo-50 text-indigo-700';
    } else {
      btn.className = 'detail-storage-btn px-3 py-1.5 rounded-xl text-xs font-bold border transition border-slate-200 text-slate-700 hover:border-slate-300';
    }
  });
}

function handleSelectDetailColor(name) {
  state.selectedColor = name;
  const colName = document.getElementById('detail-color-name');
  if (colName) colName.textContent = name;

  document.querySelectorAll('.detail-color-btn').forEach(btn => {
    if (btn.textContent.trim() === name) {
      btn.className = 'detail-color-btn px-3 py-1.5 rounded-xl text-xs font-medium border transition border-indigo-600 bg-indigo-50 text-indigo-700 font-bold';
    } else {
      btn.className = 'detail-color-btn px-3 py-1.5 rounded-xl text-xs font-medium border transition border-slate-200 text-slate-700 hover:border-slate-300';
    }
  });
}

function handleDetailQtyChange(delta) {
  state.detailQty = Math.max(1, state.detailQty + delta);
  const qtyEl = document.getElementById('detail-qty-display');
  if (qtyEl) qtyEl.textContent = state.detailQty;
}

function handleAddDetailToCart() {
  if (!state.currentProductDetail) return;
  store.addToCart(state.currentProductDetail, {
    color: state.selectedColor,
    storage: state.selectedStorage,
    qty: state.detailQty,
    price: state.selectedPrice
  });
  closeModal('product-detail-modal');
}

// 7. Shopping Cart Drawer Logic
function toggleCartDrawer(show = true) {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (!drawer || !backdrop) return;

  if (show) {
    renderCartDrawer();
    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('hidden');
  } else {
    drawer.classList.add('translate-x-full');
    backdrop.classList.add('hidden');
  }
}

function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  const summaryEl = document.getElementById('cart-summary-container');
  if (!container) return;

  const summary = store.getCartSummary();

  if (store.cart.length === 0) {
    container.innerHTML = `
      <div class="py-24 text-center px-4">
        <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          <i class="fas fa-shopping-bag"></i>
        </div>
        <h4 class="font-bold text-slate-800 text-base mb-1">Giỏ hàng của bạn đang trống</h4>
        <p class="text-xs text-slate-500 mb-6">Hãy dạo xem danh mục để chọn những món đồ công nghệ ưng ý nhất!</p>
        <button onclick="toggleCartDrawer(false)" class="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition">
          Mua sắm ngay
        </button>
      </div>
    `;
    if (summaryEl) summaryEl.innerHTML = '';
    return;
  }

  container.innerHTML = store.cart.map(item => `
    <div class="flex gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm relative group">
      <div class="w-20 h-20 bg-slate-50 rounded-lg p-1.5 flex items-center justify-center flex-shrink-0">
        <img src="${item.image}" alt="${item.name}" class="max-h-16 object-contain" />
      </div>

      <div class="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h5 class="text-xs font-bold text-slate-800 truncate" title="${item.name}">${item.name}</h5>
          <div class="text-[11px] text-slate-400 mt-0.5">
            ${item.color ? `<span>Màu: ${item.color}</span>` : ''}
            ${item.storage ? `<span class="ml-1.5">• ${item.storage}</span>` : ''}
          </div>
          <div class="text-xs font-black text-rose-600 mt-1">${store.formatVND(item.price)}</div>
        </div>

        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <button onclick="store.updateCartQty('${item.cartItemId}', -1)" class="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-200">-</button>
            <span class="w-7 text-center text-xs font-bold text-slate-800">${item.qty}</span>
            <button onclick="store.updateCartQty('${item.cartItemId}', 1)" class="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-200">+</button>
          </div>

          <button onclick="store.removeFromCart('${item.cartItemId}')" class="text-slate-400 hover:text-rose-600 text-xs transition">
            <i class="far fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
        <!-- Voucher Input -->
        <div class="flex gap-2">
          <input 
            type="text" 
            id="voucher-input" 
            placeholder="Mã voucher (GIAM10, TECHVIP...)" 
            class="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs uppercase font-semibold focus:outline-none focus:border-indigo-600"
            value="${summary.voucher?.code || ''}"
          />
          <button 
            onclick="handleApplyVoucher()" 
            class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
          >
            Áp dụng
          </button>
        </div>

        ${summary.voucher ? `
          <div class="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span>🎁 ${summary.voucher.name}</span>
            <button onclick="store.removeVoucher()" class="text-rose-600 hover:text-rose-800 font-bold ml-2">Xóa</button>
          </div>
        ` : ''}

        <!-- Breakdown -->
        <div class="text-xs space-y-1.5 pt-2 border-t border-slate-200/60 text-slate-600">
          <div class="flex justify-between">
            <span>Tạm tính (${summary.totalCount} SP):</span>
            <span class="font-bold text-slate-800">${store.formatVND(summary.subtotal)}</span>
          </div>
          <div class="flex justify-between">
            <span>Giảm giá:</span>
            <span class="font-bold text-rose-600">-${store.formatVND(summary.discount)}</span>
          </div>
          <div class="flex justify-between">
            <span>Phí vận chuyển:</span>
            <span class="font-bold text-slate-800">${summary.shipping === 0 ? 'Miễn phí' : store.formatVND(summary.shipping)}</span>
          </div>
          <div class="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>Tổng thanh toán:</span>
            <span class="text-rose-600">${store.formatVND(summary.total)}</span>
          </div>
        </div>

        <button 
          onclick="openCheckoutModal()"
          class="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
        >
          <span>Tiến Hành Đặt Hàng</span>
          <i class="fas fa-arrow-right text-xs"></i>
        </button>
      </div>
    `;
  }
}

function handleApplyVoucher() {
  const input = document.getElementById('voucher-input');
  if (input) store.applyVoucher(input.value);
}

// 8. Checkout Modal Logic
function openCheckoutModal() {
  if (store.cart.length === 0) {
    api.showToast('Giỏ hàng trống!', 'warning');
    return;
  }

  toggleCartDrawer(false);
  const modal = document.getElementById('checkout-modal');
  if (!modal) return;

  const summary = store.getCartSummary();
  const summaryEl = document.getElementById('checkout-items-summary');
  const totalEl = document.getElementById('checkout-total-display');

  if (summaryEl) {
    summaryEl.innerHTML = store.cart.map(item => `
      <div class="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
        <span class="truncate max-w-[200px] text-slate-700 font-medium">${item.name} (x${item.qty})</span>
        <span class="font-bold text-slate-900">${store.formatVND(item.price * item.qty)}</span>
      </div>
    `).join('');
  }

  if (totalEl) totalEl.textContent = store.formatVND(summary.total);

  // Điền trước thông tin nếu đã đăng nhập
  if (store.user) {
    const nameInput = document.getElementById('checkout-name');
    const phoneInput = document.getElementById('checkout-phone');
    const emailInput = document.getElementById('checkout-email');
    if (nameInput) nameInput.value = store.user.fullName || store.user.username;
    if (phoneInput) phoneInput.value = store.user.phone || '';
    if (emailInput) emailInput.value = store.user.email || '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

async function handlePlaceOrder(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.customerName.value.trim();
  const phone = form.customerPhone.value.trim();
  const address = form.customerAddress.value.trim();
  const paymentMethod = form.paymentMethod.value;
  const note = form.note?.value.trim() || '';

  if (!name || !phone || !address) {
    api.showToast('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng', 'warning');
    return;
  }

  const summary = store.getCartSummary();
  const submitBtn = document.getElementById('checkout-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang xử lý lưu đơn hàng...';
  }

  try {
    const orderPayload = {
      customerName: name,
      customerPhone: phone,
      customerAddress: address,
      paymentMethod,
      note,
      items: store.cart,
      subtotal: summary.subtotal,
      discount: summary.discount,
      total: summary.total
    };

    const res = await api.createOrder(orderPayload);
    const orderData = res.data;

    store.clearCart();
    closeModal('checkout-modal');

    // Mở màn hình thành công
    openOrderSuccessModal(orderData);
  } catch (err) {
    api.showToast(`Lỗi đặt hàng: ${err.message}`, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Xác Nhận Đặt Hàng</span>';
    }
  }
}

function openOrderSuccessModal(order) {
  const modal = document.getElementById('order-success-modal');
  const codeEl = document.getElementById('success-order-code');
  const totalEl = document.getElementById('success-order-total');
  const qrEl = document.getElementById('success-qr-code');

  if (codeEl) codeEl.textContent = order.orderCode;
  if (totalEl) totalEl.textContent = store.formatVND(order.total);

  // Tạo mã VietQR động cho thanh toán tiện lợi
  if (qrEl) {
    const bank = 'MB'; // Ngân hàng MB Bank
    const account = '0988888888';
    const amount = order.total;
    const memo = order.orderCode;
    const qrUrl = `https://img.vietqr.io/image/${bank}-${account}-compact2.png?amount=${amount}&addInfo=${memo}&accountName=TECHSTORE%20VIETNAM`;
    qrEl.src = qrUrl;
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

// 9. Tra cứu Đơn Hàng Modal
function openTrackOrderModal() {
  const modal = document.getElementById('track-order-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

async function handleTrackOrder(event) {
  event.preventDefault();
  const code = document.getElementById('track-code-input').value.trim();
  const resultContainer = document.getElementById('track-result-container');

  if (!code) {
    api.showToast('Vui lòng nhập mã đơn hàng', 'warning');
    return;
  }

  resultContainer.innerHTML = `
    <div class="py-8 text-center text-slate-500">
      <i class="fas fa-spinner fa-spin text-2xl text-indigo-600 mb-2"></i>
      <p class="text-xs">Đang tra cứu từ SQL Server & MongoDB...</p>
    </div>
  `;

  try {
    const res = await api.trackOrder(code);
    const order = res.data;

    const statuses = ['Chờ xác nhận', 'Đang xử lý', 'Đang giao hàng', 'Đã hoàn thành'];
    const currentStep = statuses.indexOf(order.status);

    resultContainer.innerHTML = `
      <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
        <div class="flex justify-between items-center text-xs pb-3 border-b border-slate-200">
          <div>
            <span class="text-slate-400">Mã đơn hàng:</span>
            <span class="font-bold text-slate-800 ml-1">${order.orderCode}</span>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${
            order.status === 'Đã hoàn thành' ? 'bg-emerald-100 text-emerald-700' :
            order.status === 'Đang giao hàng' ? 'bg-blue-100 text-blue-700' :
            order.status === 'Đang xử lý' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
          }">
            ${order.status}
          </span>
        </div>

        <!-- Timeline -->
        <div class="grid grid-cols-4 gap-2 text-center text-[10px] font-bold pt-2">
          ${statuses.map((s, idx) => `
            <div class="flex flex-col items-center">
              <div class="w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                idx <= currentStep ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              }">
                <i class="fas ${idx <= currentStep ? 'fa-check' : 'fa-circle'} text-[8px]"></i>
              </div>
              <span class="${idx <= currentStep ? 'text-emerald-700' : 'text-slate-400'}">${s}</span>
            </div>
          `).join('')}
        </div>

        <!-- Items -->
        <div class="pt-3 border-t border-slate-200 text-xs">
          <div class="font-bold text-slate-700 mb-2">Sản phẩm:</div>
          <div class="space-y-1.5">
            ${order.items.map(it => `
              <div class="flex justify-between text-slate-600">
                <span>${it.name} x${it.qty}</span>
                <span class="font-semibold">${store.formatVND(it.price * it.qty)}</span>
              </div>
            `).join('')}
          </div>
          <div class="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
            <span>Tổng cộng:</span>
            <span class="text-rose-600">${store.formatVND(order.total)}</span>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    resultContainer.innerHTML = `
      <div class="p-6 text-center text-rose-500 bg-rose-50 rounded-2xl border border-rose-100">
        <i class="fas fa-exclamation-circle text-2xl mb-1"></i>
        <p class="text-xs font-semibold">${err.message}</p>
      </div>
    `;
  }
}

// 10. Login / Register Modal
function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const username = form.username.value.trim();
  const password = form.password.value;

  try {
    const res = await api.login(username, password);
    store.setUser(res.user);
    api.showToast(`Chào mừng trở lại, <strong>${res.user.fullName || res.user.username}</strong>!`, 'success');
    closeModal('auth-modal');
  } catch (err) {
    api.showToast(err.message, 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const username = form.regUsername.value.trim();
  const password = form.regPassword.value;
  const fullName = form.regFullName.value.trim();
  const email = form.regEmail.value.trim();
  const phone = form.regPhone.value.trim();

  try {
    const res = await api.register({ username, password, fullName, email, phone });
    store.setUser(res.user);
    api.showToast('Đăng ký tài khoản thành công!', 'success');
    closeModal('auth-modal');
  } catch (err) {
    api.showToast(err.message, 'error');
  }
}

function quickFillLogin(userType) {
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  if (userType === 'admin') {
    usernameInput.value = 'admin';
    passwordInput.value = '123';
  } else {
    usernameInput.value = 'user';
    passwordInput.value = '123';
  }
}

// 11. Event Listeners & Reset
function setupEventListeners() {
  // Live search debounce
  const searchInput = document.getElementById('search-input');
  let debounceTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        loadProducts();
      }, 400);
    });
  }

  // Sort order
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortOrder = e.target.value;
      loadProducts();
    });
  }

  // Price range filters
  document.querySelectorAll('.filter-price-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;
      state.priceRange = state.priceRange === range ? '' : range;
      updatePriceFilterUI();
      loadProducts();
    });
  });

  // Listen for Cart updates
  window.addEventListener('cartUpdated', () => {
    renderCartDrawer();
  });
}

function updatePriceFilterUI() {
  document.querySelectorAll('.filter-price-btn').forEach(btn => {
    if (btn.dataset.range === state.priceRange) {
      btn.classList.add('bg-indigo-600', 'text-white');
      btn.classList.remove('bg-white', 'text-slate-700');
    } else {
      btn.classList.remove('bg-indigo-600', 'text-white');
      btn.classList.add('bg-white', 'text-slate-700');
    }
  });
}

function handleResetFilters() {
  state.activeCategory = 'all';
  state.activeBrand = '';
  state.searchQuery = '';
  state.priceRange = '';
  state.sortOrder = 'default';

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'default';

  renderCategories();
  updatePriceFilterUI();
  loadProducts();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

window.handleSelectCategory = handleSelectCategory;
window.handleQuickAddToCart = handleQuickAddToCart;
window.openProductDetailModal = openProductDetailModal;
window.handleSelectDetailStorage = handleSelectDetailStorage;
window.handleSelectDetailColor = handleSelectDetailColor;
window.handleDetailQtyChange = handleDetailQtyChange;
window.handleAddDetailToCart = handleAddDetailToCart;
window.toggleCartDrawer = toggleCartDrawer;
window.handleApplyVoucher = handleApplyVoucher;
window.openCheckoutModal = openCheckoutModal;
window.handlePlaceOrder = handlePlaceOrder;
window.openTrackOrderModal = openTrackOrderModal;
window.handleTrackOrder = handleTrackOrder;
window.openAuthModal = openAuthModal;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.quickFillLogin = quickFillLogin;
window.handleResetFilters = handleResetFilters;
window.handleQuickSearch = handleQuickSearch;
window.closeModal = closeModal;
window.handleSwitchDbMode = handleSwitchDbMode;

