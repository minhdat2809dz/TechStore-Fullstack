const express = require('express');
const router = express.Router();
const dbManager = require('../services/dbManager');

// GET /api/stats
router.get('/', async (req, res) => {
  try {
    const stats = await dbManager.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu thống kê', error: err.message });
  }
});

module.exports = router;

