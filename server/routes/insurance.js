const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Insurance = require('../models/Insurance');
const { fireNotify } = require('../utils/notifications');

router.get('/', isAuthenticated, async (req, res) => {
  const insurances = await Insurance.find({ patient: req.session.user._id }).sort({ createdAt: -1 });
  res.render('pages/insurance', { title: 'التأمين الصحي', insurances });
});

router.post('/apply', isAuthenticated, async (req, res) => {
  try {
    const { company, type } = req.body;
    const policyNumber = 'INS-' + Date.now().toString(36).toUpperCase();
    const insurance = await Insurance.create({
      patient: req.session.user._id,
      company,
      policyNumber,
      type: type || 'basic',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      coverageAmount: type === 'vip' ? 500000 : type === 'premium' ? 200000 : 50000,
      status: 'pending'
    });

    await fireNotify(req.app, req.session.user._id, 'طلب تأمين', `تم استلام طلب التأمين رقم ${policyNumber}`, {
      type: 'info', link: '/insurance'
    });

    req.session.success = 'تم إرسال طلب التأمين بنجاح';
    res.redirect('/insurance');
  } catch (err) {
    req.session.error = 'حدث خطأ في إرسال الطلب';
    res.redirect('/insurance');
  }
});

module.exports = router;
