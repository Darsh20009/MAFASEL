const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { isAuthenticated } = require('../middleware/auth');
const User = require('../models/User');

router.get('/', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  res.render('pages/profile', { title: 'الملف الشخصي', profile: user });
});

router.post('/update', isAuthenticated, async (req, res) => {
  try {
    const { name, phone, bloodType, allergies, chronicDiseases } = req.body;
    const update = {
      name: name.trim(),
      phone: phone.trim(),
      'medicalProfile.bloodType': bloodType,
      'medicalProfile.allergies': allergies ? allergies.split(',').map(a => a.trim()) : [],
      'medicalProfile.chronicDiseases': chronicDiseases ? chronicDiseases.split(',').map(d => d.trim()) : []
    };
    await User.findByIdAndUpdate(req.session.user._id, update);
    req.session.user.name = name.trim();
    req.session.success = 'تم تحديث الملف الشخصي';
    res.redirect('/profile');
  } catch (err) {
    req.session.error = 'حدث خطأ في التحديث';
    res.redirect('/profile');
  }
});

router.post('/change-password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (newPassword !== confirmNewPassword) {
      req.session.error = 'كلمتا المرور غير متطابقتين';
      return res.redirect('/profile');
    }
    const user = await User.findById(req.session.user._id);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      req.session.error = 'كلمة المرور الحالية غير صحيحة';
      return res.redirect('/profile');
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    req.session.success = 'تم تغيير كلمة المرور بنجاح';
    res.redirect('/profile');
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/profile');
  }
});

router.post('/toggle-dark', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  user.darkMode = !user.darkMode;
  await user.save();
  req.session.user.darkMode = user.darkMode;
  res.json({ darkMode: user.darkMode });
});

module.exports = router;
