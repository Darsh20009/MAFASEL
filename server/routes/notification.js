const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Notification = require('../models/Notification');

router.get('/', isAuthenticated, async (req, res) => {
  const notifications = await Notification.find({ userId: req.session.user._id }).sort({ createdAt: -1 }).limit(50);
  res.render('pages/notifications', { title: 'الإشعارات', notifications });
});

router.post('/read/:id', isAuthenticated, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ success: true });
});

router.post('/read-all', isAuthenticated, async (req, res) => {
  await Notification.updateMany({ userId: req.session.user._id, read: false }, { read: true });
  res.json({ success: true });
});

router.get('/unread-count', isAuthenticated, async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.session.user._id, read: false });
  res.json({ count });
});

module.exports = router;
