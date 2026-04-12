const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../users/user.model');
const { sendTemplateEmail, templates, sendEmail } = require('../email/email.service');
const { logAudit } = require('../audit/audit.service');

function buildSessionUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    darkMode: user.darkMode,
    authProvider: user.authProvider
  };
}

async function logLogin(user, method, req) {
  try {
    const ua = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress || '';
    user.lastLogin = new Date();
    user.trackDevice(ua, ip);
    const parsed = user.parseDevice(ua, ip);
    user.loginHistory.push({
      method,
      action: 'login',
      ip,
      userAgent: ua,
      deviceName: parsed.deviceName
    });
    if (user.loginHistory.length > 50) {
      user.loginHistory = user.loginHistory.slice(-50);
    }
    await user.save();
    logAudit({ req, userId: user._id, userName: user.name, userRole: user.role, action: 'تسجيل دخول', category: 'auth', details: 'طريقة: ' + method });
  } catch (e) {}
}

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('pages/landing', { title: 'مفاصل - منصة طبية متكاملة', metaDescription: 'منصة مفاصل الطبية الرقمية المتكاملة في السعودية - استشارات طبية متخصصة، صيدلية إلكترونية، تأمين صحي، مساعد ذكي بالذكاء الاصطناعي، مواعيد وتذكيرات أدوية' });
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('pages/login', { title: 'تسجيل الدخول', metaDescription: 'تسجيل الدخول إلى منصة مفاصل الطبية - استشارات طبية، صيدلية، تأمين صحي', metaRobots: 'noindex, nofollow' });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.password) {
      req.session.error = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      logAudit({ req, action: 'محاولة دخول فاشلة', category: 'auth', details: 'بريد غير مسجل: ' + email, success: false, statusCode: 401 });
      return res.redirect('/login');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      req.session.error = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      logAudit({ req, userId: user._id, userName: user.name, userRole: user.role, action: 'محاولة دخول فاشلة', category: 'auth', details: 'كلمة مرور خاطئة', success: false, statusCode: 401 });
      return res.redirect('/login');
    }
    await logLogin(user, 'email', req);
    req.session.user = buildSessionUser(user);
    req.session.success = `مرحباً ${user.name}`;
    if (user.role === 'admin' || user.role === 'moderator') {
      return res.redirect('/admin');
    }
    res.redirect('/dashboard');
  } catch (err) {
    req.session.error = 'حدث خطأ في تسجيل الدخول';
    res.redirect('/login');
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: 'يرجى إدخال البريد الإلكتروني' });
    
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.json({ success: false, message: 'البريد الإلكتروني غير مسجل' });
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    
    user.resetCode = code;
    user.resetCodeExpires = expires;
    await user.save();
    
    try {
      const { buildEmailHTML, sendEmail } = require('../email/email.service');
      const html = buildEmailHTML({
        title: 'إعادة تعيين كلمة المرور',
        body: `<p style="line-height:1.9;">مرحباً <strong>${user.name}</strong>،</p>
               <p style="line-height:1.9;">رمز إعادة تعيين كلمة المرور الخاص بك هو:</p>
               <div style="text-align:center;margin:1.5rem 0;">
                 <span style="font-size:2rem;font-weight:700;letter-spacing:8px;color:#12a99b;font-family:monospace;">${code}</span>
               </div>
               <p style="line-height:1.9;color:#94a3b8;">هذا الرمز صالح لمدة 10 دقائق فقط. إذا لم تطلب إعادة التعيين، تجاهل هذا البريد.</p>`,
        ctaText: '',
        ctaLink: ''
      });
      await sendEmail({ to: user.email, subject: 'رمز إعادة تعيين كلمة المرور - مفاصل', html });
    } catch (emailErr) {
      console.error('Reset email error:', emailErr);
    }
    
    logAudit({ req, userId: user._id, userName: user.name, userRole: user.role, action: 'طلب إعادة تعيين كلمة المرور', category: 'auth' });
    res.json({ success: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.resetCode || !user.resetCodeExpires) {
      return res.json({ success: false, message: 'رمز غير صالح' });
    }
    if (new Date() > user.resetCodeExpires) {
      return res.json({ success: false, message: 'انتهت صلاحية الرمز' });
    }
    if (user.resetCode !== code) {
      return res.json({ success: false, message: 'الرمز غير صحيح' });
    }
    
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    
    res.json({ success: true, token });
  } catch (err) {
    res.json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!password || password.length < 6) {
      return res.json({ success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.resetToken || user.resetToken !== token) {
      return res.json({ success: false, message: 'رابط غير صالح' });
    }
    if (new Date() > user.resetTokenExpires) {
      return res.json({ success: false, message: 'انتهت صلاحية الرابط' });
    }
    
    user.password = await bcrypt.hash(password, 12);
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    
    logAudit({ req, userId: user._id, userName: user.name, userRole: user.role, action: 'إعادة تعيين كلمة المرور', category: 'auth' });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'حدث خطأ' });
  }
});

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('pages/register', { title: 'إنشاء حساب جديد', metaDescription: 'إنشاء حساب جديد في منصة مفاصل الطبية - انضم الآن واحصل على استشارات طبية وخدمات صحية متكاملة' });
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, role, nationalId } = req.body;
    if (password !== confirmPassword) {
      req.session.error = 'كلمتا المرور غير متطابقتين';
      return res.redirect('/register');
    }

    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const cleanId = nationalId ? nationalId.replace(/[^0-9]/g, '') : '';

    if (cleanPhone && (cleanPhone.length !== 9 || cleanPhone[0] !== '5')) {
      req.session.error = 'رقم الجوال يجب أن يبدأ بـ 5 ويتكون من 9 أرقام';
      return res.redirect('/register');
    }

    if (cleanId && (cleanId.length !== 10 || (cleanId[0] !== '1' && cleanId[0] !== '2'))) {
      req.session.error = 'رقم الهوية يجب أن يبدأ بـ 1 أو 2 ويتكون من 10 أرقام';
      return res.redirect('/register');
    }

    if (email) {
      const exists = await User.findOne({ email: email.toLowerCase().trim() });
      if (exists) {
        req.session.error = 'البريد الإلكتروني مسجل مسبقاً';
        return res.redirect('/register');
      }
    }
    if (cleanPhone) {
      const phoneExists = await User.findOne({ phone: cleanPhone });
      if (phoneExists) {
        req.session.error = 'رقم الجوال مسجل مسبقاً';
        return res.redirect('/register');
      }
    }
    if (cleanId) {
      const idExists = await User.findOne({ nationalId: cleanId });
      if (idExists) {
        req.session.error = 'رقم الهوية مسجل مسبقاً';
        return res.redirect('/register');
      }
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phone: cleanPhone || undefined,
      nationalId: cleanId || undefined,
      password: hash,
      role: 'patient',
      isVerified: true,
      authProvider: 'local'
    });
    await logLogin(user, 'register', req);
    req.session.user = buildSessionUser(user);
    req.session.success = 'تم إنشاء حسابك بنجاح';

    if (user.email) {
      sendTemplateEmail('welcome', user.email, user.name).catch(err => {
        console.error('Welcome email error:', err);
      });
    }

    res.redirect('/dashboard');
  } catch (err) {
    req.session.error = 'حدث خطأ في إنشاء الحساب';
    res.redirect('/register');
  }
});

router.post('/login/phone', async (req, res) => {
  try {
    const { phone } = req.body;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length !== 9 || cleanPhone[0] !== '5') {
      return res.status(400).json({ success: false, message: 'رقم الجوال يجب أن يبدأ بـ 5 ويتكون من 9 أرقام' });
    }
    let user = await User.findOne({ phone: cleanPhone });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    if (!user) {
      user = await User.create({
        name: 'مستخدم جديد',
        phone: cleanPhone,
        authProvider: 'phone',
        otp,
        otpExpiry,
        otpAttempts: 0,
        isVerified: false
      });
    } else {
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      user.otpAttempts = 0;
      await user.save();
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP-DEV] رمز التحقق لـ ${cleanPhone}: ${otp}`);
    }

    if (user.email) {
      const { html, subject } = templates.otp(otp, user.name || '');
      sendEmail({ to: user.email, subject, html }).catch(err => {
        console.error('OTP email error:', err);
      });
    }

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق',
      phone: cleanPhone,
      ...(process.env.NODE_ENV !== 'production' ? { demo_otp: otp } : {})
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في إرسال رمز التحقق' });
  }
});

router.post('/login/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const cleanPhone = phone.replace(/\s/g, '').trim();
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    if (user.otpAttempts >= 5) {
      return res.status(429).json({ success: false, message: 'تم تجاوز عدد المحاولات. حاول لاحقاً' });
    }
    if (!user.otp || user.otp !== otp) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صحيح' });
    }
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'انتهت صلاحية رمز التحقق' });
    }
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    user.isVerified = true;
    await logLogin(user, 'phone_otp', req);
    req.session.user = buildSessionUser(user);
    res.json({ success: true, message: `مرحباً ${user.name}`, redirect: '/dashboard' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في التحقق' });
  }
});

router.get('/api/auth/google', (req, res) => {
  const passport = req.app.locals.passport;
  if (!passport) {
    req.session.error = 'تسجيل الدخول عبر Google غير متاح حالياً';
    return res.redirect('/login');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
});

router.get('/api/auth/google/callback', (req, res, next) => {
  const passport = req.app.locals.passport;
  if (!passport) {
    req.session.error = 'تسجيل الدخول عبر Google غير متاح حالياً';
    return res.redirect('/login');
  }
  passport.authenticate('google', { session: false }, async (err, profile) => {
    if (err || !profile) {
      req.session.error = 'فشل تسجيل الدخول عبر Google';
      return res.redirect('/login');
    }
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.findOne({ email: profile.emails?.[0]?.value });
        if (user) {
          user.googleId = profile.id;
          if (!user.avatar && profile.photos?.[0]?.value) {
            user.avatar = profile.photos[0].value;
          }
          await user.save();
        } else {
          user = await User.create({
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value || '',
            authProvider: 'google',
            isVerified: true
          });
        }
      }
      await logLogin(user, 'google', req);
      req.session.user = buildSessionUser(user);
      req.session.success = `مرحباً ${user.name}`;
      res.redirect('/dashboard');
    } catch (e) {
      req.session.error = 'حدث خطأ في تسجيل الدخول';
      res.redirect('/login');
    }
  })(req, res, next);
});

function generateAppleClientSecret() {
  const jwt = require('jsonwebtoken');
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const privateKey = (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!teamId || !keyId || !clientId || !privateKey) return null;

  return jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '5m',
    audience: 'https://appleid.apple.com',
    issuer: teamId,
    subject: clientId,
    keyid: keyId
  });
}

router.get('/api/auth/apple', (req, res) => {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId || !process.env.APPLE_TEAM_ID || !process.env.APPLE_KEY_ID || !process.env.APPLE_PRIVATE_KEY) {
    req.session.error = 'تسجيل الدخول عبر Apple غير متاح حالياً';
    return res.redirect('/login');
  }

  const callbackURL = process.env.APPLE_CALLBACK_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://mafaseltech.com/api/auth/apple/callback'
      : 'http://localhost:5000/api/auth/apple/callback');

  const state = require('crypto').randomBytes(16).toString('hex');
  req.session.appleState = state;

  const params = new URLSearchParams({
    response_type: 'code id_token',
    response_mode: 'form_post',
    client_id: clientId,
    redirect_uri: callbackURL,
    scope: 'name email',
    state
  });

  res.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
});

router.post('/api/auth/apple/callback', async (req, res) => {
  try {
    const { code, id_token, user: userData, state } = req.body;

    if (state && req.session.appleState && state !== req.session.appleState) {
      req.session.error = 'فشل التحقق من الهوية عبر Apple';
      return res.redirect('/login');
    }
    req.session.appleState = null;

    if (!id_token && !code) {
      req.session.error = 'فشل تسجيل الدخول عبر Apple';
      return res.redirect('/login');
    }

    let appleId, email;

    if (id_token) {
      const appleSignin = require('apple-signin-auth');
      const applePayload = await appleSignin.verifyIdToken(id_token, {
        audience: process.env.APPLE_CLIENT_ID,
        ignoreExpiration: false
      });
      appleId = applePayload.sub;
      email = applePayload.email;
    } else if (code) {
      const clientSecret = generateAppleClientSecret();
      if (!clientSecret) throw new Error('Apple client secret generation failed');

      const callbackURL = process.env.APPLE_CALLBACK_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://mafaseltech.com/api/auth/apple/callback'
          : 'http://localhost:5000/api/auth/apple/callback');

      const https = require('https');
      const qs = require('querystring');
      const postData = qs.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackURL,
        client_id: process.env.APPLE_CLIENT_ID,
        client_secret: clientSecret
      });

      const tokenData = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'appleid.apple.com',
          path: '/auth/token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        };
        const reqHttp = https.request(options, (resp) => {
          let data = '';
          resp.on('data', (chunk) => { data += chunk; });
          resp.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(e); }
          });
        });
        reqHttp.on('error', reject);
        reqHttp.write(postData);
        reqHttp.end();
      });

      if (!tokenData.id_token) throw new Error('No id_token in Apple response');

      const appleSignin = require('apple-signin-auth');
      const applePayload = await appleSignin.verifyIdToken(tokenData.id_token, {
        audience: process.env.APPLE_CLIENT_ID,
        ignoreExpiration: false
      });
      appleId = applePayload.sub;
      email = applePayload.email;
    }

    if (!appleId) throw new Error('No Apple ID returned');

    let user = await User.findOne({ appleId });
    if (!user && email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      let name = 'مستخدم Apple';
      if (userData) {
        try {
          const parsed = typeof userData === 'string' ? JSON.parse(userData) : userData;
          if (parsed.name) {
            name = [parsed.name.firstName, parsed.name.lastName].filter(Boolean).join(' ') || name;
          }
        } catch (e) {}
      }
      user = await User.create({
        name,
        email,
        appleId,
        authProvider: 'apple',
        isVerified: true
      });
    } else {
      if (!user.appleId) {
        user.appleId = appleId;
        await user.save();
      }
    }

    await logLogin(user, 'apple', req);
    req.session.user = buildSessionUser(user);
    req.session.success = `مرحباً ${user.name}`;
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Apple Sign-In Error:', err);
    req.session.error = 'فشل تسجيل الدخول عبر Apple';
    res.redirect('/login');
  }
});

router.post('/auth/nafath/init', async (req, res) => {
  try {
    const { nationalId } = req.body;
    const cleanNatId = nationalId ? nationalId.replace(/[^0-9]/g, '') : '';
    if (!cleanNatId || cleanNatId.length !== 10 || (cleanNatId[0] !== '1' && cleanNatId[0] !== '2')) {
      return res.status(400).json({ success: false, message: 'رقم الهوية يجب أن يبدأ بـ 1 أو 2 ويتكون من 10 أرقام' });
    }
    const verificationCode = Math.floor(10 + Math.random() * 90).toString();
    const requestId = 'NAF-' + Date.now().toString(36).toUpperCase();

    req.session.nafathPending = {
      nationalId,
      verificationCode,
      requestId,
      expiresAt: Date.now() + 120000
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[NAFATH-DEV] طلب نفاذ - الهوية: ${nationalId} - رمز التحقق: ${verificationCode}`);
    }

    res.json({
      success: true,
      message: 'تم إرسال طلب التحقق عبر نفاذ',
      verificationCode,
      requestId,
      expiresIn: 120
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الاتصال بنفاذ' });
  }
});

router.post('/auth/nafath/verify', async (req, res) => {
  try {
    const { nationalId } = req.body;
    const pending = req.session.nafathPending;

    if (!pending || pending.nationalId !== nationalId) {
      return res.status(400).json({ success: false, message: 'لا يوجد طلب نفاذ' });
    }
    if (Date.now() > pending.expiresAt) {
      delete req.session.nafathPending;
      return res.status(400).json({ success: false, message: 'انتهت صلاحية الطلب' });
    }

    let user = await User.findOne({ nafathId: nationalId });
    if (!user) {
      user = await User.findOne({ nationalId: nationalId });
    }
    if (!user) {
      user = await User.create({
        name: 'مستخدم نفاذ',
        nafathId: nationalId,
        nationalId: nationalId,
        authProvider: 'nafath',
        isVerified: true
      });
    } else if (!user.nafathId) {
      user.nafathId = nationalId;
      user.nationalId = nationalId;
      await user.save();
    }

    delete req.session.nafathPending;
    await logLogin(user, 'nafath', req);
    req.session.user = buildSessionUser(user);

    res.json({
      success: true,
      message: `مرحباً ${user.name}`,
      redirect: '/dashboard'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في التحقق' });
  }
});

router.post('/auth/webauthn/register-options', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول أولاً' });
    }
    const { generateRegistrationOptions } = require('@simplewebauthn/server');
    const user = await User.findById(req.session.user._id);

    const rpName = 'منصة مفاصل';
    const rpID = (process.env.REPLIT_DEV_DOMAIN || 'localhost').split(':')[0];

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user._id.toString(),
      userName: user.email || user.phone || user.name,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: (user.webauthnCredentials || []).map(c => ({
        id: c.credentialId,
        type: 'public-key',
        transports: c.transports || []
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    user.webauthnChallenge = options.challenge;
    await user.save();

    res.json({ success: true, options });
  } catch (err) {
    console.error('WebAuthn register options error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/auth/webauthn/register-verify', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول أولاً' });
    }
    const { verifyRegistrationResponse } = require('@simplewebauthn/server');
    const user = await User.findById(req.session.user._id);

    const rpID = (process.env.REPLIT_DEV_DOMAIN || 'localhost').split(':')[0];
    const origin = `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost'}`;

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: user.webauthnChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      user.webauthnCredentials.push({
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: req.body.response?.transports || []
      });
      user.webauthnChallenge = undefined;
      await user.save();

      res.json({ success: true, message: 'تم تسجيل البصمة بنجاح' });
    } else {
      res.status(400).json({ success: false, message: 'فشل التحقق' });
    }
  } catch (err) {
    console.error('WebAuthn register verify error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/auth/webauthn/login-options', async (req, res) => {
  try {
    const { generateAuthenticationOptions } = require('@simplewebauthn/server');
    const rpID = (process.env.REPLIT_DEV_DOMAIN || 'localhost').split(':')[0];

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials: []
    });

    req.session.webauthnChallenge = options.challenge;
    res.json({ success: true, options });
  } catch (err) {
    console.error('WebAuthn login options error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/auth/webauthn/login-verify', async (req, res) => {
  try {
    const { verifyAuthenticationResponse } = require('@simplewebauthn/server');
    const rpID = (process.env.REPLIT_DEV_DOMAIN || 'localhost').split(':')[0];
    const origin = `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost'}`;

    const credentialIdB64 = req.body.id;
    const users = await User.find({ 'webauthnCredentials.credentialId': credentialIdB64 });

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على الحساب' });
    }
    const user = users[0];
    const cred = user.webauthnCredentials.find(c => c.credentialId === credentialIdB64);

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: req.session.webauthnChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(cred.credentialId, 'base64url'),
        credentialPublicKey: Buffer.from(cred.publicKey, 'base64url'),
        counter: cred.counter,
        transports: cred.transports || []
      }
    });

    if (verification.verified) {
      cred.counter = verification.authenticationInfo.newCounter;
      await user.save();

      delete req.session.webauthnChallenge;
      await logLogin(user, 'webauthn', req);
      req.session.user = buildSessionUser(user);

      res.json({ success: true, message: `مرحباً ${user.name}`, redirect: '/dashboard' });
    } else {
      res.status(400).json({ success: false, message: 'فشل التحقق' });
    }
  } catch (err) {
    console.error('WebAuthn login verify error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.get('/logout', async (req, res) => {
  const userId = req.session.user?._id;
  const userName = req.session.user?.name || '';
  const userRole = req.session.user?.role || '';
  if (userId) {
    try {
      const user = await User.findById(userId);
      if (user) {
        user.loginHistory.push({
          method: user.authProvider || 'local',
          action: 'logout',
          ip: req.ip || '',
          userAgent: req.headers['user-agent'] || ''
        });
        if (user.loginHistory.length > 50) {
          user.loginHistory = user.loginHistory.slice(-50);
        }
        await user.save();
      }
      logAudit({ req, userId, userName, userRole, action: 'تسجيل خروج', category: 'auth' });
    } catch (e) {}
  }
  req.session.destroy((err) => {
    res.clearCookie('connect.sid');
    if (userId) {
      const connectedUsers = req.app.locals.connectedUsers;
      if (connectedUsers) connectedUsers.delete(userId);
    }
    res.redirect('/');
  });
});

router.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

const Invitation = require('../admin/invitation.model');

router.get('/join/:token', async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token });
    if (!invitation || !invitation.isValid()) {
      return res.render('pages/join-expired', { title: 'دعوة غير صالحة' });
    }
    const roleLabels = { doctor: 'طبيب', pharmacist: 'صيدلي', moderator: 'مشرف', company: 'شركة', employee: 'موظف', insurance_agent: 'وكيل تأمين', admin: 'مدير' };
    res.render('pages/join', {
      title: 'سجل حسابك في مفاصل',
      invitation,
      roleLabel: roleLabels[invitation.role] || invitation.role
    });
  } catch (err) {
    res.render('pages/join-expired', { title: 'دعوة غير صالحة' });
  }
});

router.post('/join/:token', async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token });
    if (!invitation || !invitation.isValid()) {
      return res.render('pages/join-expired', { title: 'دعوة غير صالحة' });
    }

    const { name, email, phone, password, confirmPassword, nationalId } = req.body;
    if (!name || !password || password.length < 6) {
      req.session.error = 'الاسم وكلمة المرور (6 أحرف+) مطلوبان';
      return res.redirect(`/join/${req.params.token}`);
    }
    if (password !== confirmPassword) {
      req.session.error = 'كلمتا المرور غير متطابقتين';
      return res.redirect(`/join/${req.params.token}`);
    }
    if (!email && !phone) {
      req.session.error = 'يجب إدخال البريد أو رقم الجوال';
      return res.redirect(`/join/${req.params.token}`);
    }

    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        req.session.error = 'البريد الإلكتروني مستخدم بالفعل';
        return res.redirect(`/join/${req.params.token}`);
      }
    }

    let cleanPhone = phone ? phone.replace(/\D/g, '') : undefined;
    if (cleanPhone) {
      if (cleanPhone.startsWith('966')) cleanPhone = cleanPhone.slice(3);
      else if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
      if (!/^5\d{8}$/.test(cleanPhone)) {
        req.session.error = 'رقم الجوال غير صالح';
        return res.redirect(`/join/${req.params.token}`);
      }
      const existingPhone = await User.findOne({ phone: cleanPhone });
      if (existingPhone) {
        req.session.error = 'رقم الجوال مستخدم بالفعل';
        return res.redirect(`/join/${req.params.token}`);
      }
    }

    let cleanId = nationalId ? nationalId.replace(/\D/g, '') : undefined;
    if (cleanId && !/^[12]\d{9}$/.test(cleanId)) {
      req.session.error = 'رقم الهوية غير صالح (يجب 10 أرقام يبدأ بـ 1 أو 2)';
      return res.redirect(`/join/${req.params.token}`);
    }
    if (cleanId) {
      const existingId = await User.findOne({ nationalId: cleanId });
      if (existingId) {
        req.session.error = 'رقم الهوية مستخدم بالفعل';
        return res.redirect(`/join/${req.params.token}`);
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phone: cleanPhone || undefined,
      nationalId: cleanId || undefined,
      password: hash,
      role: invitation.role,
      isVerified: true,
      isActive: true,
      authProvider: 'local'
    });

    invitation.useCount += 1;
    invitation.usedBy = user._id;
    if (invitation.useCount >= invitation.maxUses) invitation.status = 'used';
    await invitation.save();

    if (email) {
      sendTemplateEmail('welcome', email, { userName: name.trim() }).catch(() => {});
    }

    req.session.user = buildSessionUser(user);
    req.session.success = 'تم إنشاء حسابك بنجاح! مرحباً بك في مفاصل';
    res.redirect('/');
  } catch (err) {
    console.error('Join error:', err);
    req.session.error = 'حدث خطأ في التسجيل';
    res.redirect(`/join/${req.params.token}`);
  }
});

module.exports = router;
