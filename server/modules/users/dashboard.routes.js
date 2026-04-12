const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const Consultation = require('../medical/consultation.model');
const Order = require('../orders/order.model');
const Notification = require('../notifications/notification.model');
const Insurance = require('../medical/insurance.model');
const Banner = require('../admin/banner.model');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const [consultations, orders, notifications, insurance, banners] = await Promise.all([
      Consultation.find({ patient: userId }).sort({ createdAt: -1 }).limit(5),
      Order.find({ patient: userId }).sort({ createdAt: -1 }).limit(5),
      Notification.find({ userId, read: false }).sort({ createdAt: -1 }).limit(10),
      Insurance.findOne({ patient: userId, status: 'active' }),
      Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 })
    ]);

    const stats = {
      consultations: await Consultation.countDocuments({ patient: userId }),
      orders: await Order.countDocuments({ patient: userId }),
      unreadNotifs: await Notification.countDocuments({ userId, read: false }),
      activeInsurance: insurance ? true : false
    };

    res.render('pages/dashboard', {
      title: 'لوحة التحكم',
      consultations, orders, notifications, insurance, stats, banners
    });
  } catch (err) {
    req.session.error = 'حدث خطأ في تحميل لوحة التحكم';
    res.redirect('/');
  }
});

module.exports = router;
