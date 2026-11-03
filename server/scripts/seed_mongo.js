const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const MONGO_DB = process.env.MONGO_DATABASE || 'TechStoreDB';

async function seedMongo() {
  const dataPath = path.join(__dirname, '..', 'data', 'seed_data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Không tìm thấy file seed_data.json tại:', dataPath);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`🍃 Đang kết nối tới MongoDB: ${MONGO_URI}/${MONGO_DB}...`);

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(MONGO_DB);

    // 1. Categories
    if (data.categories && data.categories.length > 0) {
      const count = await db.collection('categories').countDocuments();
      if (count === 0) {
        await db.collection('categories').insertMany(data.categories);
        console.log(`✅ Đã nạp ${data.categories.length} danh mục.`);
      } else {
        console.log(`ℹ️ Danh mục đã tồn tại (${count} bản ghi), bỏ qua.`);
      }
    }

    // 2. Products
    if (data.products && data.products.length > 0) {
      const count = await db.collection('products').countDocuments();
      if (count === 0) {
        await db.collection('products').insertMany(data.products);
        console.log(`✅ Đã nạp ${data.products.length} sản phẩm.`);
      } else {
        console.log(`ℹ️ Sản phẩm đã tồn tại (${count} bản ghi), bỏ qua.`);
      }
    }

    // 3. Users
    if (data.users && data.users.length > 0) {
      const count = await db.collection('users').countDocuments();
      if (count === 0) {
        await db.collection('users').insertMany(data.users);
        console.log(`✅ Đã nạp ${data.users.length} người dùng.`);
      } else {
        console.log(`ℹ️ Người dùng đã tồn tại (${count} bản ghi), bỏ qua.`);
      }
    }

    // 4. Orders
    if (data.orders && data.orders.length > 0) {
      const count = await db.collection('orders').countDocuments();
      if (count === 0) {
        await db.collection('orders').insertMany(data.orders);
        console.log(`✅ Đã nạp ${data.orders.length} đơn hàng.`);
      } else {
        console.log(`ℹ️ Đơn hàng đã tồn tại (${count} bản ghi), bỏ qua.`);
      }
    }

    console.log('🎉 Hoàn tất nạp dữ liệu vào MongoDB thành công!');
  } catch (err) {
    console.error('❌ Lỗi khi nạp dữ liệu:', err.message);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  seedMongo();
}

module.exports = seedMongo;
