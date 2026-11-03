/**
 * mapper.js - Chuẩn hóa định dạng dữ liệu giữa SQL Server, MongoDB và Frontend API
 */

function tryParseJson(str, fallback) {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Chuyển đổi dữ liệu từ dòng SQL sang Product Object
function mapProductFromSql(row) {
  if (!row) return null;
  return {
    id: Number(row.Id),
    name: row.Name || '',
    brand: row.Brand || '',
    category: row.Category || 'phone',
    categoryName: row.CategoryName || '',
    price: Number(row.Price) || 0,
    oldPrice: row.OldPrice ? Number(row.OldPrice) : null,
    rating: row.Rating !== null && row.Rating !== undefined ? Number(row.Rating) : 5.0,
    reviewsCount: Number(row.ReviewsCount) || 0,
    image: row.Image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    badge: row.Badge || '',
    description: row.Description || '',
    stock: row.Stock || 'Sẵn hàng',
    flashSale: Boolean(row.FlashSale),
    flashDiscount: Number(row.FlashDiscount) || 0,
    soldCount: Number(row.SoldCount) || 0,
    gift: row.Gift || '',
    specs: tryParseJson(row.SpecsJson, {}),
    colors: tryParseJson(row.ColorsJson, []),
    storageOptions: tryParseJson(row.StorageOptionsJson, []),
    gallery: tryParseJson(row.GalleryJson, row.Image ? [row.Image] : []),
    reviews: tryParseJson(row.ReviewsJson, []),
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt
  };
}

// Chuyển đổi dữ liệu từ MongoDB document sang Product Object
function mapProductFromMongo(doc) {
  if (!doc) return null;
  const p = { ...doc };
  p.id = Number(p.id || p._id);
  p.price = Number(p.price) || 0;
  p.oldPrice = p.oldPrice ? Number(p.oldPrice) : null;
  p.rating = p.rating !== undefined ? Number(p.rating) : 5.0;
  p.reviewsCount = Number(p.reviewsCount) || 0;
  p.flashSale = Boolean(p.flashSale);
  p.flashDiscount = Number(p.flashDiscount) || 0;
  p.soldCount = Number(p.soldCount) || 0;
  p.specs = p.specs || {};
  p.colors = Array.isArray(p.colors) ? p.colors : [];
  p.storageOptions = Array.isArray(p.storageOptions) ? p.storageOptions : [];
  p.gallery = Array.isArray(p.gallery) ? p.gallery : (p.image ? [p.image] : []);
  p.reviews = Array.isArray(p.reviews) ? p.reviews : [];
  delete p._id;
  return p;
}

// Chuyển đổi dòng Order từ SQL
function mapOrderFromSql(row) {
  if (!row) return null;
  return {
    id: Number(row.Id),
    orderCode: row.OrderCode,
    customerName: row.CustomerName,
    customerPhone: row.CustomerPhone,
    customerAddress: row.CustomerAddress,
    paymentMethod: row.PaymentMethod || 'COD',
    note: row.Note || '',
    items: tryParseJson(row.ItemsJson, []),
    subtotal: Number(row.Subtotal) || 0,
    discount: Number(row.Discount) || 0,
    total: Number(row.Total) || 0,
    status: row.Status || 'Chờ xác nhận',
    createdAt: row.CreatedAt
  };
}

// Chuyển đổi Order từ MongoDB
function mapOrderFromMongo(doc) {
  if (!doc) return null;
  const o = { ...doc };
  o.id = o.id || o._id;
  o.items = Array.isArray(o.items) ? o.items : [];
  o.subtotal = Number(o.subtotal) || 0;
  o.discount = Number(o.discount) || 0;
  o.total = Number(o.total) || 0;
  delete o._id;
  return o;
}

// Chuyển đổi User từ SQL
function mapUserFromSql(row) {
  if (!row) return null;
  return {
    id: Number(row.Id),
    username: row.Username,
    fullName: row.FullName || row.Username,
    email: row.Email || '',
    phone: row.Phone || '',
    role: row.Role || 'user',
    createdAt: row.CreatedAt
  };
}

// Chuyển đổi User từ Mongo
function mapUserFromMongo(doc) {
  if (!doc) return null;
  const u = { ...doc };
  u.id = u.id || u._id;
  delete u.password;
  delete u._id;
  return u;
}

module.exports = {
  tryParseJson,
  mapProductFromSql,
  mapProductFromMongo,
  mapOrderFromSql,
  mapOrderFromMongo,
  mapUserFromSql,
  mapUserFromMongo
};

