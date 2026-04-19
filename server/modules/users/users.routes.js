const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { isAuthenticated } = require('../../middleware/auth');
const User = require('./user.model');

router.get('/', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  res.render('pages/profile', { title: 'الملف الشخصي', profile: user });
});

router.post('/update', isAuthenticated, async (req, res) => {
  try {
    const {
      name, phone, gender, dateOfBirth,
      city, district, street, zipCode,
      bloodType, height, weight, allergies, chronicDiseases, medications, surgeries,
      emergencyName, emergencyPhone, emergencyRelation,
      companyName, commercialRegister, sector, employeeCount, contactPerson,
      specialty, licenseNumber, bio
    } = req.body;

    const update = {
      name: name.trim(),
      gender: gender || '',
    };

    if (phone) update.phone = phone.trim();
    if (dateOfBirth) update.dateOfBirth = new Date(dateOfBirth);
    if (req.body.nationalId) update.nationalId = req.body.nationalId.trim();

    update.address = {
      city: city || '',
      district: district || '',
      street: street || '',
      zipCode: zipCode || ''
    };

    update.medicalProfile = {
      bloodType: bloodType || '',
      height: height ? Number(height) : undefined,
      weight: weight ? Number(weight) : undefined,
      allergies: allergies ? allergies.split(',').map(a => a.trim()).filter(Boolean) : [],
      chronicDiseases: chronicDiseases ? chronicDiseases.split(',').map(d => d.trim()).filter(Boolean) : [],
      medications: medications ? medications.split(',').map(m => m.trim()).filter(Boolean) : [],
      surgeries: surgeries ? surgeries.split(',').map(s => s.trim()).filter(Boolean) : [],
      emergencyContact: {
        name: emergencyName || '',
        phone: emergencyPhone || '',
        relation: emergencyRelation || ''
      }
    };

    if (req.session.user.role === 'company') {
      update.companyProfile = {
        companyName: companyName || '',
        commercialRegister: commercialRegister || '',
        sector: sector || '',
        employeeCount: employeeCount ? Number(employeeCount) : 0,
        contactPerson: contactPerson || ''
      };
    }

    if (req.session.user.role === 'doctor') {
      update.specialty = specialty || '';
      update.licenseNumber = licenseNumber || '';
      update.bio = bio || '';
    }

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
    if (!user.password) {
      req.session.error = 'لا يمكن تغيير كلمة المرور - تم التسجيل عبر وسيلة خارجية';
      return res.redirect('/profile');
    }
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

router.get('/login-history', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  res.json({ history: user.loginHistory.slice(-20).reverse() });
});

router.get('/devices', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  res.json({ devices: user.devices.filter(d => d.isActive) });
});

router.post('/devices/:id/revoke', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  const device = user.devices.id(req.params.id);
  if (device) {
    device.isActive = false;
    await user.save();
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

module.exports = router;
