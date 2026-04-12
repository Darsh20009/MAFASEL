const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const MedicalProfile = require('./medical-profile.model');
const MedicalLog = require('./medical-log.model');

async function getOrCreate(userId) {
  let profile = await MedicalProfile.findOne({ userId });
  if (!profile) profile = await MedicalProfile.create({ userId });
  return profile;
}

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const profile = await getOrCreate(req.session.user._id);
    const logs = await MedicalLog.find({ userId: req.session.user._id })
      .sort({ createdAt: -1 }).limit(50);
    res.render('pages/medical-profile', { title: 'الملف الطبي', profile, logs });
  } catch (err) {
    req.session.error = 'حدث خطأ في تحميل الملف الطبي';
    res.redirect('/dashboard');
  }
});

router.post('/update', isAuthenticated, async (req, res) => {
  try {
    const { bloodType, height, weight, smokingStatus, alcoholStatus,
            emergencyName, emergencyPhone, emergencyRelation } = req.body;
    const profile = await getOrCreate(req.session.user._id);
    if (bloodType !== undefined) profile.bloodType = bloodType;
    if (height) profile.height = Number(height);
    if (weight) profile.weight = Number(weight);
    if (smokingStatus !== undefined) profile.smokingStatus = smokingStatus;
    if (alcoholStatus !== undefined) profile.alcoholStatus = alcoholStatus;
    profile.emergencyContact = {
      name: emergencyName || '',
      phone: emergencyPhone || '',
      relation: emergencyRelation || ''
    };
    profile.lastUpdated = new Date();
    await profile.save();
    await MedicalLog.create({
      userId: req.session.user._id,
      type: 'profile_update',
      title: 'تحديث البيانات الأساسية',
      data: { bloodType, height, weight }
    });
    res.json({ success: true, message: 'تم تحديث البيانات بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في التحديث' });
  }
});

router.post('/allergies/add', isAuthenticated, async (req, res) => {
  try {
    const { name, severity, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'اسم الحساسية مطلوب' });
    const profile = await getOrCreate(req.session.user._id);
    profile.allergies.push({ name, severity: severity || 'moderate', notes });
    profile.lastUpdated = new Date();
    await profile.save();
    const item = profile.allergies[profile.allergies.length - 1];
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.delete('/allergies/:id', isAuthenticated, async (req, res) => {
  try {
    const profile = await getOrCreate(req.session.user._id);
    profile.allergies.pull(req.params.id);
    await profile.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/diseases/add', isAuthenticated, async (req, res) => {
  try {
    const { name, diagnosedAt, status, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'اسم المرض مطلوب' });
    const profile = await getOrCreate(req.session.user._id);
    profile.chronicDiseases.push({ name, diagnosedAt: diagnosedAt || undefined, status: status || 'active', notes });
    profile.lastUpdated = new Date();
    await profile.save();
    const item = profile.chronicDiseases[profile.chronicDiseases.length - 1];
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.delete('/diseases/:id', isAuthenticated, async (req, res) => {
  try {
    const profile = await getOrCreate(req.session.user._id);
    profile.chronicDiseases.pull(req.params.id);
    await profile.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/medications/add', isAuthenticated, async (req, res) => {
  try {
    const { name, dosage, frequency, startDate, endDate, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'اسم الدواء مطلوب' });
    const profile = await getOrCreate(req.session.user._id);
    profile.medications.push({
      name, dosage, frequency,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      isActive: true, notes
    });
    profile.lastUpdated = new Date();
    await profile.save();
    const item = profile.medications[profile.medications.length - 1];
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.patch('/medications/:id', isAuthenticated, async (req, res) => {
  try {
    const profile = await getOrCreate(req.session.user._id);
    const med = profile.medications.id(req.params.id);
    if (!med) return res.status(404).json({ success: false, message: 'الدواء غير موجود' });
    med.isActive = !med.isActive;
    await profile.save();
    res.json({ success: true, isActive: med.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.delete('/medications/:id', isAuthenticated, async (req, res) => {
  try {
    const profile = await getOrCreate(req.session.user._id);
    profile.medications.pull(req.params.id);
    await profile.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/history/add', isAuthenticated, async (req, res) => {
  try {
    const { type, title, date, facility, notes } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'العنوان مطلوب' });
    const profile = await getOrCreate(req.session.user._id);
    profile.history.push({ type: type || 'other', title, date: date || undefined, facility, notes });
    profile.lastUpdated = new Date();
    await profile.save();
    const item = profile.history[profile.history.length - 1];
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.delete('/history/:id', isAuthenticated, async (req, res) => {
  try {
    const profile = await getOrCreate(req.session.user._id);
    profile.history.pull(req.params.id);
    await profile.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.get('/logs', isAuthenticated, async (req, res) => {
  try {
    const logs = await MedicalLog.find({ userId: req.session.user._id })
      .sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

module.exports = router;
