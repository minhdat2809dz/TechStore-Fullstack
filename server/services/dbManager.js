const { sql, getSqlPool, getSqlConfig } = require('../config/sql');
const { getMongoDb, getMongoClient, getMongoConfig } = require('../config/mongo');
const {
  mapProductFromSql,
  mapProductFromMongo,
  mapOrderFromSql,
  mapOrderFromMongo,
  mapUserFromSql,
  mapUserFromMongo
} = require('../utils/mapper');

// Chế độ cơ sở dữ liệu hiện tại: 'dual' | 'sql' | 'mongo'
let activeMode = process.env.DB_MODE || 'dual';

function getActiveMode() {
  return activeMode;
}

function setActiveMode(mode) {
  if (['dual', 'sql', 'mongo'].includes(mode)) {
    activeMode = mode;
    return true;
  }
  return false;
}

// ==========================================
// 1. PRODUCTS
// ==========================================

async function getProducts(filters = {}) {
  const { category, brand, search, minPrice, maxPrice, sort, limit = 100, page = 1 } = filters;

  // Nếu chọn chế độ MongoDB, hoặc khi SQL lỗi ở chế độ DUAL
  if (activeMode === 'mongo') {
    return await getProductsFromMongo(filters);
  }

  try {
    const pool = await getSqlPool();
    let query = 'SELECT * FROM dbo.Products WHERE 1=1';
    const request = pool.request();

    if (category && category !== 'all') {
      query += ' AND Category = @category';
      request.input('category', sql.NVarChar(50), category);
    }
    if (brand) {
      query += ' AND LOWER(Brand) = LOWER(@brand)';
      request.input('brand', sql.NVarChar(100), brand);
    }
    if (search) {
      query += ' AND (LOWER(Name) LIKE @search OR LOWER(Brand) LIKE @search OR LOWER(CategoryName) LIKE @search)';
      request.input('search', sql.NVarChar(255), `%${search.toLowerCase()}%`);
    }
    if (minPrice !== undefined && minPrice !== '') {
      query += ' AND Price >= @minPrice';
      request.input('minPrice', sql.BigInt, Number(minPrice));
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      query += ' AND Price <= @maxPrice';
      request.input('maxPrice', sql.BigInt, Number(maxPrice));
    }

    if (sort === 'price-asc') query += ' ORDER BY Price ASC';
    else if (sort === 'price-desc') query += ' ORDER BY Price DESC';
    else if (sort === 'rating') query += ' ORDER BY Rating DESC';
    else if (sort === 'popular') query += ' ORDER BY SoldCount DESC';
    else query += ' ORDER BY Id DESC';

    const result = await request.query(query);
    const products = result.recordset.map(mapProductFromSql);
    return { data: products, source: 'SQL Server (SQLEXPRESS2025)' };
  } catch (err) {
    if (activeMode === 'dual') {
      console.warn('⚠️ SQL Server lỗi khi đọc sản phẩm, chuyển hướng sang MongoDB:', err.message);
      return await getProductsFromMongo(filters);
    }
    throw err;
  }
}

async function getProductsFromMongo(filters = {}) {
  const { category, brand, search, minPrice, maxPrice, sort } = filters;
  const db = await getMongoDb();
  const query = {};

  if (category && category !== 'all') query.category = category;
  if (brand) query.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { categoryName: { $regex: search, $options: 'i' } }
    ];
  }
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  let cursor = db.collection('products').find(query);

  if (sort === 'price-asc') cursor = cursor.sort({ price: 1 });
  else if (sort === 'price-desc') cursor = cursor.sort({ price: -1 });
  else if (sort === 'rating') cursor = cursor.sort({ rating: -1 });
  else if (sort === 'popular') cursor = cursor.sort({ soldCount: -1 });
  else cursor = cursor.sort({ id: -1 });

  const raw = await cursor.toArray();
  const products = raw.map(mapProductFromMongo);
  return { data: products, source: 'MongoDB (TechStoreDB)' };
}

async function getProductById(id) {
  const numId = Number(id);
  if (activeMode === 'mongo') {
    const db = await getMongoDb();
    const doc = await db.collection('products').findOne({ id: numId });
    return doc ? mapProductFromMongo(doc) : null;
  }

  try {
    const pool = await getSqlPool();
    const result = await pool.request()
      .input('id', sql.Int, numId)
      .query('SELECT * FROM dbo.Products WHERE Id = @id');
    if (result.recordset.length === 0) return null;
    return mapProductFromSql(result.recordset[0]);
  } catch (err) {
    if (activeMode === 'dual') {
      const db = await getMongoDb();
      const doc = await db.collection('products').findOne({ id: numId });
      return doc ? mapProductFromMongo(doc) : null;
    }
    throw err;
  }
}

async function createProduct(prod) {
  let createdSql = null;
  let createdMongo = null;

  // 1. Tạo trên SQL Server nếu activeMode là 'sql' hoặc 'dual'
  if (activeMode === 'sql' || activeMode === 'dual') {
    try {
      const pool = await getSqlPool();
      const request = pool.request();
      request.input('name', sql.NVarChar(255), prod.name);
      request.input('brand', sql.NVarChar(100), prod.brand || '');
      request.input('category', sql.NVarChar(50), prod.category || 'phone');
      request.input('categoryName', sql.NVarChar(100), prod.categoryName || '');
      request.input('price', sql.BigInt, Number(prod.price) || 0);
      request.input('oldPrice', sql.BigInt, prod.oldPrice ? Number(prod.oldPrice) : null);
      request.input('rating', sql.Decimal(3, 2), prod.rating !== undefined ? Number(prod.rating) : 5.0);
      request.input('reviewsCount', sql.Int, Number(prod.reviewsCount) || 0);
      request.input('image', sql.NVarChar(500), prod.image || '');
      request.input('badge', sql.NVarChar(50), prod.badge || '');
      request.input('description', sql.NVarChar(sql.MAX), prod.description || '');
      request.input('stock', sql.NVarChar(50), prod.stock || 'Sẵn hàng');
      request.input('flashSale', sql.Bit, prod.flashSale ? 1 : 0);
      request.input('flashDiscount', sql.Int, Number(prod.flashDiscount) || 0);
      request.input('soldCount', sql.Int, Number(prod.soldCount) || 0);
      request.input('gift', sql.NVarChar(255), prod.gift || '');
      request.input('specsJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.specs || {}));
      request.input('colorsJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.colors || []));
      request.input('storageOptionsJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.storageOptions || []));
      request.input('galleryJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.gallery || (prod.image ? [prod.image] : [])));
      request.input('reviewsJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.reviews || []));

      const insertSql = `
        INSERT INTO dbo.Products (
          Name, Brand, Category, CategoryName, Price, OldPrice, Rating, ReviewsCount,
          Image, Badge, Description, Stock, FlashSale, FlashDiscount, SoldCount, Gift,
          SpecsJson, ColorsJson, StorageOptionsJson, GalleryJson, ReviewsJson, CreatedAt, UpdatedAt
        ) OUTPUT INSERTED.* VALUES (
          @name, @brand, @category, @categoryName, @price, @oldPrice, @rating, @reviewsCount,
          @image, @badge, @description, @stock, @flashSale, @flashDiscount, @soldCount, @gift,
          @specsJson, @colorsJson, @storageOptionsJson, @galleryJson, @reviewsJson, GETDATE(), GETDATE()
        );
      `;
      const res = await request.query(insertSql);
      createdSql = mapProductFromSql(res.recordset[0]);
    } catch (err) {
      console.error('❌ Lỗi tạo SP trên SQL Server:', err.message);
      if (activeMode === 'sql') throw err;
    }
  }

  // 2. Tạo trên MongoDB nếu activeMode là 'mongo' hoặc 'dual'
  if (activeMode === 'mongo' || activeMode === 'dual') {
    try {
      const db = await getMongoDb();
      let nextId = createdSql ? createdSql.id : Date.now();
      if (!createdSql) {
        const last = await db.collection('products').find().sort({ id: -1 }).limit(1).toArray();
        if (last.length > 0 && typeof last[0].id === 'number') {
          nextId = last[0].id + 1;
        }
      }

      const mongoDoc = {
        id: nextId,
        ...prod,
        id: nextId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('products').insertOne(mongoDoc);
      createdMongo = mapProductFromMongo(mongoDoc);
    } catch (err) {
      console.error('❌ Lỗi tạo SP trên MongoDB:', err.message);
      if (activeMode === 'mongo') throw err;
    }
  }

  return createdSql || createdMongo;
}

async function updateProduct(id, prod) {
  const numId = Number(id);
  let updatedSql = false;
  let updatedMongo = false;

  if (activeMode === 'sql' || activeMode === 'dual') {
    try {
      const pool = await getSqlPool();
      const request = pool.request();
      request.input('id', sql.Int, numId);
      request.input('name', sql.NVarChar(255), prod.name);
      request.input('brand', sql.NVarChar(100), prod.brand || '');
      request.input('category', sql.NVarChar(50), prod.category || 'phone');
      request.input('categoryName', sql.NVarChar(100), prod.categoryName || '');
      request.input('price', sql.BigInt, Number(prod.price) || 0);
      request.input('oldPrice', sql.BigInt, prod.oldPrice ? Number(prod.oldPrice) : null);
      request.input('stock', sql.NVarChar(50), prod.stock || 'Sẵn hàng');
      request.input('image', sql.NVarChar(500), prod.image || '');
      request.input('badge', sql.NVarChar(50), prod.badge || '');
      request.input('description', sql.NVarChar(sql.MAX), prod.description || '');
      request.input('flashSale', sql.Bit, prod.flashSale ? 1 : 0);
      request.input('flashDiscount', sql.Int, Number(prod.flashDiscount) || 0);
      request.input('specsJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.specs || {}));
      request.input('colorsJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.colors || []));
      request.input('storageOptionsJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.storageOptions || []));
      request.input('galleryJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.gallery || (prod.image ? [prod.image] : [])));

      const updateQuery = `
        UPDATE dbo.Products SET
          Name = @name, Brand = @brand, Category = @category, CategoryName = @categoryName,
          Price = @price, OldPrice = @oldPrice, Stock = @stock, Image = @image, Badge = @badge,
          Description = @description, FlashSale = @flashSale, FlashDiscount = @flashDiscount,
          SpecsJson = @specsJson, ColorsJson = @colorsJson, StorageOptionsJson = @storageOptionsJson,
          GalleryJson = @galleryJson, UpdatedAt = GETDATE()
        WHERE Id = @id;
      `;
      const res = await request.query(updateQuery);
      if (res.rowsAffected[0] > 0) updatedSql = true;
    } catch (err) {
      console.error('❌ Lỗi cập nhật SP SQL Server:', err.message);
    }
  }

  if (activeMode === 'mongo' || activeMode === 'dual') {
    try {
      const db = await getMongoDb();
      const mongoUpdate = { ...prod, updatedAt: new Date() };
      delete mongoUpdate._id;
      delete mongoUpdate.id;
      const res = await db.collection('products').updateOne({ id: numId }, { $set: mongoUpdate });
      if (res.matchedCount > 0) updatedMongo = true;
    } catch (err) {
      console.error('❌ Lỗi cập nhật SP MongoDB:', err.message);
    }
  }

  return updatedSql || updatedMongo;
}

async function deleteProduct(id) {
  const numId = Number(id);
  let deletedSql = false;
  let deletedMongo = false;

  if (activeMode === 'sql' || activeMode === 'dual') {
    try {
      const pool = await getSqlPool();
      const res = await pool.request()
        .input('id', sql.Int, numId)
        .query('DELETE FROM dbo.Products WHERE Id = @id');
      if (res.rowsAffected[0] > 0) deletedSql = true;
    } catch (err) {
      console.error('❌ Lỗi xóa SP trên SQL Server:', err.message);
    }
  }

  if (activeMode === 'mongo' || activeMode === 'dual') {
    try {
      const db = await getMongoDb();
      const res = await db.collection('products').deleteOne({ id: numId });
      if (res.deletedCount > 0) deletedMongo = true;
    } catch (err) {
      console.error('❌ Lỗi xóa SP trên MongoDB:', err.message);
    }
  }

  return deletedSql || deletedMongo;
}

// ==========================================
// 2. CATEGORIES
// ==========================================

async function getCategories() {
  if (activeMode === 'mongo') {
    const db = await getMongoDb();
    const categories = await db.collection('categories').find().sort({ displayOrder: 1 }).toArray();
    return categories.map(c => ({ id: c.id, name: c.name, icon: c.icon, displayOrder: c.displayOrder }));
  }

  try {
    const pool = await getSqlPool();
    const result = await pool.request().query('SELECT * FROM dbo.Categories ORDER BY DisplayOrder ASC');
    return result.recordset.map(r => ({
      id: r.Id,
      name: r.Name,
      icon: r.Icon || 'fa-tag',
      displayOrder: r.DisplayOrder || 1
    }));
  } catch (err) {
    if (activeMode === 'dual') {
      const db = await getMongoDb();
      const categories = await db.collection('categories').find().sort({ displayOrder: 1 }).toArray();
      return categories.map(c => ({ id: c.id, name: c.name, icon: c.icon, displayOrder: c.displayOrder }));
    }
    throw err;
  }
}

async function createCategory(cat) {
  if (activeMode === 'sql' || activeMode === 'dual') {
    try {
      const pool = await getSqlPool();
      await pool.request()
        .input('id', sql.NVarChar(50), cat.id)
        .input('name', sql.NVarChar(100), cat.name)
        .input('icon', sql.NVarChar(50), cat.icon || 'fa-tag')
        .input('displayOrder', sql.Int, Number(cat.displayOrder) || 10)
        .query('INSERT INTO dbo.Categories (Id, Name, Icon, DisplayOrder) VALUES (@id, @name, @icon, @displayOrder)');
    } catch (err) {
      console.warn('SQL create category error:', err.message);
    }
  }

  if (activeMode === 'mongo' || activeMode === 'dual') {
    try {
      const db = await getMongoDb();
      await db.collection('categories').updateOne(
        { id: cat.id },
        { $set: { id: cat.id, name: cat.name, icon: cat.icon || 'fa-tag', displayOrder: Number(cat.displayOrder) || 10 } },
        { upsert: true }
      );
    } catch (err) {
      console.warn('Mongo create category error:', err.message);
    }
  }

  return cat;
}

// ==========================================
// 3. ORDERS
// ==========================================

async function getOrders() {
  if (activeMode === 'mongo') {
    const db = await getMongoDb();
    const list = await db.collection('orders').find().sort({ createdAt: -1 }).toArray();
    return list.map(mapOrderFromMongo);
  }

  try {
    const pool = await getSqlPool();
    const result = await pool.request().query('SELECT * FROM dbo.Orders ORDER BY CreatedAt DESC');
    return result.recordset.map(mapOrderFromSql);
  } catch (err) {
    if (activeMode === 'dual') {
      const db = await getMongoDb();
      const list = await db.collection('orders').find().sort({ createdAt: -1 }).toArray();
      return list.map(mapOrderFromMongo);
    }
    throw err;
  }
}

async function getOrderByCode(code) {
  if (activeMode === 'mongo') {
    const db = await getMongoDb();
    const doc = await db.collection('orders').findOne({ orderCode: code });
    return doc ? mapOrderFromMongo(doc) : null;
  }

  try {
    const pool = await getSqlPool();
    const res = await pool.request()
      .input('code', sql.NVarChar(50), code)
      .query('SELECT * FROM dbo.Orders WHERE OrderCode = @code');
    if (res.recordset.length === 0) return null;
    return mapOrderFromSql(res.recordset[0]);
  } catch (err) {
    if (activeMode === 'dual') {
      const db = await getMongoDb();
      const doc = await db.collection('orders').findOne({ orderCode: code });
      return doc ? mapOrderFromMongo(doc) : null;
    }
    throw err;
  }
}

async function createOrder(order) {
  const orderCode = order.orderCode || ('TECH-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 900 + 100));
  let savedSql = null;
  let savedMongo = null;

  if (activeMode === 'sql' || activeMode === 'dual') {
    try {
      const pool = await getSqlPool();
      const request = pool.request();
      request.input('orderCode', sql.NVarChar(50), orderCode);
      request.input('customerName', sql.NVarChar(100), order.customerName);
      request.input('customerPhone', sql.NVarChar(20), order.customerPhone);
      request.input('customerAddress', sql.NVarChar(255), order.customerAddress);
      request.input('paymentMethod', sql.NVarChar(50), order.paymentMethod || 'COD');
      request.input('note', sql.NVarChar(sql.MAX), order.note || '');
      request.input('itemsJson', sql.NVarChar(sql.MAX), JSON.stringify(order.items || []));
      request.input('subtotal', sql.BigInt, Number(order.subtotal) || 0);
      request.input('discount', sql.BigInt, Number(order.discount) || 0);
      request.input('total', sql.BigInt, Number(order.total) || 0);
      request.input('status', sql.NVarChar(50), order.status || 'Chờ xác nhận');

      const query = `
        INSERT INTO dbo.Orders (
          OrderCode, CustomerName, CustomerPhone, CustomerAddress,
          PaymentMethod, Note, ItemsJson, Subtotal, Discount, Total, Status, CreatedAt
        ) OUTPUT INSERTED.* VALUES (
          @orderCode, @customerName, @customerPhone, @customerAddress,
          @paymentMethod, @note, @itemsJson, @subtotal, @discount, @total, @status, GETDATE()
        );
      `;
      const res = await request.query(query);
      savedSql = mapOrderFromSql(res.recordset[0]);
    } catch (err) {
      console.error('❌ Lỗi lưu Order trên SQL Server:', err.message);
    }
  }

  if (activeMode === 'mongo' || activeMode === 'dual') {
    try {
      const db = await getMongoDb();
      const mongoOrder = {
        orderCode: orderCode,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        paymentMethod: order.paymentMethod || 'COD',
        note: order.note || '',
        items: order.items || [],
        subtotal: Number(order.subtotal) || 0,
        discount: Number(order.discount) || 0,
        total: Number(order.total) || 0,
        status: order.status || 'Chờ xác nhận',
        createdAt: new Date()
      };
      const res = await db.collection('orders').insertOne(mongoOrder);
      savedMongo = { id: res.insertedId.toString(), ...mongoOrder };
    } catch (err) {
      console.error('❌ Lỗi lưu Order trên MongoDB:', err.message);
    }
  }

  return savedSql || savedMongo;
}

async function updateOrderStatus(id, status) {
  let updated = false;

  if (activeMode === 'sql' || activeMode === 'dual') {
    try {
      const pool = await getSqlPool();
      const numId = Number(id);
      if (!isNaN(numId)) {
        await pool.request()
          .input('id', sql.Int, numId)
          .input('status', sql.NVarChar(50), status)
          .query('UPDATE dbo.Orders SET Status = @status WHERE Id = @id');
        updated = true;
      }
    } catch (err) {
      console.warn('SQL updateOrderStatus error:', err.message);
    }
  }

  if (activeMode === 'mongo' || activeMode === 'dual') {
    try {
      const db = await getMongoDb();
      const numId = Number(id);
      const query = !isNaN(numId) ? { $or: [{ id: numId }, { orderCode: id }] } : { orderCode: id };
      await db.collection('orders').updateOne(query, { $set: { status: status, updatedAt: new Date() } });
      updated = true;
    } catch (err) {
      console.warn('Mongo updateOrderStatus error:', err.message);
    }
  }

  return updated;
}

// ==========================================
// 4. USERS & AUTH
// ==========================================

async function getUsers() {
  if (activeMode === 'mongo') {
    const db = await getMongoDb();
    const users = await db.collection('users').find().toArray();
    return users.map(mapUserFromMongo);
  }

  try {
    const pool = await getSqlPool();
    const result = await pool.request().query('SELECT Id, Username, FullName, Email, Phone, Role, CreatedAt FROM dbo.Users ORDER BY Id ASC');
    return result.recordset.map(mapUserFromSql);
  } catch (err) {
    if (activeMode === 'dual') {
      const db = await getMongoDb();
      const users = await db.collection('users').find().toArray();
      return users.map(mapUserFromMongo);
    }
    throw err;
  }
}

async function loginUser(username, password) {
  // Tìm từ SQL Server
  try {
    const pool = await getSqlPool();
    const res = await pool.request()
      .input('u', sql.NVarChar(50), username)
      .input('p', sql.NVarChar(255), password)
      .query('SELECT * FROM dbo.Users WHERE Username = @u AND Password = @p');
    if (res.recordset.length > 0) {
      return mapUserFromSql(res.recordset[0]);
    }
  } catch (err) {
    console.warn('SQL login error:', err.message);
  }

  // Fallback hoặc nếu dùng MongoDB
  try {
    const db = await getMongoDb();
    const user = await db.collection('users').findOne({ username, password });
    if (user) {
      return mapUserFromMongo(user);
    }
  } catch (err) {
    console.warn('Mongo login error:', err.message);
  }

  return null;
}

async function createUser(user) {
  let created = null;

  if (activeMode === 'sql' || activeMode === 'dual') {
    try {
      const pool = await getSqlPool();
      const res = await pool.request()
        .input('username', sql.NVarChar(50), user.username)
        .input('password', sql.NVarChar(255), user.password)
        .input('fullName', sql.NVarChar(100), user.fullName || user.username)
        .input('email', sql.NVarChar(100), user.email || '')
        .input('phone', sql.NVarChar(20), user.phone || '')
        .input('role', sql.NVarChar(20), user.role || 'user')
        .query(`
          INSERT INTO dbo.Users (Username, Password, FullName, Email, Phone, Role, CreatedAt)
          OUTPUT INSERTED.* VALUES (@username, @password, @fullName, @email, @phone, @role, GETDATE())
        `);
      created = mapUserFromSql(res.recordset[0]);
    } catch (err) {
      console.warn('SQL createUser error:', err.message);
    }
  }

  if (activeMode === 'mongo' || activeMode === 'dual') {
    try {
      const db = await getMongoDb();
      const doc = {
        username: user.username,
        password: user.password,
        fullName: user.fullName || user.username,
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'user',
        createdAt: new Date()
      };
      await db.collection('users').insertOne(doc);
      if (!created) created = mapUserFromMongo(doc);
    } catch (err) {
      console.warn('Mongo createUser error:', err.message);
    }
  }

  return created;
}

// ==========================================
// 5. STATS & ANALYTICS
// ==========================================

async function getStats() {
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalProducts = 0;
  let totalUsers = 0;
  let recentOrders = [];
  let categoryCount = {};

  try {
    const productsRes = await getProducts({ limit: 1000 });
    const products = productsRes.data || [];
    totalProducts = products.length;

    products.forEach(p => {
      const c = p.categoryName || p.category || 'Khác';
      categoryCount[c] = (categoryCount[c] || 0) + 1;
    });

    const orders = await getOrders();
    totalOrders = orders.length;
    totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    recentOrders = orders.slice(0, 5);

    const users = await getUsers();
    totalUsers = users.length;
  } catch (err) {
    console.error('Stats error:', err.message);
  }

  return {
    totalRevenue,
    totalOrders,
    totalProducts,
    totalUsers,
    categoryCount,
    recentOrders,
    activeMode
  };
}

// ==========================================
// 6. HEALTH & LIVE STATUS OF BOTH DATABASES
// ==========================================

async function getHealth() {
  const health = {
    activeMode,
    timestamp: new Date().toISOString(),
    sqlServer: {
      status: 'Disconnected',
      instance: process.env.SQL_INSTANCE || 'SQLEXPRESS2025',
      database: process.env.SQL_DATABASE || 'TechStoreDB',
      user: 'sa',
      tables: {}
    },
    mongoDb: {
      status: 'Disconnected',
      uri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017',
      database: process.env.MONGO_DATABASE || 'TechStoreDB',
      collections: {}
    }
  };

  // Check SQL Server
  try {
    const startSql = Date.now();
    const pool = await getSqlPool();
    const counts = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM dbo.Products) AS products,
        (SELECT COUNT(*) FROM dbo.Categories) AS categories,
        (SELECT COUNT(*) FROM dbo.Orders) AS orders,
        (SELECT COUNT(*) FROM dbo.Users) AS users
    `);
    health.sqlServer.status = 'Connected';
    health.sqlServer.pingMs = Date.now() - startSql;
    health.sqlServer.tables = counts.recordset[0] || {};
  } catch (err) {
    health.sqlServer.status = 'Error';
    health.sqlServer.error = err.message;
  }

  // Check MongoDB
  try {
    const startMongo = Date.now();
    const db = await getMongoDb();
    const [pCount, cCount, oCount, uCount] = await Promise.all([
      db.collection('products').countDocuments(),
      db.collection('categories').countDocuments(),
      db.collection('orders').countDocuments(),
      db.collection('users').countDocuments()
    ]);
    health.mongoDb.status = 'Connected';
    health.mongoDb.pingMs = Date.now() - startMongo;
    health.mongoDb.collections = {
      products: pCount,
      categories: cCount,
      orders: oCount,
      users: uCount
    };
  } catch (err) {
    health.mongoDb.status = 'Error';
    health.mongoDb.error = err.message;
  }

  return health;
}

// ==========================================
// 7. SYNC BIDIRECTIONAL (SQL <-> MongoDB)
// ==========================================

async function syncDatabases(direction = 'sql-to-mongo') {
  const result = {
    direction,
    timestamp: new Date().toISOString(),
    synced: {
      categories: 0,
      products: 0,
      users: 0,
      orders: 0
    },
    message: ''
  };

  const pool = await getSqlPool();
  const db = await getMongoDb();

  if (direction === 'sql-to-mongo') {
    // 1. Sync Categories
    const sqlCats = await pool.request().query('SELECT * FROM dbo.Categories');
    if (sqlCats.recordset.length > 0) {
      await db.collection('categories').deleteMany({});
      await db.collection('categories').insertMany(sqlCats.recordset.map(c => ({
        id: c.Id,
        name: c.Name,
        icon: c.Icon,
        displayOrder: c.DisplayOrder
      })));
      result.synced.categories = sqlCats.recordset.length;
    }

    // 2. Sync Products
    const sqlProds = await pool.request().query('SELECT * FROM dbo.Products');
    if (sqlProds.recordset.length > 0) {
      const mongoDocs = sqlProds.recordset.map(r => {
        const p = mapProductFromSql(r);
        return {
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          categoryName: p.categoryName,
          price: p.price,
          oldPrice: p.oldPrice,
          rating: p.rating,
          reviewsCount: p.reviewsCount,
          image: p.image,
          badge: p.badge,
          description: p.description,
          stock: p.stock,
          flashSale: p.flashSale,
          flashDiscount: p.flashDiscount,
          soldCount: p.soldCount,
          gift: p.gift,
          specs: p.specs,
          colors: p.colors,
          storageOptions: p.storageOptions,
          gallery: p.gallery,
          reviews: p.reviews,
          createdAt: p.createdAt || new Date(),
          updatedAt: p.updatedAt || new Date()
        };
      });
      await db.collection('products').deleteMany({});
      await db.collection('products').insertMany(mongoDocs);
      result.synced.products = mongoDocs.length;
    }

    // 3. Sync Users
    const sqlUsers = await pool.request().query('SELECT * FROM dbo.Users');
    if (sqlUsers.recordset.length > 0) {
      await db.collection('users').deleteMany({});
      await db.collection('users').insertMany(sqlUsers.recordset.map(u => ({
        id: u.Id,
        username: u.Username,
        password: u.Password,
        fullName: u.FullName,
        email: u.Email,
        phone: u.Phone,
        role: u.Role,
        createdAt: u.CreatedAt
      })));
      result.synced.users = sqlUsers.recordset.length;
    }

    // 4. Sync Orders
    const sqlOrders = await pool.request().query('SELECT * FROM dbo.Orders');
    if (sqlOrders.recordset.length > 0) {
      await db.collection('orders').deleteMany({});
      await db.collection('orders').insertMany(sqlOrders.recordset.map(o => {
        const ord = mapOrderFromSql(o);
        return {
          id: ord.id,
          orderCode: ord.orderCode,
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          customerAddress: ord.customerAddress,
          paymentMethod: ord.paymentMethod,
          note: ord.note,
          items: ord.items,
          subtotal: ord.subtotal,
          discount: ord.discount,
          total: ord.total,
          status: ord.status,
          createdAt: ord.createdAt
        };
      }));
      result.synced.orders = sqlOrders.recordset.length;
    }

    result.message = `Đã đồng bộ thành công toàn bộ dữ liệu từ SQL Server sang MongoDB!`;
  } else if (direction === 'mongo-to-sql') {
    // Sync Mongo -> SQL
    const mongoProds = await db.collection('products').find().toArray();
    for (const p of mongoProds) {
      const prod = mapProductFromMongo(p);
      const req = pool.request();
      req.input('id', sql.Int, prod.id);
      req.input('name', sql.NVarChar(255), prod.name);
      req.input('brand', sql.NVarChar(100), prod.brand || '');
      req.input('category', sql.NVarChar(50), prod.category || 'phone');
      req.input('categoryName', sql.NVarChar(100), prod.categoryName || '');
      req.input('price', sql.BigInt, Number(prod.price) || 0);
      req.input('oldPrice', sql.BigInt, prod.oldPrice ? Number(prod.oldPrice) : null);
      req.input('rating', sql.Decimal(3, 2), Number(prod.rating) || 5.0);
      req.input('reviewsCount', sql.Int, Number(prod.reviewsCount) || 0);
      req.input('image', sql.NVarChar(500), prod.image || '');
      req.input('badge', sql.NVarChar(50), prod.badge || '');
      req.input('description', sql.NVarChar(sql.MAX), prod.description || '');
      req.input('stock', sql.NVarChar(50), prod.stock || 'Sẵn hàng');
      req.input('flashSale', sql.Bit, prod.flashSale ? 1 : 0);
      req.input('flashDiscount', sql.Int, Number(prod.flashDiscount) || 0);
      req.input('soldCount', sql.Int, Number(prod.soldCount) || 0);
      req.input('gift', sql.NVarChar(255), prod.gift || '');
      req.input('specsJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.specs || {}));
      req.input('colorsJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.colors || []));
      req.input('storageOptionsJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.storageOptions || []));
      req.input('galleryJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.gallery || []));
      req.input('reviewsJson', sql.NVarChar(sql.MAX), JSON.stringify(prod.reviews || []));

      await req.query(`
        IF EXISTS (SELECT 1 FROM dbo.Products WHERE Id = @id)
        BEGIN
          UPDATE dbo.Products SET
            Name = @name, Brand = @brand, Category = @category, CategoryName = @categoryName,
            Price = @price, OldPrice = @oldPrice, Rating = @rating, ReviewsCount = @reviewsCount,
            Image = @image, Badge = @badge, Description = @description, Stock = @stock,
            FlashSale = @flashSale, FlashDiscount = @flashDiscount, SoldCount = @soldCount, Gift = @gift,
            SpecsJson = @specsJson, ColorsJson = @colorsJson, StorageOptionsJson = @storageOptionsJson,
            GalleryJson = @galleryJson, ReviewsJson = @reviewsJson, UpdatedAt = GETDATE()
          WHERE Id = @id;
        END
      `);
      result.synced.products++;
    }
    result.message = `Đã đồng bộ sản phẩm từ MongoDB về SQL Server!`;
  }

  return result;
}

module.exports = {
  getActiveMode,
  setActiveMode,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  getOrders,
  getOrderByCode,
  createOrder,
  updateOrderStatus,
  getUsers,
  loginUser,
  createUser,
  getStats,
  getHealth,
  syncDatabases
};

