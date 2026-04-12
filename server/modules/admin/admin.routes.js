const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../../middleware/auth');
const { uploadBanner } = require('../../middleware/upload');
const User = require('../users/user.model');
const Consultation = require('../medical/consultation.model');
const Order = require('../orders/order.model');
const Insurance = require('../medical/insurance.model');
const Complaint = require('../settings/complaint.model');
const Banner = require('./banner.model');
const { fireNotify } = require('../notifications/notification.service');
const fs = require('fs');
const path = require('path');

router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  const [users, consultations, orders, complaints, insurances] = await Promise.all([
    User.countDocuments(),
    Consultation.countDocuments(),
    Order.countDocuments(),
    Complaint.countDocuments({ status: 'open' }),
    Insurance.countDocuments()
  ]);
  const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10);
  const recentConsultations = await Consultation.find().populate('patient', 'name').sort({ createdAt: -1 }).limit(10);
  const recentOrders = await Order.find().populate('patient', 'name').sort({ createdAt: -1 }).limit(10);

  res.render('pages/admin', {
    title: 'لوحة الإدارة',
    stats: { users, consultations, orders, complaints, insurances },
    recentUsers, recentConsultations, recentOrders
  });
});

router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.render('pages/admin-users', { title: 'إدارة المستخدمين', users });
});

router.post('/users/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, email, phone, password, role, nationalId } = req.body;
    if (!name || !password) {
      req.session.error = 'الاسم وكلمة المرور مطلوبان';
      return res.redirect('/admin/users');
    }
    if (password.length < 6) {
      req.session.error = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      return res.redirect('/admin/users');
    }
    if (!email && !phone) {
      req.session.error = 'يجب إدخال البريد الإلكتروني أو رقم الجوال على الأقل';
      return res.redirect('/admin/users');
    }
    const allowedRoles = ['doctor', 'pharmacist', 'moderator', 'company', 'employee', 'insurance_agent'];
    if (!allowedRoles.includes(role)) {
      req.session.error = 'دور غير صالح';
      return res.redirect('/admin/users');
    }
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        req.session.error = 'البريد الإلكتروني مستخدم بالفعل';
        return res.redirect('/admin/users');
      }
    }
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    let cleanPhone = phone ? phone.replace(/\D/g, '') : undefined;
    if (cleanPhone) {
      if (cleanPhone.startsWith('966')) cleanPhone = cleanPhone.slice(3);
      else if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
      if (!/^5\d{8}$/.test(cleanPhone)) {
        req.session.error = 'رقم الجوال غير صالح';
        return res.redirect('/admin/users');
      }
      const existingPhone = await User.findOne({ phone: cleanPhone });
      if (existingPhone) {
        req.session.error = 'رقم الجوال مستخدم بالفعل';
        return res.redirect('/admin/users');
      }
    }
    let cleanId = nationalId ? nationalId.replace(/\D/g, '') : undefined;
    if (cleanId) {
      if (!/^[12]\d{9}$/.test(cleanId)) {
        req.session.error = 'رقم الهوية غير صالح';
        return res.redirect('/admin/users');
      }
      const existingId = await User.findOne({ nationalId: cleanId });
      if (existingId) {
        req.session.error = 'رقم الهوية مستخدم بالفعل';
        return res.redirect('/admin/users');
      }
    }

    await User.create({
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phone: cleanPhone || undefined,
      nationalId: cleanId || undefined,
      password: hash,
      role,
      isVerified: true,
      authProvider: 'local'
    });
    req.session.success = 'تم إنشاء المستخدم بنجاح';
  } catch (err) {
    console.error('Admin create user error:', err);
    req.session.error = 'حدث خطأ في إنشاء المستخدم';
  }
  res.redirect('/admin/users');
});

router.post('/users/:id/role', isAuthenticated, isAdmin, async (req, res) => {
  const allowedRoles = ['patient', 'doctor', 'pharmacist', 'company', 'employee', 'insurance_agent', 'moderator'];
  const newRole = req.body.role;
  if (newRole === 'admin' && req.session.user.role !== 'admin') {
    req.session.error = 'لا يمكنك تعيين دور المدير';
    return res.redirect('/admin/users');
  }
  if (newRole === 'admin') {
    allowedRoles.push('admin');
  }
  if (!allowedRoles.includes(newRole)) {
    req.session.error = 'دور غير صالح';
    return res.redirect('/admin/users');
  }
  const targetUser = await User.findById(req.params.id);
  if (targetUser && targetUser.role === 'admin' && req.session.user.role !== 'admin') {
    req.session.error = 'لا يمكنك تعديل دور مدير آخر';
    return res.redirect('/admin/users');
  }
  await User.findByIdAndUpdate(req.params.id, { role: newRole }, { runValidators: true });
  req.session.success = 'تم تحديث الدور';
  res.redirect('/admin/users');
});

router.get('/consultations', isAuthenticated, isAdmin, async (req, res) => {
  const consultations = await Consultation.find().populate('patient', 'name').populate('doctor', 'name').sort({ createdAt: -1 });
  const doctors = await User.find({ role: 'doctor' });
  res.render('pages/admin-consultations', { title: 'إدارة الاستشارات', consultations, doctors });
});

router.post('/consultations/:id/assign', isAuthenticated, isAdmin, async (req, res) => {
  const consultation = await Consultation.findByIdAndUpdate(req.params.id, {
    doctor: req.body.doctorId,
    status: 'assigned'
  });
  await fireNotify(req.app, req.body.doctorId, 'استشارة جديدة', 'تم تعيين استشارة جديدة لك', {
    type: 'info', link: `/consultations/${req.params.id}`
  });
  await fireNotify(req.app, consultation.patient, 'تم تعيين طبيب', 'تم تعيين طبيب لاستشارتك', {
    type: 'success', link: `/consultations/${req.params.id}`
  });
  req.session.success = 'تم تعيين الطبيب';
  res.redirect('/admin/consultations');
});

router.get('/orders', isAuthenticated, isAdmin, async (req, res) => {
  const orders = await Order.find().populate('patient', 'name phone').sort({ createdAt: -1 });
  res.render('pages/admin-orders', { title: 'إدارة الطلبات', orders });
});

router.post('/orders/:id/status', isAuthenticated, isAdmin, async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
  const statusMap = {
    confirmed: 'تم تأكيد طلبك',
    preparing: 'جاري تحضير طلبك',
    delivering: 'طلبك في الطريق',
    delivered: 'تم توصيل طلبك',
    cancelled: 'تم إلغاء طلبك'
  };
  await fireNotify(req.app, order.patient, 'تحديث الطلب', statusMap[req.body.status] || 'تم تحديث حالة طلبك', {
    type: req.body.status === 'cancelled' ? 'error' : 'success',
    link: '/pharmacy'
  });
  req.session.success = 'تم تحديث حالة الطلب';
  res.redirect('/admin/orders');
});

router.get('/complaints', isAuthenticated, isAdmin, async (req, res) => {
  const complaints = await Complaint.find().populate('user', 'name email').sort({ createdAt: -1 });
  res.render('pages/admin-complaints', { title: 'إدارة الشكاوى', complaints });
});

router.post('/complaints/:id/respond', isAuthenticated, isAdmin, async (req, res) => {
  await Complaint.findByIdAndUpdate(req.params.id, {
    response: req.body.response,
    status: 'resolved',
    respondedBy: req.session.user._id
  });
  const complaint = await Complaint.findById(req.params.id);
  await fireNotify(req.app, complaint.user, 'رد على شكواك', 'تم الرد على شكواك', {
    type: 'success', link: '/complaints'
  });
  req.session.success = 'تم الرد على الشكوى';
  res.redirect('/admin/complaints');
});

router.get('/banners', isAuthenticated, isAdmin, async (req, res) => {
  const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
  res.render('pages/admin-banners', { title: 'إدارة البانرات', banners });
});

function sanitizeBannerLink(link) {
  if (!link) return '';
  const trimmed = link.trim();
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return '';
}

router.post('/banners', isAuthenticated, isAdmin, (req, res, next) => {
  uploadBanner.single('file')(req, res, (err) => {
    if (err) {
      req.session.error = err.message || 'حدث خطأ في رفع الملف';
      return res.redirect('/admin/banners');
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      req.session.error = 'يرجى اختيار ملف';
      return res.redirect('/admin/banners');
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const isVideo = ['.mp4', '.webm', '.ogg', '.mov'].includes(ext);

    const bannerCount = await Banner.countDocuments();
    await Banner.create({
      title: req.body.title || '',
      type: isVideo ? 'video' : 'image',
      filePath: '/uploads/banners/' + req.file.filename,
      link: sanitizeBannerLink(req.body.link),
      order: req.body.order ? parseInt(req.body.order) : bannerCount,
      isActive: true,
      createdBy: req.session.user._id
    });

    req.session.success = 'تم إضافة البانر بنجاح';
    res.redirect('/admin/banners');
  } catch (err) {
    console.error('Banner upload error:', err);
    req.session.error = 'حدث خطأ في رفع البانر';
    res.redirect('/admin/banners');
  }
});

router.post('/banners/:id/toggle', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (banner) {
      banner.isActive = !banner.isActive;
      await banner.save();
      req.session.success = banner.isActive ? 'تم تفعيل البانر' : 'تم إيقاف البانر';
    }
  } catch (err) {
    req.session.error = 'حدث خطأ في تحديث البانر';
  }
  res.redirect('/admin/banners');
});

router.post('/banners/:id/update', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await Banner.findByIdAndUpdate(req.params.id, {
      title: req.body.title || '',
      link: sanitizeBannerLink(req.body.link),
      order: req.body.order ? parseInt(req.body.order) : 0
    });
    req.session.success = 'تم تحديث البانر';
  } catch (err) {
    req.session.error = 'حدث خطأ في تحديث البانر';
  }
  res.redirect('/admin/banners');
});

router.post('/banners/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (banner) {
      const relativePath = banner.filePath.replace(/^\//, '');
      const filePath = path.join(__dirname, '../../..', relativePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await Banner.findByIdAndDelete(req.params.id);
      req.session.success = 'تم حذف البانر';
    }
  } catch (err) {
    req.session.error = 'حدث خطأ في حذف البانر';
  }
  res.redirect('/admin/banners');
});

module.exports = router;
