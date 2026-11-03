/**
 * admin.js - Quản trị hệ thống toàn diện: Dashboard, Sản phẩm CRUD, Đơn hàng, Người dùng, Danh mục và Database SQL Server / MongoDB
 */

let adminState = {
  currentTab: 'dashboard',
  stats: null,
  products: [],
  categories: [],
  orders: [],
  users: [],
  dbHealth: null,
  activeOrderFilter: 'all',
  editingProductId: null
};

document.addEventListener('DOMContentLoaded', async () => {
  await initAdmin();
});

async function initAdmin() {
  // Kiểm tra đăng nhập
  if (!store.user) {
    store.setUser({
      id: 1,
      username: 'admin',
      fullName: 'Quản Trị Viên VIP',
      role: 'admin'
    });
  }

  setupAdminNav();
  await refreshDatabaseStatus();
  await switchAdminTab('dashboard');

  // Auto refresh db ping
  setInterval(refreshDatabaseStatus, 10000);
}

// 1. Quản lý Điều hướng Tabs
function setupAdminNav() {
  document.querySelectorAll('.admin-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchAdminTab(tab);
    });
  });
}

async function switchAdminTab(tabName) {
  adminState.currentTab = tabName;

  // Active styles trên sidebar
  document.querySelectorAll('.admin-nav-item').forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.className = 'admin-nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md shadow-indigo-200 transition';
    } else {
      btn.className = 'admin-nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition';
    }
  });

  // Ẩn tất cả tab content
  document.querySelectorAll('.admin-tab-content').forEach(tab => tab.classList.add('hidden'));

  // Hiển thị tab được chọn
  const activeTabEl = document.getElementById(`tab-${tabName}`);
  if (activeTabEl) activeTabEl.classList.remove('hidden');

  // Load dữ liệu cho từng tab
  if (tabName === 'dashboard') await loadDashboardData();
  else if (tabName === 'products') await loadAdminProducts();
  else if (tabName === 'orders') await loadAdminOrders();
  else if (tabName === 'users') await loadAdminUsers();
  else if (tabName === 'categories') await loadAdminCategories();
  else if (tabName === 'database') await loadAdminDatabaseCenter();
}

// 2. Database Health & Switcher
async function refreshDatabaseStatus() {
  try {
    const health = await api.getDbHealth();
    adminState.dbHealth = health;
    renderTopDbBadge(health);
  } catch (err) {
    adminState.dbHealth = null;
    renderTopDbBadge(null);
  }
}

function renderTopDbBadge(health) {
  const badge = document.getElementById('admin-db-status');
  if (!badge) return;

  if (!health) {
    badge.innerHTML = `<span class="inline-flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20"><i class="fas fa-exclamation-triangle"></i> Mất kết nối DB</span>`;
    return;
  }

  const isSqlOk = health.sqlServer?.status === 'Connected';
  const isMongoOk = health.mongoDb?.status === 'Connected';
  const mode = health.activeMode || 'dual';

  badge.innerHTML = `
    <div class="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
      <span class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full ${isSqlOk ? 'bg-blue-400' : 'bg-rose-500'}"></span>
        <span class="text-slate-300 font-medium">SQL 2025</span>
      </span>
      <span class="text-slate-600">|</span>
      <span class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full ${isMongoOk ? 'bg-emerald-400' : 'bg-rose-500'}"></span>
        <span class="text-slate-300 font-medium">MongoDB</span>
      </span>
      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
        mode === 'dual' ? 'bg-indigo-600 text-white' :
        mode === 'sql' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
      }">
        ${mode.toUpperCase()}
      </span>
    </div>
  `;
}

// 3. Tab: Dashboard
async function loadDashboardData() {
  try {
    const res = await api.getStats();
    const stats = res.data;
    adminState.stats = stats;

    // Metrics
    document.getElementById('stat-revenue').textContent = store.formatVND(stats.totalRevenue);
    document.getElementById('stat-orders').textContent = stats.totalOrders;
    document.getElementById('stat-products').textContent = stats.totalProducts;
    document.getElementById('stat-users').textContent = stats.totalUsers;

    // Render Recent Orders
    const recentTable = document.getElementById('recent-orders-table');
    if (recentTable) {
      if (stats.recentOrders.length === 0) {
        recentTable.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500 text-xs font-medium">Chưa có đơn hàng nào</td></tr>`;
      } else {
        recentTable.innerHTML = stats.recentOrders.map(o => `
          <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
            <td class="py-3.5 px-4 font-mono font-bold text-xs text-indigo-400">${o.orderCode}</td>
            <td class="py-3.5 px-4 text-xs font-bold text-slate-200">${o.customerName}</td>
            <td class="py-3.5 px-4 text-xs font-extrabold text-rose-400">${store.formatVND(o.total)}</td>
            <td class="py-3.5 px-4">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
                o.status === 'Đã hoàn thành' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                o.status === 'Đang giao hàng' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                o.status === 'Đang xử lý' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'
              }">${o.status}</span>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-400">${new Date(o.createdAt).toLocaleDateString('vi-VN')}</td>
          </tr>
        `).join('');
      }
    }

    // Render Category Breakdown Bars
    const catContainer = document.getElementById('category-breakdown-bars');
    if (catContainer && stats.categoryCount) {
      const entries = Object.entries(stats.categoryCount);
      const total = entries.reduce((s, [, c]) => s + c, 0) || 1;

      catContainer.innerHTML = entries.map(([name, count]) => {
        const pct = Math.round((count / total) * 100);
        return `
          <div class="space-y-1">
            <div class="flex justify-between text-xs">
              <span class="font-semibold text-slate-700">${name}</span>
              <span class="text-slate-400 font-bold">${count} SP (${pct}%)</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="bg-indigo-600 h-full rounded-full" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Lỗi tải Dashboard:', err);
  }
}

// 4. Tab: Products Management (CRUD)
async function loadAdminProducts() {
  const table = document.getElementById('admin-products-table');
  if (table) {
    table.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400 text-xs"><i class="fas fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu sản phẩm...</td></tr>`;
  }

  try {
    const res = await api.getProducts({ limit: 200 });
    adminState.products = res.data || [];
    renderAdminProductsTable(adminState.products);
  } catch (err) {
    if (table) table.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500 text-xs">${err.message}</td></tr>`;
  }
}

function renderAdminProductsTable(products) {
  const table = document.getElementById('admin-products-table');
  const countEl = document.getElementById('admin-products-count');
  if (countEl) countEl.textContent = `${products.length} sản phẩm`;
  if (!table) return;

  if (products.length === 0) {
    table.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-500 text-xs">Không có sản phẩm nào</td></tr>`;
    return;
  }

  table.innerHTML = products.map(p => `
    <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
      <td class="py-3 px-4 text-xs font-mono font-bold text-slate-500">#${p.id}</td>
      <td class="py-3 px-4">
        <div class="flex items-center gap-3">
          <img src="${p.image}" class="w-10 h-10 object-contain rounded-xl bg-slate-900 p-1 border border-slate-800" />
          <div class="min-w-0 max-w-xs">
            <h6 class="text-xs font-bold text-white truncate" title="${p.name}">${p.name}</h6>
            <span class="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">${p.brand || 'Khác'}</span>
          </div>
        </div>
      </td>
      <td class="py-3 px-4 text-xs font-semibold text-slate-300">${p.categoryName || p.category}</td>
      <td class="py-3 px-4 text-xs font-black text-rose-400">${store.formatVND(p.price)}</td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
          p.stock === 'Hết hàng' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        }">${p.stock || 'Sẵn hàng'}</span>
      </td>
      <td class="py-3 px-4 text-xs font-bold text-slate-300">${p.soldCount || 0}</td>
      <td class="py-3 px-4 text-right">
        <div class="inline-flex items-center gap-2">
          <button onclick="openEditProductModal(${p.id})" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs flex items-center justify-center transition" title="Chỉnh sửa">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="handleDeleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 text-xs flex items-center justify-center transition" title="Xóa">
            <i class="far fa-trash-alt"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddProductModal() {
  adminState.editingProductId = null;
  const form = document.getElementById('product-form');
  if (form) form.reset();
  const title = document.getElementById('product-modal-title');
  if (title) title.textContent = 'Thêm Sản Phẩm Mới (SQL & MongoDB)';
  openModal('product-modal');
}

function openEditProductModal(id) {
  const product = adminState.products.find(p => p.id === id);
  if (!product) return;

  adminState.editingProductId = id;
  const form = document.getElementById('product-form');
  if (!form) return;

  form.name.value = product.name || '';
  form.brand.value = product.brand || '';
  form.category.value = product.category || 'phone';
  form.categoryName.value = product.categoryName || '';
  form.price.value = product.price || '';
  form.oldPrice.value = product.oldPrice || '';
  form.stock.value = product.stock || 'Sẵn hàng';
  form.image.value = product.image || '';
  form.badge.value = product.badge || '';
  form.description.value = product.description || '';
  form.flashSale.checked = Boolean(product.flashSale);
  form.flashDiscount.value = product.flashDiscount || 0;

  const title = document.getElementById('product-modal-title');
  if (title) title.textContent = `Chỉnh Sửa Sản Phẩm #${id}`;
  openModal('product-modal');
}

async function handleSaveProduct(event) {
  event.preventDefault();
  const form = event.target;

  const payload = {
    name: form.name.value.trim(),
    brand: form.brand.value.trim(),
    category: form.category.value,
    categoryName: form.categoryName.value.trim() || form.category.options[form.category.selectedIndex]?.text,
    price: Number(form.price.value),
    oldPrice: form.oldPrice.value ? Number(form.oldPrice.value) : null,
    stock: form.stock.value,
    image: form.image.value.trim(),
    badge: form.badge.value.trim(),
    description: form.description.value.trim(),
    flashSale: form.flashSale.checked,
    flashDiscount: Number(form.flashDiscount.value) || 0
  };

  try {
    if (adminState.editingProductId) {
      await api.updateProduct(adminState.editingProductId, payload);
      api.showToast('Cập nhật sản phẩm thành công!', 'success');
    } else {
      await api.createProduct(payload);
      api.showToast('Thêm sản phẩm thành công!', 'success');
    }
    closeModal('product-modal');
    await loadAdminProducts();
  } catch (err) {
    api.showToast(`Lỗi: ${err.message}`, 'error');
  }
}

async function handleDeleteProduct(id, name) {
  if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm: "${name}"? Thao tác này sẽ xóa đồng bộ trên cả SQL Server và MongoDB.`)) {
    return;
  }

  try {
    await api.deleteProduct(id);
    api.showToast(`Đã xóa sản phẩm #${id}`, 'success');
    await loadAdminProducts();
  } catch (err) {
    api.showToast(`Lỗi xóa sản phẩm: ${err.message}`, 'error');
  }
}

// 5. Tab: Orders Management
async function loadAdminOrders() {
  const table = document.getElementById('admin-orders-table');
  if (table) {
    table.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400 text-xs"><i class="fas fa-spinner fa-spin mr-2"></i> Đang tải danh sách đơn hàng...</td></tr>`;
  }

  try {
    const res = await api.getOrders();
    adminState.orders = res.data || [];
    renderAdminOrdersTable(adminState.orders);
  } catch (err) {
    if (table) table.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500 text-xs">${err.message}</td></tr>`;
  }
}

function renderAdminOrdersTable(orders) {
  const table = document.getElementById('admin-orders-table');
  const countEl = document.getElementById('admin-orders-count');
  if (countEl) countEl.textContent = `${orders.length} đơn hàng`;
  if (!table) return;

  if (orders.length === 0) {
    table.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400 text-xs">Không có đơn hàng nào</td></tr>`;
    return;
  }

  const statuses = ['Chờ xác nhận', 'Đang xử lý', 'Đang giao hàng', 'Đã hoàn thành', 'Đã hủy'];

  table.innerHTML = orders.map(o => `
    <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
      <td class="py-3 px-4 font-bold text-xs font-mono text-indigo-400">${o.orderCode}</td>
      <td class="py-3 px-4">
        <div class="text-xs font-bold text-white">${o.customerName}</div>
        <div class="text-[10px] text-slate-400">${o.customerPhone}</div>
      </td>
      <td class="py-3 px-4 text-xs font-semibold text-slate-300">${o.items?.length || 0} sản phẩm</td>
      <td class="py-3 px-4 text-xs font-black text-rose-400">${store.formatVND(o.total)}</td>
      <td class="py-3 px-4 text-xs font-semibold text-slate-300">${o.paymentMethod || 'COD'}</td>
      <td class="py-3 px-4">
        <select 
          onchange="handleUpdateOrderStatus('${o.id || o.orderCode}', this.value)"
          class="text-xs font-bold rounded-lg px-2.5 py-1 bg-slate-900 border border-slate-700 text-white focus:outline-none ${
            o.status === 'Đã hoàn thành' ? 'text-emerald-400 border-emerald-500/40' :
            o.status === 'Đang giao hàng' ? 'text-blue-400 border-blue-500/40' :
            o.status === 'Đang xử lý' ? 'text-amber-400 border-amber-500/40' :
            o.status === 'Đã hủy' ? 'text-rose-400 border-rose-500/40' : 'text-slate-300'
          }"
        >
          ${statuses.map(st => `
            <option value="${st}" ${o.status === st ? 'selected' : ''} class="bg-slate-900 text-white">${st}</option>
          `).join('')}
        </select>
      </td>
      <td class="py-3 px-4 text-right">
        <button 
          onclick="openOrderDetailModal('${o.orderCode}')" 
          class="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-xl text-xs font-semibold transition"
        >
          Xem chi tiết
        </button>
      </td>
    </tr>
  `).join('');
}

async function handleUpdateOrderStatus(id, newStatus) {
  try {
    await api.updateOrderStatus(id, newStatus);
    api.showToast(`Đã chuyển trạng thái đơn hàng sang: <strong>${newStatus}</strong>`, 'success');
    await loadAdminOrders();
  } catch (err) {
    api.showToast(`Lỗi: ${err.message}`, 'error');
  }
}

function openOrderDetailModal(orderCode) {
  const order = adminState.orders.find(o => o.orderCode === orderCode);
  if (!order) return;

  const content = document.getElementById('order-detail-content');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <span class="text-slate-400">Khách hàng:</span>
          <div class="font-bold text-slate-800 text-sm mt-0.5">${order.customerName}</div>
          <div class="text-slate-600 mt-1"><i class="fas fa-phone mr-1 text-slate-400"></i> ${order.customerPhone}</div>
          <div class="text-slate-600 mt-1"><i class="fas fa-map-marker-alt mr-1 text-slate-400"></i> ${order.customerAddress}</div>
        </div>
        <div>
          <span class="text-slate-400">Thông tin đơn:</span>
          <div class="font-mono font-bold text-indigo-600 text-sm mt-0.5">${order.orderCode}</div>
          <div class="text-slate-600 mt-1">Hình thức: <strong>${order.paymentMethod}</strong></div>
          <div class="text-slate-600 mt-1">Ngày tạo: ${new Date(order.createdAt).toLocaleString('vi-VN')}</div>
          ${order.note ? `<div class="text-slate-500 italic mt-1">Ghi chú: "${order.note}"</div>` : ''}
        </div>
      </div>

      <div class="border border-slate-200 rounded-xl overflow-hidden">
        <table class="w-full text-left">
          <thead class="bg-slate-100 text-slate-600 text-[11px] uppercase">
            <tr>
              <th class="py-2.5 px-3">Sản phẩm</th>
              <th class="py-2.5 px-3 text-center">SL</th>
              <th class="py-2.5 px-3 text-right">Đơn giá</th>
              <th class="py-2.5 px-3 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${order.items.map(it => `
              <tr>
                <td class="py-2.5 px-3 font-semibold text-slate-800">${it.name} ${it.storage ? `(${it.storage})` : ''}</td>
                <td class="py-2.5 px-3 text-center font-bold">${it.qty}</td>
                <td class="py-2.5 px-3 text-right text-slate-600">${store.formatVND(it.price)}</td>
                <td class="py-2.5 px-3 text-right font-bold text-slate-900">${store.formatVND(it.price * it.qty)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="flex justify-between items-center pt-3 border-t border-slate-200">
        <span class="text-sm font-bold text-slate-700">Tổng thanh toán:</span>
        <span class="text-lg font-black text-rose-600">${store.formatVND(order.total)}</span>
      </div>
    </div>
  `;

  openModal('order-detail-modal');
}

// 6. Tab: Users Management
async function loadAdminUsers() {
  const table = document.getElementById('admin-users-table');
  if (table) {
    table.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-slate-400 text-xs"><i class="fas fa-spinner fa-spin mr-2"></i> Đang tải danh sách người dùng...</td></tr>`;
  }

  try {
    const res = await api.getUsers();
    adminState.users = res.data || [];

    if (!table) return;
    if (adminState.users.length === 0) {
      table.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400 text-xs">Chưa có người dùng</td></tr>`;
      return;
    }

    table.innerHTML = adminState.users.map(u => `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
        <td class="py-3 px-4 font-mono font-bold text-xs text-slate-500">#${u.id}</td>
        <td class="py-3 px-4 font-bold text-xs text-white">${u.username}</td>
        <td class="py-3 px-4 text-xs font-semibold text-slate-300">${u.fullName || ''}</td>
        <td class="py-3 px-4 text-xs font-medium text-slate-400">${u.email || ''}</td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
            u.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'
          }">${u.role}</span>
        </td>
        <td class="py-3 px-4 text-xs text-slate-400">${new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
      </tr>
    `).join('');
  } catch (err) {
    if (table) table.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-rose-500 text-xs">${err.message}</td></tr>`;
  }
}

async function handleCreateUser(event) {
  event.preventDefault();
  const form = event.target;
  const username = form.username.value.trim();
  const password = form.password.value;
  const fullName = form.fullName.value.trim();
  const email = form.email.value.trim();
  const role = form.role.value;

  try {
    await api.createUser({ username, password, fullName, email, role });
    api.showToast(`Đã thêm tài khoản: ${username}`, 'success');
    closeModal('user-modal');
    await loadAdminUsers();
  } catch (err) {
    api.showToast(`Lỗi: ${err.message}`, 'error');
  }
}

// 7. Tab: Categories Management
async function loadAdminCategories() {
  const table = document.getElementById('admin-categories-table');
  if (table) {
    table.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-400 text-xs"><i class="fas fa-spinner fa-spin mr-2"></i> Đang tải danh mục...</td></tr>`;
  }

  try {
    const res = await api.getCategories();
    adminState.categories = res.data || [];

    if (!table) return;
    table.innerHTML = adminState.categories.map(c => `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
        <td class="py-3 px-4 font-mono font-bold text-xs text-slate-500">${c.id}</td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-xs border border-indigo-500/20">
              <i class="fas ${c.icon || 'fa-tag'}"></i>
            </div>
            <span class="font-bold text-xs text-white">${c.name}</span>
          </div>
        </td>
        <td class="py-3 px-4 font-mono text-xs text-slate-400">${c.icon || 'fa-tag'}</td>
        <td class="py-3 px-4 font-bold text-xs text-slate-200">${c.displayOrder || 1}</td>
        <td class="py-3 px-4 text-right">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <i class="fas fa-check-circle text-[9px]"></i> Đã đồng bộ
          </span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    if (table) table.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-rose-500 text-xs">${err.message}</td></tr>`;
  }
}

async function handleCreateCategory(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.catId.value.trim().toLowerCase();
  const name = form.catName.value.trim();
  const icon = form.catIcon.value.trim() || 'fa-tag';
  const displayOrder = Number(form.catOrder.value) || 10;

  try {
    await api.createCategory({ id, name, icon, displayOrder });
    api.showToast(`Đã thêm danh mục: ${name}`, 'success');
    closeModal('category-modal');
    await loadAdminCategories();
  } catch (err) {
    api.showToast(`Lỗi: ${err.message}`, 'error');
  }
}

// 8. Tab: Database Control Center & Live Sync Inspector
async function loadAdminDatabaseCenter() {
  await refreshDatabaseStatus();
  const health = adminState.dbHealth;
  if (!health) return;

  // SQL Server Card Details
  const sqlStatusEl = document.getElementById('db-sql-status');
  const sqlPingEl = document.getElementById('db-sql-ping');
  const sqlCountsEl = document.getElementById('db-sql-counts');

  if (sqlStatusEl) {
    sqlStatusEl.innerHTML = health.sqlServer.status === 'Connected'
      ? `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">● Connected</span>`
      : `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">● Disconnected</span>`;
  }
  if (sqlPingEl) sqlPingEl.textContent = `${health.sqlServer.pingMs || 0} ms`;
  if (sqlCountsEl && health.sqlServer.tables) {
    sqlCountsEl.innerHTML = `
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span class="text-slate-400">Products:</span>
          <span class="font-bold text-white ml-1 text-sm">${health.sqlServer.tables.products ?? 0}</span>
        </div>
        <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span class="text-slate-400">Categories:</span>
          <span class="font-bold text-white ml-1 text-sm">${health.sqlServer.tables.categories ?? 0}</span>
        </div>
        <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span class="text-slate-400">Orders:</span>
          <span class="font-bold text-white ml-1 text-sm">${health.sqlServer.tables.orders ?? 0}</span>
        </div>
        <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span class="text-slate-400">Users:</span>
          <span class="font-bold text-white ml-1 text-sm">${health.sqlServer.tables.users ?? 0}</span>
        </div>
      </div>
    `;
  }

  // MongoDB Card Details
  const mongoStatusEl = document.getElementById('db-mongo-status');
  const mongoPingEl = document.getElementById('db-mongo-ping');
  const mongoCountsEl = document.getElementById('db-mongo-counts');

  if (mongoStatusEl) {
    mongoStatusEl.innerHTML = health.mongoDb.status === 'Connected'
      ? `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">● Connected</span>`
      : `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">● Disconnected</span>`;
  }
  if (mongoPingEl) mongoPingEl.textContent = `${health.mongoDb.pingMs || 0} ms`;
  if (mongoCountsEl && health.mongoDb.collections) {
    mongoCountsEl.innerHTML = `
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span class="text-slate-400">products:</span>
          <span class="font-bold text-white ml-1 text-sm">${health.mongoDb.collections.products ?? 0}</span>
        </div>
        <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span class="text-slate-400">categories:</span>
          <span class="font-bold text-white ml-1 text-sm">${health.mongoDb.collections.categories ?? 0}</span>
        </div>
        <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span class="text-slate-400">orders:</span>
          <span class="font-bold text-white ml-1 text-sm">${health.mongoDb.collections.orders ?? 0}</span>
        </div>
        <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span class="text-slate-400">users:</span>
          <span class="font-bold text-white ml-1 text-sm">${health.mongoDb.collections.users ?? 0}</span>
        </div>
      </div>
    `;
  }

  // Active Mode Buttons
  const currentMode = health.activeMode || 'dual';
  ['dual', 'sql', 'mongo'].forEach(m => {
    const btn = document.getElementById(`mode-btn-${m}`);
    if (btn) {
      if (m === currentMode) {
        btn.className = 'px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 border border-indigo-500';
      } else {
        btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-2 border border-slate-700';
      }
    }
  });
}

async function handleAdminSwitchMode(mode) {
  try {
    const res = await api.switchDbMode(mode);
    api.showToast(res.message, 'success');
    await loadAdminDatabaseCenter();
  } catch (err) {
    api.showToast(`Lỗi: ${err.message}`, 'error');
  }
}

async function handleRunSync(direction) {
  const terminal = document.getElementById('sync-terminal-log');
  if (terminal) {
    terminal.textContent += `\n[${new Date().toLocaleTimeString()}] Đang chạy đồng bộ: ${direction}...`;
  }

  try {
    const res = await api.syncDatabases(direction);
    const data = res.data;
    if (terminal) {
      terminal.textContent += `\n[${new Date().toLocaleTimeString()}] ✅ ${data.message}`;
      terminal.textContent += `\n[${new Date().toLocaleTimeString()}] Thống kê: Sản phẩm: ${data.synced.products}, Danh mục: ${data.synced.categories}, Đơn: ${data.synced.orders}, User: ${data.synced.users}`;
    }
    api.showToast('Đồng bộ dữ liệu thành công!', 'success');
    await loadAdminDatabaseCenter();
  } catch (err) {
    if (terminal) {
      terminal.textContent += `\n[${new Date().toLocaleTimeString()}] ❌ Lỗi: ${err.message}`;
    }
    api.showToast(`Lỗi đồng bộ: ${err.message}`, 'error');
  }
}

async function handleInspectRawData() {
  const target = document.getElementById('inspect-target').value;
  const col = document.getElementById('inspect-collection').value;
  const output = document.getElementById('inspect-raw-output');

  if (output) output.textContent = 'Đang truy vấn dữ liệu mẫu...';

  try {
    const res = await api.inspectRaw(target, col, 3);
    if (output) {
      output.textContent = JSON.stringify(res, null, 2);
    }
  } catch (err) {
    if (output) output.textContent = `Lỗi: ${err.message}`;
  }
}

// 9. Modals Helper
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

window.switchAdminTab = switchAdminTab;
window.openAddProductModal = openAddProductModal;
window.openEditProductModal = openEditProductModal;
window.handleSaveProduct = handleSaveProduct;
window.handleDeleteProduct = handleDeleteProduct;
window.handleUpdateOrderStatus = handleUpdateOrderStatus;
window.openOrderDetailModal = openOrderDetailModal;
window.handleCreateUser = handleCreateUser;
window.handleCreateCategory = handleCreateCategory;
window.handleAdminSwitchMode = handleAdminSwitchMode;
window.handleRunSync = handleRunSync;
window.handleInspectRawData = handleInspectRawData;
window.openModal = openModal;
window.closeModal = closeModal;

