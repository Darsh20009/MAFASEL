const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('pages/landing', { title: 'مفاصل - منصة طبية متكاملة' });
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('pages/login', { title: 'تسجيل الدخول' });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      req.session.error = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      return res.redirect('/login');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      req.session.error = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      return res.redirect('/login');
    }
    user.lastLogin = new Date();
    await user.save();
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      darkMode: user.darkMode
    };
    req.session.success = `مرحباً ${user.name}`;
    if (user.role === 'admin' || user.role === 'moderator') {
      return res.redirect('/admin');
    }
    res.redirect('/dashboard');
  } catch (err) {
    req.session.error = 'حدث خطأ في تسجيل الدخول';
    res.redirect('/login');
  }
});

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('pages/register', { title: 'إنشاء حساب جديد' });
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, role } = req.body;
    if (password !== confirmPassword) {
      req.session.error = 'كلمتا المرور غير متطابقتين';
      return res.redirect('/register');
    }
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      req.session.error = 'البريد الإلكتروني مسجل مسبقاً';
      return res.redirect('/register');
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hash,
      role: role || 'patient',
      isVerified: true
    });
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      darkMode: user.darkMode
    };
    req.session.success = 'تم إنشاء حسابك بنجاح';
    res.redirect('/dashboard');
  } catch (err) {
    req.session.error = 'حدث خطأ في إنشاء الحساب';
    res.redirect('/register');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
