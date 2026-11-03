const express = require('express');
const router = express.Router();
const dbManager = require('../services/dbManager');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const list = await dbManager.getCategories();
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh mục', error: err.message });
  }
});

// POST /api/categories
router.post('/', async (req, res) => {
  try {
    const cat = req.body;
    if (!cat.id || !cat.name) {
      return res.status(400).json({ success: false, message: 'Mã id và Tên danh mục là bắt buộc' });
    }
    const created = await dbManager.createCategory(cat);
    res.status(201).json({ success: true, message: 'Tạo danh mục thành công', data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tạo danh mục', error: err.message });
  }
});

module.exports = router;

