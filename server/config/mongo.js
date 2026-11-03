const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const MONGO_DB = process.env.MONGO_DATABASE || 'TechStoreDB';

let client = null;
let db = null;

async function getMongoDb() {
  if (db) return db;

  try {
    console.log(`🍃 Kết nối MongoDB tới: ${MONGO_URI}/${MONGO_DB}...`);
    client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    await client.connect();
    db = client.db(MONGO_DB);

    // Đảm bảo các collection chính đã tồn tại
    const collections = await db.listCollections().toArray();
    const colNames = collections.map(c => c.name);

    if (!colNames.includes('products')) await db.createCollection('products');
    if (!colNames.includes('categories')) await db.createCollection('categories');
    if (!colNames.includes('orders')) await db.createCollection('orders');
    if (!colNames.includes('users')) await db.createCollection('users');

    // Index cần thiết
    try {
      await db.collection('products').createIndex({ id: 1 }, { unique: true, sparse: true });
      await db.collection('orders').createIndex({ orderCode: 1 }, { unique: true, sparse: true });
      await db.collection('users').createIndex({ username: 1 }, { unique: true, sparse: true });
      await db.collection('categories').createIndex({ id: 1 }, { unique: true, sparse: true });
    } catch {}

    console.log(`✅ MongoDB (${MONGO_DB}) kết nối thành công!`);
    return db;
  } catch (err) {
    console.error('❌ Lỗi kết nối MongoDB:', err.message);
    db = null;
    throw err;
  }
}

function getMongoClient() {
  return client;
}

module.exports = {
  getMongoDb,
  getMongoClient,
  getMongoConfig: () => ({
    uri: MONGO_URI,
    database: MONGO_DB
  })
};

