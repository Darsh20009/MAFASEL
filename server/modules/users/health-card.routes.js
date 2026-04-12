const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const User = require('./user.model');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const CERTS_DIR = path.join(ROOT_DIR, 'apple-wallet-certs');
const PASS_TEMPLATE_DIR = path.join(CERTS_DIR, 'pass-template', 'mafasel.pass');

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

router.get('/wallet-pass', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { PKPass } = require('passkit-generator');

    const certPath = path.join(CERTS_DIR, 'pass.pem');
    const keyPath = path.join(CERTS_DIR, 'pass.key');
    const wwdrPath = path.join(CERTS_DIR, 'wwdr.pem');

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath) || !fs.existsSync(wwdrPath)) {
      return res.status(500).json({ error: 'Wallet certificates not configured' });
    }

    const signerCert = fs.readFileSync(certPath);
    const signerKey = fs.readFileSync(keyPath);
    const wwdr = fs.readFileSync(wwdrPath);

    const templateFiles = {};
    const templateDir = PASS_TEMPLATE_DIR;
    const files = fs.readdirSync(templateDir);
    for (const file of files) {
      if (file === 'pass.json') continue;
      templateFiles[file] = fs.readFileSync(path.join(templateDir, file));
    }

    const memberId = 'MFS-' + user._id.toString().slice(-8).toUpperCase();
    const allergies = (user.medicalProfile?.allergies || []).join('، ') || 'لا يوجد';
    const chronic = (user.medicalProfile?.chronicDiseases || []).join('، ') || 'لا يوجد';
    const medications = (user.medicalProfile?.medications || []).join('، ') || 'لا يوجد';
    const emergency = user.medicalProfile?.emergencyContact?.name
      ? `${user.medicalProfile.emergencyContact.name} (${user.medicalProfile.emergencyContact.relation || ''}) ${user.medicalProfile.emergencyContact.phone || ''}`
      : 'غير محدد';

    const pass = new PKPass(templateFiles, {
      signerCert,
      signerKey,
      wwdr
    }, {
      serialNumber: user._id.toString(),
      description: 'البطاقة الصحية - مفاصل',
      organizationName: 'مفاصل',
      passTypeIdentifier: 'pass.mafaseltech.com',
      teamIdentifier: 'V4K6RM59LS',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(16, 29, 35)',
      labelColor: 'rgb(18, 169, 155)',
      logoText: 'مفاصل'
    });

    pass.type = 'generic';

    pass.primaryFields.push({
      key: 'name',
      label: 'الاسم',
      value: user.name
    });

    pass.secondaryFields.push({
      key: 'blood',
      label: 'فصيلة الدم',
      value: user.medicalProfile?.bloodType || 'غير محدد'
    });

    pass.secondaryFields.push({
      key: 'nationalId',
      label: 'رقم الهوية',
      value: user.nationalId || 'غير محدد'
    });

    pass.auxiliaryFields.push({
      key: 'memberId',
      label: 'رقم العضوية',
      value: memberId
    });

    pass.auxiliaryFields.push({
      key: 'phone',
      label: 'الجوال',
      value: user.phone || 'غير محدد'
    });

    pass.backFields.push(
      { key: 'allergies', label: 'الحساسية', value: allergies },
      { key: 'chronic', label: 'أمراض مزمنة', value: chronic },
      { key: 'medications', label: 'أدوية حالية', value: medications },
      { key: 'emergency', label: 'جهة اتصال الطوارئ', value: emergency },
      { key: 'email', label: 'البريد الإلكتروني', value: user.email || 'غير محدد' }
    );

    pass.setBarcodes({
      format: 'PKBarcodeFormatQR',
      message: JSON.stringify({ type: 'mafasel_health_card', ref: user._id.toString(), v: 1 }),
      messageEncoding: 'iso-8859-1'
    });

    const buffer = pass.getAsBuffer();

    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename=mafasel-health-card.pkpass`,
      'Content-Length': buffer.length
    });
    res.send(buffer);
  } catch (err) {
    console.error('Wallet pass error:', err);
    res.status(500).json({ error: 'فشل في إنشاء بطاقة Wallet: ' + err.message });
  }
});

module.exports = router;
