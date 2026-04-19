const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const Consultation = require('./consultation.model');
const Insurance = require('./insurance.model');
const User = require('../users/user.model');
const { fireNotify, fireNotifyAdmins } = require('../notifications/notification.service');

const SPECIALTY_PRICES = {
  'علاج طبيعي عام': 30,
  'علاج عظام ومفاصل': 40,
  'تأهيل بعد العمليات': 50,
  'إصابات رياضية': 45,
  'تأهيل عصبي': 55,
  'علاج أطفال': 35,
  'علاج تنفسي': 40,
  'علاج آلام الظهر والرقبة': 35,
  'طب عام': 25,
  'طب أسنان': 40,
  'طب عيون': 45,
  'طب أطفال': 30,
  'طب نساء وولادة': 50,
  'جراحة عامة': 60,
  'طب عظام': 50,
  'طب القلب': 55,
  'طب الجلدية': 35,
  'طب نفسي': 50,
  'طب باطني': 40,
  'أخرى': 30
};

router.get('/api/prices', (req, res) => {
  res.json(SPECIALTY_PRICES);
});

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const role = req.session.user.role;
    let consultations;
    if (role === 'doctor') {
      consultations = await Consultation.find({ doctor: userId }).populate('patient', 'name email phone').sort({ createdAt: -1 });
    } else {
      consultations = await Consultation.find({ patient: userId }).populate('doctor', 'name specialty').sort({ createdAt: -1 });
    }
    res.render('pages/consultations', { title: 'الاستشارات الطبية', consultations });
  } catch (err) {
    req.session.error = 'حدث خطأ في تحميل الاستشارات';
    res.redirect('/dashboard');
  }
});

router.get('/new', isAuthenticated, (req, res) => {
  res.render('pages/consultation-new', { title: 'طلب استشارة جديدة', prices: SPECIALTY_PRICES });
});

router.post('/new', isAuthenticated, async (req, res) => {
  try {
    const { specialty, symptoms, priority } = req.body;
    const price = SPECIALTY_PRICES[specialty] || 30;
    const consultation = await Consultation.create({
      patient: req.session.user._id,
      specialty,
      symptoms,
      priority: priority || 'medium',
      price,
      paymentStatus: 'unpaid'
    });

    if (req.session.user.email) {
      const { templates, sendEmail } = require('../email/email.service');
      const { html, subject } = templates.consultationBooked({
        patientName: req.session.user.name,
        specialty,
        doctorName: '',
        consultationId: consultation._id.toString().slice(-8).toUpperCase()
      });
      sendEmail({ to: req.session.user.email, subject, html }).catch(() => {});
    }

    res.redirect('/consultations/' + consultation._id + '/checkout');
  } catch (err) {
    req.session.error = 'حدث خطأ في إرسال الاستشارة';
    res.redirect('/consultations/new');
  }
});

router.get('/:id/checkout', isAuthenticated, async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id).populate('patient', 'name email phone');
    if (!consultation) {
      req.session.error = 'الاستشارة غير موجودة';
      return res.redirect('/consultations');
    }
    if (consultation.patient._id.toString() !== req.session.user._id.toString()) {
      req.session.error = 'غير مصرح';
      return res.redirect('/consultations');
    }
    if (consultation.paymentStatus === 'paid') {
      return res.redirect('/consultations/' + consultation._id);
    }
    let insurance = null;
    try {
      insurance = await Insurance.findOne({ patient: req.session.user._id, status: 'active' });
    } catch (e) {}
    res.render('pages/consultation-checkout', {
      title: 'دفع الاستشارة',
      consultation,
      insurance
    });
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/consultations');
  }
});

router.post('/:id/pay', isAuthenticated, async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'الاستشارة غير موجودة' });
    }
    if (consultation.patient.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    if (consultation.paymentStatus === 'paid') {
      return res.json({ success: true, message: 'تم الدفع مسبقاً', redirect: '/consultations/' + consultation._id });
    }

    const { paymentMethod } = req.body;
    const validMethods = ['cash', 'insurance', 'card', 'apple_pay', 'health_card'];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'طريقة دفع غير صالحة' });
    }

    if (paymentMethod === 'insurance') {
      try {
        const insurance = await Insurance.findOne({ patient: req.session.user._id, status: 'active' });
        if (!insurance) {
          return res.json({ success: false, message: 'لا يوجد تأمين نشط' });
        }
        if (!insurance.coverageDetails || !insurance.coverageDetails.consultations) {
          return res.json({ success: false, message: 'التأمين لا يغطي الاستشارات' });
        }
        const remaining = insurance.coverageAmount - insurance.usedAmount;
        const discount = Math.min(consultation.price, remaining);
        if (discount <= 0) {
          return res.json({ success: false, message: 'تم استنفاد رصيد التأمين' });
        }
        insurance.usedAmount += discount;
        await insurance.save();
        consultation.insuranceId = insurance._id;
        consultation.insuranceDiscount = discount;
      } catch (insErr) {
        return res.json({ success: false, message: 'خطأ في التحقق من التأمين' });
      }
    }

    consultation.paymentMethod = paymentMethod;
    consultation.paymentStatus = 'paid';
    await consultation.save();

    await fireNotifyAdmins(req.app, 'استشارة جديدة مدفوعة',
      `طلب استشارة مدفوعة من ${req.session.user.name} — ${consultation.specialty}`,
      { type: 'info', link: '/admin/consultations' }
    ).catch(() => {});

    res.json({ success: true, message: 'تم الدفع بنجاح', redirect: '/consultations/' + consultation._id });
  } catch (err) {
    console.error('Payment error:', err.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في معالجة الدفع' });
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name specialty')
      .populate('messages.sender', 'name role');
    if (!consultation) {
      req.session.error = 'الاستشارة غير موجودة';
      return res.redirect('/consultations');
    }
    const uid = req.session.user._id.toString();
    const role = req.session.user.role;
    const isPatient = consultation.patient._id.toString() === uid;
    const isDoctor = consultation.doctor && consultation.doctor._id.toString() === uid;
    const isAdmin = role === 'admin' || role === 'moderator';
    if (!isPatient && !isDoctor && !isAdmin) {
      req.session.error = 'غير مصرح';
      return res.redirect('/consultations');
    }
    if (consultation.paymentStatus !== 'paid' && isPatient) {
      return res.redirect('/consultations/' + consultation._id + '/checkout');
    }
    res.render('pages/consultation-detail', { title: 'تفاصيل الاستشارة', consultation });
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/consultations');
  }
});

router.post('/:id/message', isAuthenticated, async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ error: 'غير موجودة' });
    const uid = req.session.user._id.toString();
    const role = req.session.user.role;
    const isParty = consultation.patient.toString() === uid ||
      (consultation.doctor && consultation.doctor.toString() === uid);
    const isAdmin = role === 'admin' || role === 'moderator';
    if (!isParty && !isAdmin) {
      return res.status(403).json({ error: 'غير مصرح' });
    }
    consultation.messages.push({
      sender: req.session.user._id,
      text: req.body.text
    });
    if (consultation.status === 'assigned') {
      consultation.status = 'in_progress';
    }
    await consultation.save();
    const targetId = uid === consultation.patient.toString()
      ? consultation.doctor : consultation.patient;
    if (targetId) {
      await fireNotify(req.app, targetId, 'رسالة جديدة',
        `رسالة جديدة في الاستشارة من ${req.session.user.name}`,
        { type: 'info', link: `/consultations/${consultation._id}` }
      ).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إرسال الرسالة' });
  }
});

module.exports = router;
