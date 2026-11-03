const express = require('express');
const router = express.Router();
const dbManager = require('../services/dbManager');

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const list = await dbManager.getUsers();
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải người dùng', error: err.message });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const user = await dbManager.loginUser(username, password);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName || user.username,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi đăng nhập', error: err.message });
  }
});

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, fullName, email, phone } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username và password là bắt buộc' });
    }

    const created = await dbManager.createUser({
      username,
      password,
      fullName: fullName || username,
      email: email || '',
      phone: phone || '',
      role: 'user'
    });

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      user: created
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi đăng ký tài khoản', error: err.message });
  }
});

// POST /api/users (Admin thêm user)
router.post('/', async (req, res) => {
  try {
    const { username, password, fullName, email, phone, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username và password là bắt buộc' });
    }

    const created = await dbManager.createUser({
      username,
      password,
      fullName: fullName || username,
      email: email || '',
      phone: phone || '',
      role: role || 'user'
    });

    res.status(201).json({
      success: true,
      message: 'Tạo người dùng thành công',
      user: created
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tạo người dùng', error: err.message });
  }
});

module.exports = router;

