const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const User = require('./user.model');
const QRCode = require('qrcode');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.redirect('/login');

    const qrData = JSON.stringify({
      type: 'mafasel_health_card',
      ref: user._id.toString(),
      v: 1
    });
    const qrImage = await QRCode.toDataURL(qrData, {
      width: 280,
      margin: 1,
      color: { dark: '#101d23', light: '#ffffff' }
    });

    res.render('pages/health-card', {
      title: 'البطاقة الصحية',
      user,
      qrImage
    });
  } catch (err) {
    console.error('Health card error:', err);
    res.redirect('/profile');
  }
});

router.get('/data', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const passData = {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.mafasel.healthcard',
      serialNumber: user._id.toString(),
      teamIdentifier: 'MAFASEL',
      organizationName: 'مفاصل',
      description: 'البطاقة الصحية - مفاصل',
      logoText: 'مفاصل',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(16, 29, 35)',
      generic: {
        primaryFields: [{ key: 'name', label: 'الاسم', value: user.name }],
        secondaryFields: [
          { key: 'blood', label: 'فصيلة الدم', value: user.medicalProfile?.bloodType || 'غير محدد' },
          { key: 'id', label: 'رقم الهوية', value: user.nationalId || 'غير محدد' }
        ],
        auxiliaryFields: [
          { key: 'phone', label: 'الجوال', value: user.phone || 'غير محدد' },
          { key: 'email', label: 'البريد', value: user.email || 'غير محدد' }
        ],
        backFields: [
          { key: 'allergies', label: 'الحساسية', value: (user.medicalProfile?.allergies || []).join('، ') || 'لا يوجد' },
          { key: 'chronic', label: 'أمراض مزمنة', value: (user.medicalProfile?.chronicDiseases || []).join('، ') || 'لا يوجد' },
          { key: 'medications', label: 'أدوية حالية', value: (user.medicalProfile?.medications || []).join('، ') || 'لا يوجد' },
          { key: 'emergency', label: 'طوارئ', value: user.medicalProfile?.emergencyContact?.name ? `${user.medicalProfile.emergencyContact.name} - ${user.medicalProfile.emergencyContact.phone}` : 'غير محدد' }
        ]
      }
    };
    res.json(passData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
