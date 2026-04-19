const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const { fireNotify, fireNotifyAdmins } = require('../utils/notifications');

var Insurance;
try { Insurance = require('../modules/medical/insurance.model'); } catch(e) {}

var SPECIALTY_PRICES = {
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

router.get('/', isAuthenticated, async (req, res) => {
  try {
    var userId = req.session.user._id;
    var role = req.session.user.role;
    var consultations;
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
    var { specialty, symptoms, priority } = req.body;
    var price = SPECIALTY_PRICES[specialty] || 30;
    var consultation = await Consultation.create({
      patient: req.session.user._id,
      specialty: specialty,
      symptoms: symptoms,
      priority: priority || 'medium',
      price: price,
      paymentStatus: 'unpaid'
    });
    res.redirect('/consultations/' + consultation._id + '/checkout');
  } catch (err) {
    req.session.error = 'حدث خطأ في إرسال الاستشارة';
    res.redirect('/consultations/new');
  }
});

router.get('/:id/checkout', isAuthenticated, async (req, res) => {
  try {
    var consultation = await Consultation.findById(req.params.id).populate('patient', 'name email phone');
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
    var insurance = null;
    if (Insurance) {
      insurance = await Insurance.findOne({ patient: req.session.user._id, status: 'active' });
    }
    res.render('pages/consultation-checkout', {
      title: 'دفع الاستشارة',
      consultation: consultation,
      insurance: insurance
    });
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/consultations');
  }
});

router.post('/:id/pay', isAuthenticated, async (req, res) => {
  try {
    var consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'الاستشارة غير موجودة' });
    }
    if (consultation.patient.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    if (consultation.paymentStatus === 'paid') {
      return res.json({ success: true, message: 'تم الدفع مسبقاً', redirect: '/consultations/' + consultation._id });
    }

    var { paymentMethod } = req.body;
    var validMethods = ['cash', 'insurance', 'card', 'apple_pay', 'health_card'];
    if (!paymentMethod || validMethods.indexOf(paymentMethod) === -1) {
      return res.status(400).json({ success: false, message: 'طريقة دفع غير صالحة' });
    }
    var discount = 0;

    if (paymentMethod === 'insurance' && Insurance) {
      var insurance = await Insurance.findOne({ patient: req.session.user._id, status: 'active' });
      if (!insurance) {
        return res.json({ success: false, message: 'لا يوجد تأمين نشط' });
      }
      if (!insurance.coverageDetails || !insurance.coverageDetails.consultations) {
        return res.json({ success: false, message: 'التأمين لا يغطي الاستشارات' });
      }
      var remaining = insurance.coverageAmount - insurance.usedAmount;
      discount = Math.min(consultation.price, remaining);
      if (discount <= 0) {
        return res.json({ success: false, message: 'تم استنفاد رصيد التأمين' });
      }
      insurance.usedAmount += discount;
      await insurance.save();
      consultation.insuranceId = insurance._id;
      consultation.insuranceDiscount = discount;
    }

    consultation.paymentMethod = paymentMethod;
    consultation.paymentStatus = 'paid';
    await consultation.save();

    await fireNotifyAdmins(req.app, 'استشارة جديدة مدفوعة', 'طلب استشارة جديدة مدفوعة من ' + req.session.user.name + ' — ' + consultation.specialty, {
      type: 'info', link: '/admin/consultations'
    });

    res.json({ success: true, message: 'تم الدفع بنجاح', redirect: '/consultations/' + consultation._id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في معالجة الدفع' });
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    var consultation = await Consultation.findById(req.params.id)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name specialty')
      .populate('messages.sender', 'name role');
    if (!consultation) {
      req.session.error = 'الاستشارة غير موجودة';
      return res.redirect('/consultations');
    }
    var uid = req.session.user._id.toString();
    var role = req.session.user.role;
    var isPatient = consultation.patient._id.toString() === uid;
    var isDoctor = consultation.doctor && consultation.doctor._id.toString() === uid;
    var isAdmin = role === 'admin' || role === 'moderator';
    if (!isPatient && !isDoctor && !isAdmin) {
      req.session.error = 'غير مصرح';
      return res.redirect('/consultations');
    }
    if (consultation.paymentStatus !== 'paid' && isPatient) {
      return res.redirect('/consultations/' + consultation._id + '/checkout');
    }
    res.render('pages/consultation-detail', { title: 'تفاصيل الاستشارة', consultation: consultation });
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/consultations');
  }
});

router.post('/:id/message', isAuthenticated, async (req, res) => {
  try {
    var consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ error: 'غير موجودة' });
    var uid = req.session.user._id.toString();
    var role = req.session.user.role;
    var isParty = consultation.patient.toString() === uid ||
      (consultation.doctor && consultation.doctor.toString() === uid);
    var isAdmin = role === 'admin' || role === 'moderator';
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
    var targetId = req.session.user._id.toString() === consultation.patient.toString()
      ? consultation.doctor : consultation.patient;
    if (targetId) {
      await fireNotify(req.app, targetId, 'رسالة جديدة', 'رسالة جديدة في الاستشارة من ' + req.session.user.name, {
        type: 'info', link: '/consultations/' + consultation._id
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إرسال الرسالة' });
  }
});

router.get('/api/prices', (req, res) => {
  res.json(SPECIALTY_PRICES);
});

module.exports = router;
