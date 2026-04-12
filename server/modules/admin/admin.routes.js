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

router.post('/users/:id/role', isAuthenticated, isAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { role: req.body.role });
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
