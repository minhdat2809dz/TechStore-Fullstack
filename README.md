# 🚀 TECHSTORE PRO - DỰ ÁN FRONTEND TOÀN DIỆN KẾT NỐI SQL SERVER & MONGODB

Dự án website thương mại điện tử công nghệ cao cấp với đầy đủ tất cả các tính năng cho **Khách hàng** (Storefront) và **Quản trị viên** (Admin Hub), kết nối trực tiếp và đồng bộ thời gian thực với cả **Microsoft SQL Server 2025** và **MongoDB**.

---

## 🎯 CÁC TÍNH NĂNG NỔI BẬT

### 1. Dành Cho Khách Hàng (Storefront - `http://localhost:5000`)
- **Huy hiệu Database Thời Gian Thực (Live DB Status Badge)**: Hiển thị trạng thái kết nối trực tiếp tới `localhost\SQLEXPRESS2025` và `mongodb://localhost:27017`, kèm độ trễ ping và menu chuyển đổi nhanh Database Engine.
- **Tìm kiếm thông minh (Live Search Debounce)**: Tự động gợi ý kết quả sản phẩm khi gõ.
- **Phân loại & Bộ lọc đa năng**: Lọc theo danh mục (Điện thoại, Laptop, Tablet, Âm thanh, v.v.), theo hãng (Apple, Samsung, Sony, Dell...), theo khoảng giá tiền.
- **Sắp xếp linh hoạt**: Giá tăng dần, giá giảm dần, mới nhất, bán chạy nhất, đánh giá cao nhất.
- **Giờ vàng giá sốc (Flash Sale)**: Đồng hồ đếm ngược từng giây (Countdown Timer), thanh tiến độ số lượng đã bán.
- **Xem nhanh & Chi tiết sản phẩm (Product Detail Modal)**:
  - Album ảnh đa góc chụp với thumbnail switcher.
  - Chọn phiên bản dung lượng (128GB, 256GB, 512GB, 1TB) tự động cập nhật giá tương ứng.
  - Chọn bảng màu (Titan Sa Mạc, Đen, Trắng...).
  - Bảng thông số kỹ thuật chi tiết (Màn hình, Chipset, RAM, Pin...).
- **Giỏ hàng tiện lợi (Cart Drawer)**: Tăng/giảm số lượng, xóa sản phẩm, tính toán tự động phí ship.
- **Mã giảm giá ưu đãi**: Áp dụng mã voucher `GIAM10` (-10%), `TECHVIP` (-200.000đ), `FREESHIP` (Miễn phí vận chuyển).
- **Thanh toán & Đặt hàng (Checkout)**: Điền thông tin giao hàng, hỗ trợ COD, thẻ ATM và **tự động tạo mã VietQR động** kèm thông tin đơn hàng.
- **Tra cứu đơn hàng (Order Tracking)**: Nhập mã đơn hàng (ví dụ: `TECH-100001`) để xem trạng thái theo tiến trình thời gian thực.
- **Xác thực người dùng (Auth Modal)**: Đăng nhập / Đăng ký với nút điền nhanh tài khoản Admin và Khách hàng mẫu.

---

### 2. Dành Cho Quản Trị Viên (Admin Hub - `http://localhost:5000/admin.html`)
- **📊 Tổng Quan Dashboard**:
  - 4 thẻ thống kê: Tổng Doanh Thu (VND), Tổng Đơn Hàng, Tổng Sản Phẩm, Số Người Dùng.
  - Biểu đồ phân bổ cơ cấu danh mục sản phẩm.
  - Bảng các đơn hàng mới nhất với dropdown cập nhật trạng thái ngay tại chỗ.
- **📱 Quản Lý Sản Phẩm (Full CRUD)**:
  - Xem danh sách toàn bộ sản phẩm với ảnh, giá, tồn kho, số lượng đã bán.
  - **Thêm sản phẩm mới**: Đầy đủ trường dữ liệu (Tên, hãng, danh mục, giá bán, giá gốc, tồn kho, ảnh URL, mô tả, bật Flash Sale...).
  - **Sửa sản phẩm**: Tự động nạp thông tin cũ và lưu cập nhật đồng thời lên SQL Server và MongoDB.
  - **Xóa sản phẩm**: Có hộp thoại xác nhận an toàn.
- **📦 Quản Lý Đơn Hàng**:
  - Danh sách đơn hàng chi tiết.
  - Đổi trạng thái đơn hàng: `Chờ xác nhận` ➜ `Đang xử lý` ➜ `Đang giao hàng` ➜ `Đã hoàn thành` / `Đã hủy`.
  - Xem chi tiết đơn hàng: Địa chỉ, số điện thoại, danh sách sản phẩm đặt mua.
- **👥 Quản Lý Người Dùng**: Danh sách tài khoản, phân quyền Role (Admin / User), thêm tài khoản mới.
- **🏷️ Quản Lý Danh Mục**: Thêm, sửa, sắp xếp các danh mục ngành hàng.
- **🗄️ Trung Tâm Điều Khiển CSDL (SQL Server & MongoDB Center)**:
  - Thẻ giám sát **SQL Server 2025** (`localhost\SQLEXPRESS2025` - DB: `TechStoreDB`) với số lượng bản ghi các bảng Products, Categories, Orders, Users.
  - Thẻ giám sát **MongoDB** (`mongodb://127.0.0.1:27017` - DB: `TechStoreDB`) với số lượng document các collection products, categories, orders, users.
  - **Chuyển đổi Engine Mode**:
    - `DUAL`: Ghi đồng thời cả SQL Server & MongoDB (Khuyên dùng).
    - `SQL`: Chỉ dùng Microsoft SQL Server.
    - `MONGO`: Chỉ dùng MongoDB.
  - **Đồng bộ dữ liệu 1-Click**:
    - Nút `Đồng bộ từ SQL Server ➜ MongoDB`.
    - Nút `Đồng bộ từ MongoDB ➜ SQL Server`.
  - **Raw Inspector**: Xem trực tiếp dữ liệu thô (JSON) từ bất kỳ bảng SQL hoặc collection MongoDB nào ngay trên giao diện!

---

## 🏗️ CẤU TRÚC DỰ ÁN

```text
e:\DevOps\ktra/
├── .env                      # Cấu hình chuỗi kết nối SQL Server và MongoDB
├── .env.example              # Mẫu biến môi trường
├── package.json              # Khai báo dependencies (express, mssql, mongodb, cors...)
├── start.bat                 # Script chạy nhanh 1 click (tự động mở trình duyệt)
├── README.md                 # Tài liệu hướng dẫn chi tiết
├── server/
│   ├── config/
│   │   ├── sql.js            # Kết nối Microsoft SQL Server (SQLEXPRESS2025)
│   │   └── mongo.js          # Kết nối MongoDB (TechStoreDB)
│   ├── services/
│   │   └── dbManager.js      # Tầng xử lý CSDL thống nhất (Dual-Sync, Health, Sync)
│   ├── utils/
│   │   └── mapper.js         # Chuẩn hóa dữ liệu giữa SQL và MongoDB
│   ├── routes/
│   │   ├── products.js       # API Sản phẩm (CRUD)
│   │   ├── categories.js     # API Danh mục
│   │   ├── orders.js         # API Đơn hàng & Tra cứu
│   │   ├── users.js          # API Người dùng & Đăng nhập
│   │   ├── stats.js          # API Thống kê Dashboard
│   │   └── database.js       # API Quản trị & Đồng bộ CSDL
│   └── server.js             # Máy chủ Express phục vụ API & Frontend
└── public/
    ├── index.html            # Giao diện Khách hàng (Storefront)
    ├── admin.html            # Giao diện Quản trị viên (Admin Hub)
    ├── css/
    │   ├── style.css         # CSS Storefront
    │   └── admin.css         # CSS Admin
    └── js/
        ├── api.js            # Cầu nối gọi API & Toast thông báo
        ├── store.js          # Quản lý Giỏ hàng, Tài khoản, Wishlist
        ├── app.js            # Logic giao diện Khách hàng
        └── admin.js          # Logic giao diện Quản trị Admin
```

---

## ⚡ HƯỚNG DẪN KHỞI CHẠY DỰ ÁN

### Cách 1: Khởi chạy nhanh bằng File Batch (Khuyên Dùng)
Chỉ cần nhấp đúp vào file:
```
e:\DevOps\ktra\start.bat
```
Script sẽ tự động khởi động server và mở trình duyệt tại `http://localhost:5000`.

### Cách 2: Khởi chạy bằng lệnh Terminal
```powershell
cd e:\DevOps\ktra
npm start
```

Truy cập trên trình duyệt:
- **Trang Khách Hàng**: [http://localhost:5000](http://localhost:5000)
- **Trang Quản Trị Admin**: [http://localhost:5000/admin.html](http://localhost:5000/admin.html)
- **Kiểm Tra Trạng Thái DB**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 TÀI KHOẢN ĐĂNG NHẬP MẪU

| Vai trò | Tên đăng nhập | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin` | `123` | Toàn quyền quản trị Dashboard, SP, Đơn, DB |
| **Khách hàng (User)** | `user` | `123` | Mua sắm, đặt hàng, theo dõi đơn |

