const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const Consultation = require('../medical/consultation.model');
const Order = require('../orders/order.model');
const Notification = require('../notifications/notification.model');
const Insurance = require('../medical/insurance.model');
const Banner = require('../admin/banner.model');

router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });

    if (!req.session || !req.session.user) {
      return res.render('pages/dashboard', {
        title: 'الرئيسية',
        banners,
        consultations: [],
        orders: [],
        notifications: [],
        insurance: null,
        stats: { consultations: 0, orders: 0, unreadNotifs: 0, activeInsurance: false },
        isGuest: true
      });
    }

    const userId = req.session.user._id;
    const [consultations, orders, notifications, insurance] = await Promise.all([
      Consultation.find({ patient: userId }).sort({ createdAt: -1 }).limit(5),
      Order.find({ patient: userId }).sort({ createdAt: -1 }).limit(5),
      Notification.find({ userId, read: false }).sort({ createdAt: -1 }).limit(10),
      Insurance.findOne({ patient: userId, status: 'active' })
    ]);

    const stats = {
      consultations: await Consultation.countDocuments({ patient: userId }),
      orders: await Order.countDocuments({ patient: userId }),
      unreadNotifs: await Notification.countDocuments({ userId, read: false }),
      activeInsurance: insurance ? true : false
    };

    res.render('pages/dashboard', {
      title: 'لوحة التحكم',
      consultations, orders, notifications, insurance, stats, banners,
      isGuest: false
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    req.session.error = 'حدث خطأ في تحميل الصفحة';
    res.redirect('/');
  }
});

module.exports = router;
