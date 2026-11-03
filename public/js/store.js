/**
 * store.js - Quản lý trạng thái Giỏ hàng, Tài khoản, Wishlist và Tiện ích
 */

const store = {
  // 1. Quản lý Giỏ hàng (Cart)
  cart: JSON.parse(localStorage.getItem('techstore_cart') || '[]'),
  voucher: JSON.parse(localStorage.getItem('techstore_voucher') || 'null'),

  saveCart() {
    localStorage.setItem('techstore_cart', JSON.stringify(this.cart));
    localStorage.setItem('techstore_voucher', JSON.stringify(this.voucher));
    this.updateCartBadge();
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: this.cart, summary: this.getCartSummary() } }));
  },

  addToCart(product, options = {}) {
    const { color = '', storage = '', qty = 1, price = product.price } = options;
    const cartItemId = `${product.id}-${color}-${storage}`;

    const existingIndex = this.cart.findIndex(item => item.cartItemId === cartItemId);
    if (existingIndex > -1) {
      this.cart[existingIndex].qty += qty;
    } else {
      this.cart.push({
        cartItemId,
        id: product.id,
        name: product.name,
        price: Number(price),
        oldPrice: product.oldPrice,
        image: product.image,
        category: product.category,
        brand: product.brand,
        color,
        storage,
        qty
      });
    }

    this.saveCart();
    api.showToast(`Đã thêm <strong>${product.name}</strong> vào giỏ hàng!`, 'success');
  },

  updateCartQty(cartItemId, delta) {
    const item = this.cart.find(i => i.cartItemId === cartItemId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      this.cart = this.cart.filter(i => i.cartItemId !== cartItemId);
      api.showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'info');
    }
    this.saveCart();
  },

  removeFromCart(cartItemId) {
    this.cart = this.cart.filter(i => i.cartItemId !== cartItemId);
    this.saveCart();
    api.showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'info');
  },

  clearCart() {
    this.cart = [];
    this.voucher = null;
    this.saveCart();
  },

  applyVoucher(code) {
    const trimmed = (code || '').trim().toUpperCase();
    if (trimmed === 'GIAM10') {
      this.voucher = { code: 'GIAM10', discountPercent: 10, name: 'Giảm 10% tổng đơn' };
      this.saveCart();
      api.showToast('Áp dụng mã <strong>GIAM10</strong> thành công! (-10%)', 'success');
      return true;
    } else if (trimmed === 'TECHVIP') {
      this.voucher = { code: 'TECHVIP', discountAmount: 200000, name: 'Khách VIP giảm 200.000đ' };
      this.saveCart();
      api.showToast('Áp dụng mã <strong>TECHVIP</strong> thành công! (-200k)', 'success');
      return true;
    } else if (trimmed === 'FREESHIP') {
      this.voucher = { code: 'FREESHIP', discountShipping: true, name: 'Miễn phí vận chuyển toàn quốc' };
      this.saveCart();
      api.showToast('Áp dụng mã <strong>FREESHIP</strong> thành công!', 'success');
      return true;
    } else {
      api.showToast('Mã giảm giá không hợp lệ. Thử: GIAM10, TECHVIP hoặc FREESHIP', 'warning');
      return false;
    }
  },

  removeVoucher() {
    this.voucher = null;
    this.saveCart();
    api.showToast('Đã hủy mã giảm giá', 'info');
  },

  getCartSummary() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    let shipping = subtotal > 0 ? (subtotal >= 20000000 ? 0 : 30000) : 0;
    let discount = 0;

    if (this.voucher) {
      if (this.voucher.discountPercent) {
        discount = Math.round((subtotal * this.voucher.discountPercent) / 100);
      } else if (this.voucher.discountAmount) {
        discount = Math.min(this.voucher.discountAmount, subtotal);
      } else if (this.voucher.discountShipping) {
        shipping = 0;
      }
    }

    const total = Math.max(0, subtotal - discount + shipping);
    const totalCount = this.cart.reduce((sum, item) => sum + item.qty, 0);

    return {
      subtotal,
      shipping,
      discount,
      total,
      totalCount,
      voucher: this.voucher
    };
  },

  updateCartBadge() {
    const count = this.cart.reduce((sum, item) => sum + item.qty, 0);
    const badges = document.querySelectorAll('.cart-badge-count');
    badges.forEach(b => {
      b.textContent = count;
      if (count > 0) {
        b.classList.remove('hidden');
      } else {
        b.classList.add('hidden');
      }
    });
  },

  // 2. Quản lý Tài khoản (Auth)
  user: JSON.parse(localStorage.getItem('techstore_user') || 'null'),

  setUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem('techstore_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('techstore_user');
    }
    window.dispatchEvent(new CustomEvent('userAuthChanged', { detail: user }));
    this.updateUserUI();
  },

  logout() {
    this.setUser(null);
    api.showToast('Đã đăng xuất tài khoản', 'info');
    if (window.location.pathname.includes('admin')) {
      window.location.href = '/index.html';
    }
  },

  isAdmin() {
    return this.user && this.user.role === 'admin';
  },

  updateUserUI() {
    const userBtn = document.getElementById('user-auth-btn');
    const userMenu = document.getElementById('user-dropdown-menu');
    const adminLink = document.getElementById('header-admin-link');

    if (!userBtn) return;

    if (this.user) {
      userBtn.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
            ${(this.user.fullName || this.user.username).charAt(0)}
          </div>
          <span class="text-xs font-semibold max-w-[100px] truncate hidden md:inline-block">${this.user.fullName || this.user.username}</span>
          <i class="fas fa-chevron-down text-[10px] text-slate-400"></i>
        </div>
      `;
      if (adminLink) {
        if (this.isAdmin()) {
          adminLink.classList.remove('hidden');
        } else {
          adminLink.classList.add('hidden');
        }
      }
    } else {
      userBtn.innerHTML = `
        <div class="flex items-center gap-2 text-slate-700 hover:text-indigo-600">
          <i class="far fa-user-circle text-xl"></i>
          <span class="text-xs font-semibold hidden md:inline-block">Tài khoản</span>
        </div>
      `;
      if (adminLink) adminLink.classList.add('hidden');
    }
  },

  // 3. Wishlist
  wishlist: JSON.parse(localStorage.getItem('techstore_wishlist') || '[]'),

  toggleWishlist(productId) {
    const id = Number(productId);
    const idx = this.wishlist.indexOf(id);
    if (idx > -1) {
      this.wishlist.splice(idx, 1);
      api.showToast('Đã xóa khỏi danh sách yêu thích', 'info');
    } else {
      this.wishlist.push(id);
      api.showToast('Đã thêm vào danh sách yêu thích ❤️', 'success');
    }
    localStorage.setItem('techstore_wishlist', JSON.stringify(this.wishlist));
    this.updateWishlistBadges();
  },

  updateWishlistBadges() {
    const count = this.wishlist.length;
    const badges = document.querySelectorAll('.wishlist-badge-count');
    badges.forEach(b => {
      b.textContent = count;
      if (count > 0) b.classList.remove('hidden');
      else b.classList.add('hidden');
    });
  },

  // 4. Định dạng tiền tệ VND
  formatVND(num) {
    if (num === null || num === undefined || isNaN(num)) return '0 ₫';
    return Number(num).toLocaleString('vi-VN') + ' ₫';
  }
};

window.store = store;

