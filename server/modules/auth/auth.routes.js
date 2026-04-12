const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../users/user.model');
const { sendTemplateEmail, templates, sendEmail } = require('../email/email.service');

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
  } catch (e) {}
}

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('pages/landing', { title: 'مفاصل - منصة طبية متكاملة' });
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('pages/login', { title: 'تسجيل الدخول' });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.password) {
      req.session.error = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      return res.redirect('/login');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      req.session.error = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
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

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('pages/register', { title: 'إنشاء حساب جديد' });
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

module.exports = router;
