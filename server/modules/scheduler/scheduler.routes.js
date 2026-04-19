const express = require('express');
const router = express.Router();
const Appointment = require('./appointment.model');
const Reminder = require('./reminder.model');
const User = require('../users/user.model');
const { isAuthenticated } = require('../../middleware/auth');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const role = req.session.user.role;
    const tab = req.query.tab || 'appointments';

    const appointmentFilter = role === 'doctor' ? { doctor: userId } : { patient: userId };
    const appointments = await Appointment.find(appointmentFilter)
      .populate('patient', 'name phone')
      .populate('doctor', 'name')
      .sort({ date: 1 });

    const reminders = await Reminder.find({ user: userId, isActive: true }).sort({ createdAt: -1 });

    const now = new Date();
    const upcoming = appointments.filter(a => new Date(a.date) >= now && a.status !== 'cancelled' && a.status !== 'completed');
    const past = appointments.filter(a => new Date(a.date) < now || a.status === 'completed' || a.status === 'cancelled');

    const doctors = role !== 'doctor' ? await User.find({ role: 'doctor', isActive: true }).select('name email phone') : [];

    res.render('pages/scheduler', {
      title: 'المواعيد والتذكيرات',
      appointments,
      upcoming,
      past,
      reminders,
      doctors,
      tab
    });
  } catch (err) {
    console.error('Scheduler error:', err);
    req.session.error = 'حدث خطأ في تحميل المواعيد';
    res.redirect('/dashboard');
  }
});

router.post('/appointments/add', isAuthenticated, async (req, res) => {
  try {
    const { doctorId, doctorName, specialty, date, time, duration, location, notes, reminders } = req.body;

    if (!date || !time) {
      req.session.error = 'يرجى تحديد التاريخ والوقت';
      return res.redirect('/scheduler');
    }

    const appointmentDate = new Date(date);
    if (appointmentDate < new Date(new Date().setHours(0, 0, 0, 0))) {
      req.session.error = 'لا يمكن حجز موعد في تاريخ سابق';
      return res.redirect('/scheduler');
    }

    const remindersList = [];
    if (reminders) {
      const arr = Array.isArray(reminders) ? reminders : [reminders];
      arr.forEach(r => {
        if (['15min', '30min', '1hour', '1day'].includes(r)) {
          remindersList.push({ type: r, sent: false });
        }
      });
    }

    await Appointment.create({
      patient: req.session.user._id,
      doctor: doctorId || undefined,
      doctorName: (doctorName || '').trim(),
      specialty: (specialty || '').trim(),
      date: appointmentDate,
      time: time.trim(),
      duration: parseInt(duration) || 30,
      location: (location || '').trim(),
      notes: (notes || '').trim(),
      reminders: remindersList
    });

    req.session.success = 'تم إضافة الموعد بنجاح';
    res.redirect('/scheduler');
  } catch (err) {
    console.error('Add appointment error:', err);
    req.session.error = 'حدث خطأ في إضافة الموعد';
    res.redirect('/scheduler');
  }
});

router.post('/appointments/:id/status', isAuthenticated, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'missed'];
    if (!validStatuses.includes(status)) {
      req.session.error = 'حالة غير صحيحة';
      return res.redirect('/scheduler');
    }

    const appt = await Appointment.findById(req.params.id);
    if (!appt) {
      req.session.error = 'الموعد غير موجود';
      return res.redirect('/scheduler');
    }

    const userId = req.session.user._id;
    if (appt.patient.toString() !== userId && (!appt.doctor || appt.doctor.toString() !== userId) && req.session.user.role !== 'admin') {
      req.session.error = 'غير مصرح';
      return res.redirect('/scheduler');
    }

    appt.status = status;
    await appt.save();
    req.session.success = 'تم تحديث حالة الموعد';
    res.redirect('/scheduler');
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/scheduler');
  }
});

router.post('/appointments/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) {
      req.session.error = 'الموعد غير موجود';
      return res.redirect('/scheduler');
    }
    const userId = req.session.user._id;
    if (appt.patient.toString() !== userId && req.session.user.role !== 'admin') {
      req.session.error = 'غير مصرح';
      return res.redirect('/scheduler');
    }
    await Appointment.findByIdAndDelete(req.params.id);
    req.session.success = 'تم حذف الموعد';
    res.redirect('/scheduler');
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/scheduler');
  }
});

router.post('/reminders/add', isAuthenticated, async (req, res) => {
  try {
    const { drug, dosage, times, days, startDate, endDate, notes } = req.body;

    if (!drug || !times) {
      req.session.error = 'يرجى إدخال اسم الدواء وأوقات التذكير';
      return res.redirect('/scheduler?tab=reminders');
    }

    const timesArr = Array.isArray(times) ? times.filter(t => t) : [times].filter(t => t);
    const daysArr = days ? (Array.isArray(days) ? days : [days]) : ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

    if (timesArr.length === 0) {
      req.session.error = 'يرجى تحديد وقت واحد على الأقل';
      return res.redirect('/scheduler?tab=reminders');
    }

    await Reminder.create({
      user: req.session.user._id,
      drug: drug.trim(),
      dosage: (dosage || '').trim(),
      times: timesArr,
      days: daysArr,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      notes: (notes || '').trim()
    });

    req.session.success = 'تم إضافة التذكير بنجاح';
    res.redirect('/scheduler?tab=reminders');
  } catch (err) {
    console.error('Add reminder error:', err);
    req.session.error = 'حدث خطأ في إضافة التذكير';
    res.redirect('/scheduler?tab=reminders');
  }
});

router.post('/reminders/:id/toggle', isAuthenticated, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({ _id: req.params.id, user: req.session.user._id });
    if (!reminder) {
      req.session.error = 'التذكير غير موجود';
      return res.redirect('/scheduler?tab=reminders');
    }
    reminder.isActive = !reminder.isActive;
    await reminder.save();
    req.session.success = reminder.isActive ? 'تم تفعيل التذكير' : 'تم إيقاف التذكير';
    res.redirect('/scheduler?tab=reminders');
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/scheduler?tab=reminders');
  }
});

router.post('/reminders/:id/delete', isAuthenticated, async (req, res) => {
  try {
    await Reminder.findOneAndDelete({ _id: req.params.id, user: req.session.user._id });
    req.session.success = 'تم حذف التذكير';
    res.redirect('/scheduler?tab=reminders');
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/scheduler?tab=reminders');
  }
});

router.post('/reminders/:id/taken', isAuthenticated, async (req, res) => {
  try {
    const { time } = req.body;
    const reminder = await Reminder.findOne({ _id: req.params.id, user: req.session.user._id });
    if (!reminder) {
      return res.json({ success: false, error: 'غير موجود' });
    }
    reminder.history.push({ date: new Date(), time: time || '', taken: true });
    await reminder.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: 'خطأ' });
  }
});

router.get('/api/today', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      $or: [{ patient: userId }, { doctor: userId }],
      date: { $gte: today, $lt: tomorrow },
      status: { $nin: ['cancelled'] }
    }).populate('doctor', 'name');

    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayDay = dayMap[new Date().getDay()];
    const reminders = await Reminder.find({
      user: userId,
      isActive: true,
      days: todayDay
    });

    res.json({ success: true, appointments, reminders });
  } catch (err) {
    res.json({ success: false, error: 'خطأ' });
  }
});

module.exports = router;
