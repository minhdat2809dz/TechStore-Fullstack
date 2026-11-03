const express = require('express');
const router = express.Router();
const dbManager = require('../services/dbManager');

// GET /api/orders (Admin xem danh sách đơn hàng)
router.get('/', async (req, res) => {
  try {
    const list = await dbManager.getOrders();
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải đơn hàng', error: err.message });
  }
});

// GET /api/orders/track/:code (Khách hàng tra cứu đơn hàng)
router.get('/track/:code', async (req, res) => {
  try {
    const order = await dbManager.getOrderByCode(req.params.code);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đơn hàng với mã này' });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tra cứu đơn hàng', error: err.message });
  }
});

// POST /api/orders (Đặt hàng từ giỏ hàng)
router.post('/', async (req, res) => {
  try {
    const o = req.body;
    if (!o.customerName || !o.customerPhone || !o.customerAddress || !o.items || o.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin giao hàng và sản phẩm' });
    }

    const saved = await dbManager.createOrder(o);
    res.status(201).json({
      success: true,
      message: '🎉 Đặt hàng thành công! Đơn hàng đã được lưu đồng bộ an toàn.',
      data: saved
    });
  } catch (err) {
    console.error('API createOrder error:', err);
    res.status(500).json({ success: false, message: 'Lỗi xử lý đặt hàng', error: err.message });
  }
});

// PUT /api/orders/:id/status (Admin cập nhật trạng thái đơn hàng)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Thiếu trạng thái cần cập nhật' });
    }
    const ok = await dbManager.updateOrderStatus(req.params.id, status);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    res.json({ success: true, message: `Đã cập nhật trạng thái đơn hàng thành "${status}"` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái đơn hàng', error: err.message });
  }
});

module.exports = router;

