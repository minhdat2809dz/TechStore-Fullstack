const express = require('express');
const router = express.Router();
const dbManager = require('../services/dbManager');
const { getSqlPool } = require('../config/sql');
const { getMongoDb } = require('../config/mongo');

// GET /api/database/status
router.get('/status', async (req, res) => {
  try {
    const health = await dbManager.getHealth();
    res.json({ success: true, data: health });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi kiểm tra cơ sở dữ liệu', error: err.message });
  }
});

// POST /api/database/mode
router.post('/mode', (req, res) => {
  const { mode } = req.body;
  if (!['dual', 'sql', 'mongo'].includes(mode)) {
    return res.status(400).json({ success: false, message: 'Chế độ không hợp lệ. Chọn "dual", "sql", hoặc "mongo"' });
  }
  const ok = dbManager.setActiveMode(mode);
  res.json({
    success: ok,
    message: `Đã chuyển chế độ hoạt động cơ sở dữ liệu sang: [${mode.toUpperCase()}]`,
    activeMode: mode
  });
});

// POST /api/database/sync
router.post('/sync', async (req, res) => {
  try {
    const { direction = 'sql-to-mongo' } = req.body;
    const result = await dbManager.syncDatabases(direction);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('API syncDatabases error:', err);
    res.status(500).json({ success: false, message: 'Lỗi trong quá trình đồng bộ dữ liệu', error: err.message });
  }
});

// GET /api/database/raw
router.get('/raw', async (req, res) => {
  const { target = 'sql', collection = 'Products', limit = 5 } = req.query;
  try {
    if (target === 'sql') {
      const pool = await getSqlPool();
      const validTables = ['Products', 'Categories', 'Orders', 'Users'];
      const tableName = validTables.find(t => t.toLowerCase() === collection.toLowerCase()) || 'Products';
      const result = await pool.request().query(`SELECT TOP ${Number(limit)} * FROM dbo.${tableName}`);
      return res.json({ success: true, target: 'SQL Server', table: tableName, rows: result.recordset });
    } else {
      const db = await getMongoDb();
      const docs = await db.collection(collection.toLowerCase()).find().limit(Number(limit)).toArray();
      return res.json({ success: true, target: 'MongoDB', collection: collection.toLowerCase(), docs });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi truy vấn dữ liệu mẫu', error: err.message });
  }
});

module.exports = router;

