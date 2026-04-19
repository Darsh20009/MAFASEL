const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Complaint = require('../models/Complaint');
const { fireNotifyAdmins } = require('../utils/notifications');

router.get('/', isAuthenticated, async (req, res) => {
  const complaints = await Complaint.find({ user: req.session.user._id }).sort({ createdAt: -1 });
  const success = req.session.success; delete req.session.success;
  const error   = req.session.error;   delete req.session.error;
  res.render('pages/complaints', { title: 'الشكاوى والمتابعة', complaints, success, error });
});

router.post('/new', isAuthenticated, async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;
    await Complaint.create({
      user: req.session.user._id,
      subject,
      description,
      category: category || 'other',
      priority: priority || 'medium'
    });
    await fireNotifyAdmins(req.app, 'شكوى جديدة', `شكوى من ${req.session.user.name}: ${subject}`, {
      type: 'warning', link: '/admin/complaints'
    });
    req.session.success = 'تم إرسال الشكوى بنجاح';
    res.redirect('/complaints');
  } catch (err) {
    req.session.error = 'حدث خطأ في إرسال الشكوى';
    res.redirect('/complaints');
  }
});

module.exports = router;
