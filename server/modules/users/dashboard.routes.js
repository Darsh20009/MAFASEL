const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const Consultation = require('../medical/consultation.model');
const Order = require('../orders/order.model');
const Notification = require('../notifications/notification.model');
const Insurance = require('../medical/insurance.model');
const Banner = require('../admin/banner.model');

const STATIC_BANNERS = [
  { type: 'image', filePath: '/uploads/banners/banner1.png', title: '', link: '', isActive: true, order: 0 },
  { type: 'image', filePath: '/uploads/banners/banner2.png', title: '', link: '', isActive: true, order: 1 },
  { type: 'image', filePath: '/uploads/banners/banner3.png', title: '', link: '', isActive: true, order: 2 }
];

async function getBanners() {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    return banners && banners.length > 0 ? banners : STATIC_BANNERS;
  } catch (e) {
    return STATIC_BANNERS;
  }
}

router.get('/', async (req, res) => {
  const banners = await getBanners();

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

  try {
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
    res.render('pages/dashboard', {
      title: 'الرئيسية',
      banners,
      consultations: [],
      orders: [],
      notifications: [],
      insurance: null,
      stats: { consultations: 0, orders: 0, unreadNotifs: 0, activeInsurance: false },
      isGuest: false
    });
  }
});

module.exports = router;
