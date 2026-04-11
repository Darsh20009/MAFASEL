const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const { fireNotify, fireNotifyAdmins } = require('../utils/notifications');

router.get('/', isAuthenticated, async (req, res) => {
  const userId = req.session.user._id;
  const role = req.session.user.role;
  let consultations;
  if (role === 'doctor') {
    consultations = await Consultation.find({ doctor: userId }).populate('patient', 'name email phone').sort({ createdAt: -1 });
  } else {
    consultations = await Consultation.find({ patient: userId }).populate('doctor', 'name specialty').sort({ createdAt: -1 });
  }
  res.render('pages/consultations', { title: 'الاستشارات الطبية', consultations });
});

router.get('/new', isAuthenticated, (req, res) => {
  res.render('pages/consultation-new', { title: 'طلب استشارة جديدة' });
});

router.post('/new', isAuthenticated, async (req, res) => {
  try {
    const { specialty, symptoms, priority } = req.body;
    const consultation = await Consultation.create({
      patient: req.session.user._id,
      specialty,
      symptoms,
      priority: priority || 'medium'
    });
    await fireNotifyAdmins(req.app, 'استشارة جديدة', `طلب استشارة جديدة من ${req.session.user.name}`, {
      type: 'info', link: '/admin/consultations'
    });
    req.session.success = 'تم إرسال طلب الاستشارة بنجاح';
    res.redirect('/consultations');
  } catch (err) {
    req.session.error = 'حدث خطأ في إرسال الاستشارة';
    res.redirect('/consultations/new');
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
    consultation.messages.push({
      sender: req.session.user._id,
      text: req.body.text
    });
    if (consultation.status === 'assigned') {
      consultation.status = 'in_progress';
    }
    await consultation.save();
    const targetId = req.session.user._id.toString() === consultation.patient.toString()
      ? consultation.doctor : consultation.patient;
    if (targetId) {
      await fireNotify(req.app, targetId, 'رسالة جديدة', `رسالة جديدة في الاستشارة من ${req.session.user.name}`, {
        type: 'info', link: `/consultations/${consultation._id}`
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إرسال الرسالة' });
  }
});

module.exports = router;
