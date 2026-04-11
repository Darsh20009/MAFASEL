const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Consultation = require('../models/Consultation');
const Order = require('../models/Order');
const Insurance = require('../models/Insurance');
const Complaint = require('../models/Complaint');
const { fireNotify } = require('../utils/notifications');

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

module.exports = router;
