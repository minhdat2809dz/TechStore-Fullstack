const sql = require('mssql');
require('dotenv').config();

// Cấu hình kết nối SQL Server (SQLEXPRESS2025)
const primaryConfig = {
  user: process.env.SQL_USER || 'sa',
  password: process.env.SQL_PASSWORD || 'TechStore@2026',
  server: process.env.SQL_SERVER || 'localhost',
  database: process.env.SQL_DATABASE || 'TechStoreDB',
  options: {
    instanceName: process.env.SQL_INSTANCE || 'SQLEXPRESS2025',
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 15,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const fallbackConfig = {
  ...primaryConfig,
  user: process.env.SQL_FALLBACK_USER || 'techstore_user',
  password: process.env.SQL_FALLBACK_PASSWORD || 'TechStore@2026'
};

let poolPromise = null;
let currentConfigUsed = 'sa';

async function initTablesIfNotExist(pool) {
  try {
    const tableInitSql = `
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Categories')
    BEGIN
      CREATE TABLE dbo.Categories (
        Id NVARCHAR(50) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Icon NVARCHAR(50) NULL,
        DisplayOrder INT NULL
      );
    END;

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
    BEGIN
      CREATE TABLE dbo.Products (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(255) NOT NULL,
        Brand NVARCHAR(100) NULL,
        Category NVARCHAR(50) NOT NULL,
        CategoryName NVARCHAR(100) NULL,
        Price BIGINT NOT NULL,
        OldPrice BIGINT NULL,
        Rating DECIMAL(3,2) DEFAULT 5.0,
        ReviewsCount INT DEFAULT 0,
        Image NVARCHAR(500) NULL,
        Badge NVARCHAR(50) NULL,
        Description NVARCHAR(MAX) NULL,
        Stock NVARCHAR(50) DEFAULT N'Sẵn hàng',
        FlashSale BIT DEFAULT 0,
        FlashDiscount INT DEFAULT 0,
        SoldCount INT DEFAULT 0,
        Gift NVARCHAR(255) NULL,
        SpecsJson NVARCHAR(MAX) NULL,
        ColorsJson NVARCHAR(MAX) NULL,
        StorageOptionsJson NVARCHAR(MAX) NULL,
        GalleryJson NVARCHAR(MAX) NULL,
        ReviewsJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
    END;

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
    BEGIN
      CREATE TABLE dbo.Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(50) UNIQUE NOT NULL,
        Password NVARCHAR(255) NOT NULL,
        FullName NVARCHAR(100) NULL,
        Email NVARCHAR(100) NULL,
        Phone NVARCHAR(20) NULL,
        Role NVARCHAR(20) DEFAULT 'user',
        CreatedAt DATETIME DEFAULT GETDATE()
      );
    END;

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Orders')
    BEGIN
      CREATE TABLE dbo.Orders (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        OrderCode NVARCHAR(50) UNIQUE NOT NULL,
        CustomerName NVARCHAR(100) NOT NULL,
        CustomerPhone NVARCHAR(20) NOT NULL,
        CustomerAddress NVARCHAR(255) NOT NULL,
        PaymentMethod NVARCHAR(50) DEFAULT 'COD',
        Note NVARCHAR(MAX) NULL,
        ItemsJson NVARCHAR(MAX) NOT NULL,
        Subtotal BIGINT NOT NULL,
        Discount BIGINT DEFAULT 0,
        Total BIGINT NOT NULL,
        Status NVARCHAR(50) DEFAULT N'Chờ xác nhận',
        CreatedAt DATETIME DEFAULT GETDATE()
      );
    END;
    `;
    await pool.request().query(tableInitSql);
  } catch (err) {
    console.warn('⚠️ Kiểm tra cấu trúc bảng SQL Server:', err.message);
  }
}

async function getSqlPool() {
  if (poolPromise) {
    return poolPromise;
  }

  poolPromise = (async () => {
    // Thử kết nối với tài khoản chính 'sa'
    try {
      console.log(`🔌 Kết nối SQL Server (${primaryConfig.server}\\${primaryConfig.options.instanceName} - DB: ${primaryConfig.database}) bằng user: ${primaryConfig.user}...`);
      const pool = await sql.connect(primaryConfig);
      console.log(`✅ SQL Server kết nối thành công với user '${primaryConfig.user}'!`);
      currentConfigUsed = primaryConfig.user;
      await initTablesIfNotExist(pool);
      return pool;
    } catch (errPrimary) {
      console.warn(`⚠️ User '${primaryConfig.user}' không thành công (${errPrimary.message}). Thử fallback '${fallbackConfig.user}'...`);
      try {
        const pool = await sql.connect(fallbackConfig);
        console.log(`✅ SQL Server kết nối thành công với fallback user '${fallbackConfig.user}'!`);
        currentConfigUsed = fallbackConfig.user;
        await initTablesIfNotExist(pool);
        return pool;
      } catch (errFallback) {
        poolPromise = null;
        console.error('❌ Cả 2 cấu hình kết nối SQL Server đều thất bại:', errFallback.message);
        throw errFallback;
      }
    }
  })();

  return poolPromise;
}

module.exports = {
  sql,
  getSqlPool,
  getSqlConfig: () => ({
    server: `${primaryConfig.server}\\${primaryConfig.options.instanceName}`,
    database: primaryConfig.database,
    user: currentConfigUsed
  })
};

