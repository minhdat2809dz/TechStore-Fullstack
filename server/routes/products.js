const express = require('express');
const router = express.Router();
const dbManager = require('../services/dbManager');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const result = await dbManager.getProducts(req.query);
    res.json({
      success: true,
      count: result.data.length,
      source: result.source,
      data: result.data
    });
  } catch (err) {
    console.error('API getProducts error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách sản phẩm', error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await dbManager.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải chi tiết sản phẩm', error: err.message });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const p = req.body;
    if (!p.name || !p.price) {
      return res.status(400).json({ success: false, message: 'Tên sản phẩm và Giá là bắt buộc' });
    }
    const created = await dbManager.createProduct(p);
    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công (đã ghi nhận trên hệ thống)',
      data: created
    });
  } catch (err) {
    console.error('API createProduct error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tạo sản phẩm', error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const success = await dbManager.updateProduct(req.params.id, req.body);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để cập nhật' });
    }
    res.json({ success: true, message: 'Cập nhật sản phẩm thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật sản phẩm', error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const success = await dbManager.deleteProduct(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để xóa' });
    }
    res.json({ success: true, message: 'Xóa sản phẩm thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xóa sản phẩm', error: err.message });
  }
});

module.exports = router;

