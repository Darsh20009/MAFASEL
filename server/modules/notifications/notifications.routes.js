const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const Notification = require('./notification.model');
const PushSubscription = require('./push-subscription.model');

router.get('/', isAuthenticated, async (req, res) => {
  const notifications = await Notification.find({ userId: req.session.user._id }).sort({ createdAt: -1 }).limit(50);
  res.render('pages/notifications', { title: 'الإشعارات', notifications });
});

router.post('/read/:id', isAuthenticated, async (req, res) => {
  const result = await Notification.updateOne(
    { _id: req.params.id, userId: req.session.user._id },
    { read: true }
  );
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: 'غير موجود' });
  }
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

router.get('/vapid-key', isAuthenticated, (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

router.post('/push/subscribe', isAuthenticated, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'بيانات الاشتراك غير صالحة' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.session.user._id,
        endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        userAgent: req.headers['user-agent'] || '',
        active: true
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ error: 'خطأ في الاشتراك' });
  }
});

router.post('/push/unsubscribe', isAuthenticated, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.findOneAndUpdate({ endpoint }, { active: false });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

module.exports = router;
