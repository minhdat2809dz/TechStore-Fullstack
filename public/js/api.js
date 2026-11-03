/**
 * api.js - Unified API Client kết nối Frontend với Backend, SQL Server và MongoDB
 */

const API_BASE = '/api';

const api = {
  dbHealth: null,

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Lỗi yêu cầu: ${response.statusText}`);
      }
      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return await this.request(`/products${qs}`);
  },

  async getProduct(id) {
    return await this.request(`/products/${id}`);
  },

  async createProduct(product) {
    return await this.request('/products', { method: 'POST', body: product });
  },

  async updateProduct(id, product) {
    return await this.request(`/products/${id}`, { method: 'PUT', body: product });
  },

  async deleteProduct(id) {
    return await this.request(`/products/${id}`, { method: 'DELETE' });
  },

  // Categories
  async getCategories() {
    return await this.request('/categories');
  },

  async createCategory(category) {
    return await this.request('/categories', { method: 'POST', body: category });
  },

  // Orders
  async getOrders() {
    return await this.request('/orders');
  },

  async trackOrder(orderCode) {
    return await this.request(`/orders/track/${encodeURIComponent(orderCode)}`);
  },

  async createOrder(orderData) {
    return await this.request('/orders', { method: 'POST', body: orderData });
  },

  async updateOrderStatus(id, status) {
    return await this.request(`/orders/${id}/status`, { method: 'PUT', body: { status } });
  },

  // Users & Auth
  async getUsers() {
    return await this.request('/users');
  },

  async login(username, password) {
    return await this.request('/users/login', { method: 'POST', body: { username, password } });
  },

  async register(userData) {
    return await this.request('/users/register', { method: 'POST', body: userData });
  },

  async createUser(userData) {
    return await this.request('/users', { method: 'POST', body: userData });
  },

  // Stats
  async getStats() {
    return await this.request('/stats');
  },

  // Database Management
  async getDbHealth() {
    try {
      const res = await this.request('/database/status');
      this.dbHealth = res.data;
      window.dispatchEvent(new CustomEvent('dbHealthUpdated', { detail: res.data }));
      return res.data;
    } catch (err) {
      this.dbHealth = null;
      window.dispatchEvent(new CustomEvent('dbHealthUpdated', { detail: null }));
      throw err;
    }
  },

  async switchDbMode(mode) {
    const res = await this.request('/database/mode', { method: 'POST', body: { mode } });
    await this.getDbHealth();
    return res;
  },

  async syncDatabases(direction = 'sql-to-mongo') {
    return await this.request('/database/sync', { method: 'POST', body: { direction } });
  },

  async inspectRaw(target = 'sql', collection = 'Products', limit = 5) {
    return await this.request(`/database/raw?target=${target}&collection=${collection}&limit=${limit}`);
  },

  // Toast Notification Helper
  showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      warning: 'bg-amber-600 text-white',
      info: 'bg-blue-600 text-white'
    };
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-4 opacity-0 ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info} text-lg"></i>
      <div class="text-sm font-medium flex-1">${message}</div>
      <button class="text-white/80 hover:text-white" onclick="this.parentElement.remove()">
        <i class="fas fa-times text-xs"></i>
      </button>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-4');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

window.api = api;

