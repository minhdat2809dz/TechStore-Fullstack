const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { getSqlPool } = require('./config/sql');
const { getMongoDb } = require('./config/mongo');

const productsRoutes = require('./routes/products');
const categoriesRoutes = require('./routes/categories');
const ordersRoutes = require('./routes/orders');
const usersRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');
const databaseRoutes = require('./routes/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static frontend serving from 'public' folder
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Request Logger
app.use((req, res, next) => {
  if (!req.url.startsWith('/css') && !req.url.startsWith('/js') && !req.url.startsWith('/images')) {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  }
  next();
});

// API Routes
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/database', databaseRoutes);

// Health Endpoint
app.get('/api/health', async (req, res) => {
  const dbManager = require('./services/dbManager');
  const health = await dbManager.getHealth();
  res.json({
    status: 'OK',
    server: 'TechStore Multi-DB API',
    databases: health
  });
});

// Fallback for Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicPath, 'admin.html'));
});

// Fallback for Storefront
app.get('*', (req, res) => {
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(publicPath, 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
  }
});

// Start Server and Test Connections
app.listen(PORT, async () => {
  console.log(`\n===============================================================`);
  console.log(`🚀 TECHSTORE PRO FULLSTACK SYSTEM STARTED`);
  console.log(`🌐 Website Khách hàng : http://localhost:${PORT}`);
  console.log(`🛠️ Quản trị Admin     : http://localhost:${PORT}/admin.html`);
  console.log(`📊 API Health Check   : http://localhost:${PORT}/api/health`);
  console.log(`===============================================================\n`);

  // Thử kết nối SQL Server (nếu không phải chế độ thuần mongo)
  if (process.env.DB_MODE !== 'mongo') {
    try {
      await getSqlPool();
    } catch (err) {
      console.warn('⚠️ Cảnh báo khởi động SQL Server:', err.message);
    }
  }

  // Thử kết nối MongoDB và tự động nạp dữ liệu mẫu nếu DB trống
  try {
    await getMongoDb();
    const seedMongo = require('./scripts/seed_mongo');
    await seedMongo();
  } catch (err) {
    console.warn('⚠️ Cảnh báo khởi động MongoDB:', err.message);
  }
});
