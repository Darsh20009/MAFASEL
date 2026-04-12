const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const User = require('./user.model');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const CERTS_DIR = path.join(ROOT_DIR, 'apple-wallet-certs');
const PASS_TEMPLATE_DIR = path.join(CERTS_DIR, 'pass-template', 'mafasel.pass');

const HC_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
const TOKEN_EXPIRY = '24h';

function generateCardToken(userId) {
  return jwt.sign(
    { sub: userId.toString(), purpose: 'health_card_scan' },
    HC_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyCardToken(token) {
  try {
    const decoded = jwt.verify(token, HC_SECRET);
    if (decoded.purpose !== 'health_card_scan') return null;
    return decoded.sub;
  } catch(e) {
    return null;
  }
}

let MedicalProfile;
try {
  MedicalProfile = require('../medical/medical-profile.model');
} catch(e) {
  MedicalProfile = null;
}

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.redirect('/login');

    let medProfile = null;
    if (MedicalProfile) {
      medProfile = await MedicalProfile.findOne({ userId: user._id });
    }

    const token = generateCardToken(user._id);
    const scanUrl = `${req.protocol}://${req.get('host')}/health-card/scan/${user._id}?t=${token}`;

    const qrImage = await QRCode.toDataURL(scanUrl, {
      width: 300,
      margin: 1,
      color: { dark: '#101d23', light: '#ffffff' },
      errorCorrectionLevel: 'H'
    });

    const memberId = 'MFS-' + user._id.toString().slice(-8).toUpperCase();

    res.render('pages/health-card', {
      title: 'البطاقة الصحية',
      user,
      qrImage,
      memberId,
      medProfile,
      scanUrl
    });
  } catch (err) {
    console.error('Health card error:', err);
    res.redirect('/profile');
  }
});

router.get('/scan/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { t: token } = req.query;

    if (!token) {
      return res.render('pages/health-card-scan', {
        title: 'بطاقة غير صالحة',
        valid: false,
        error: 'رمز التحقق مطلوب',
        user: req.session?.user || null,
        patient: null,
        medProfile: null,
        memberId: null
      });
    }

    const verifiedUserId = verifyCardToken(token);
    if (!verifiedUserId || verifiedUserId !== userId) {
      return res.render('pages/health-card-scan', {
        title: 'بطاقة غير صالحة',
        valid: false,
        error: 'رمز التحقق غير صالح أو منتهي الصلاحية. يرجى طلب بطاقة جديدة من المستفيد.',
        user: req.session?.user || null,
        patient: null,
        medProfile: null,
        memberId: null
      });
    }

    const patient = await User.findById(userId).select('name phone nationalId gender dateOfBirth avatar medicalProfile address');
    if (!patient) {
      return res.render('pages/health-card-scan', {
        title: 'مستفيد غير موجود',
        valid: false,
        error: 'لم يتم العثور على بيانات المستفيد',
        user: req.session?.user || null,
        patient: null,
        medProfile: null,
        memberId: null
      });
    }

    let medProfile = null;
    if (MedicalProfile) {
      medProfile = await MedicalProfile.findOne({ userId: patient._id });
    }

    const memberId = 'MFS-' + patient._id.toString().slice(-8).toUpperCase();

    res.render('pages/health-card-scan', {
      title: 'البطاقة الصحية — ' + patient.name,
      valid: true,
      error: null,
      user: req.session?.user || null,
      patient,
      medProfile,
      memberId
    });
  } catch (err) {
    console.error('Health card scan error:', err);
    res.render('pages/health-card-scan', {
      title: 'خطأ',
      valid: false,
      error: 'حدث خطأ أثناء قراءة البطاقة',
      user: req.session?.user || null,
      patient: null,
      medProfile: null,
      memberId: null
    });
  }
});

router.get('/api/scan/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { t: token } = req.query;

    const verifiedUserId = verifyCardToken(token);
    if (!verifiedUserId || verifiedUserId !== userId) {
      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }

    const patient = await User.findById(userId).select('name phone nationalId gender dateOfBirth avatar medicalProfile address');
    if (!patient) {
      return res.status(404).json({ valid: false, error: 'Patient not found' });
    }

    let medProfile = null;
    if (MedicalProfile) {
      medProfile = await MedicalProfile.findOne({ userId: patient._id });
    }

    const memberId = 'MFS-' + patient._id.toString().slice(-8).toUpperCase();

    res.json({
      valid: true,
      memberId,
      patient: {
        name: patient.name,
        phone: patient.phone,
        nationalId: patient.nationalId ? patient.nationalId.slice(0,3) + '****' + patient.nationalId.slice(-3) : null,
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth,
        address: patient.address,
        bloodType: patient.medicalProfile?.bloodType || (medProfile?.bloodType) || null,
        height: medProfile?.height || patient.medicalProfile?.height || null,
        weight: medProfile?.weight || patient.medicalProfile?.weight || null
      },
      medicalSummary: {
        allergies: medProfile?.allergies?.map(a => ({ name: a.name, severity: a.severity })) || (patient.medicalProfile?.allergies || []).map(a => typeof a === 'string' ? { name: a } : a),
        chronicDiseases: medProfile?.chronicDiseases?.map(d => ({ name: d.name, status: d.status })) || (patient.medicalProfile?.chronicDiseases || []).map(d => typeof d === 'string' ? { name: d } : d),
        medications: medProfile?.medications?.filter(m => m.isActive !== false).map(m => ({ name: m.name, dosage: m.dosage, frequency: m.frequency })) || (patient.medicalProfile?.medications || []).map(m => typeof m === 'string' ? { name: m } : m),
        emergencyContact: medProfile?.emergencyContact || patient.medicalProfile?.emergencyContact || null,
        smokingStatus: medProfile?.smokingStatus || null
      }
    });
  } catch (err) {
    console.error('Health card API scan error:', err);
    res.status(500).json({ valid: false, error: 'Server error' });
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

    const token = generateCardToken(user._id);
    const scanUrl = `${req.protocol}://${req.get('host')}/health-card/scan/${user._id}?t=${token}`;

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
      message: scanUrl,
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
