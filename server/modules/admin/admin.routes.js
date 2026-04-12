const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../../middleware/auth');
const { uploadBanner } = require('../../middleware/upload');
const User = require('../users/user.model');
const Consultation = require('../medical/consultation.model');
const Order = require('../orders/order.model');
const Insurance = require('../medical/insurance.model');
const Complaint = require('../settings/complaint.model');
const Banner = require('./banner.model');
const Invitation = require('./invitation.model');
const AuditLog = require('../audit/audit.model');
const { fireNotify } = require('../notifications/notification.service');
const { sendEmail, buildEmailHTML } = require('../email/email.service');
const { logAudit } = require('../audit/audit.service');
const fs = require('fs');
const path = require('path');

router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  const [users, consultations, orders, complaints, insurances] = await Promise.all([
    User.countDocuments(),
    Consultation.countDocuments(),
    Order.countDocuments(),
    Complaint.countDocuments({ status: 'open' }),
    Insurance.countDocuments()
  ]);
  const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10);
  const recentConsultations = await Consultation.find().populate('patient', 'name').sort({ createdAt: -1 }).limit(10);
  const recentOrders = await Order.find().populate('patient', 'name').sort({ createdAt: -1 }).limit(10);

  res.render('pages/admin', {
    title: 'لوحة الإدارة',
    stats: { users, consultations, orders, complaints, insurances },
    recentUsers, recentConsultations, recentOrders
  });
});

router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  const filter = {};
  if (req.query.role && req.query.role !== 'all') filter.role = req.query.role;
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'suspended') filter.isActive = false;
  if (req.query.provider && req.query.provider !== 'all') filter.authProvider = req.query.provider;
  if (req.query.q) {
    const regex = { $regex: req.query.q, $options: 'i' };
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const [users, total, roleCounts] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])
  ]);
  const totalPages = Math.ceil(total / limit);
  const roleCountsMap = {};
  roleCounts.forEach(r => { roleCountsMap[r._id] = r.count; });
  res.render('pages/admin-users', { title: 'إدارة المستخدمين', users, total, page, totalPages, query: req.query, roleCountsMap });
});

router.post('/users/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, email, phone, password, role, nationalId } = req.body;
    if (!name || !password) {
      req.session.error = 'الاسم وكلمة المرور مطلوبان';
      return res.redirect('/admin/users');
    }
    if (password.length < 6) {
      req.session.error = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      return res.redirect('/admin/users');
    }
    if (!email && !phone) {
      req.session.error = 'يجب إدخال البريد الإلكتروني أو رقم الجوال على الأقل';
      return res.redirect('/admin/users');
    }
    const allowedRoles = ['doctor', 'pharmacist', 'moderator', 'company', 'employee', 'insurance_agent'];
    if (!allowedRoles.includes(role)) {
      req.session.error = 'دور غير صالح';
      return res.redirect('/admin/users');
    }
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        req.session.error = 'البريد الإلكتروني مستخدم بالفعل';
        return res.redirect('/admin/users');
      }
    }
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    let cleanPhone = phone ? phone.replace(/\D/g, '') : undefined;
    if (cleanPhone) {
      if (cleanPhone.startsWith('966')) cleanPhone = cleanPhone.slice(3);
      else if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
      if (!/^5\d{8}$/.test(cleanPhone)) {
        req.session.error = 'رقم الجوال غير صالح';
        return res.redirect('/admin/users');
      }
      const existingPhone = await User.findOne({ phone: cleanPhone });
      if (existingPhone) {
        req.session.error = 'رقم الجوال مستخدم بالفعل';
        return res.redirect('/admin/users');
      }
    }
    let cleanId = nationalId ? nationalId.replace(/\D/g, '') : undefined;
    if (cleanId) {
      if (!/^[12]\d{9}$/.test(cleanId)) {
        req.session.error = 'رقم الهوية غير صالح';
        return res.redirect('/admin/users');
      }
      const existingId = await User.findOne({ nationalId: cleanId });
      if (existingId) {
        req.session.error = 'رقم الهوية مستخدم بالفعل';
        return res.redirect('/admin/users');
      }
    }

    await User.create({
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phone: cleanPhone || undefined,
      nationalId: cleanId || undefined,
      password: hash,
      role,
      isVerified: true,
      authProvider: 'local'
    });
    req.session.success = 'تم إنشاء المستخدم بنجاح';
    logAudit({ req, action: 'إنشاء مستخدم', category: 'admin', details: `${name.trim()} (${role})`, targetType: 'User' });
  } catch (err) {
    console.error('Admin create user error:', err);
    req.session.error = 'حدث خطأ في إنشاء المستخدم';
    logAudit({ req, action: 'إنشاء مستخدم', category: 'admin', success: false, details: err.message });
  }
  res.redirect('/admin/users');
});

router.post('/users/:id/role', isAuthenticated, isAdmin, async (req, res) => {
  const allowedRoles = ['patient', 'doctor', 'pharmacist', 'company', 'employee', 'insurance_agent', 'moderator'];
  const newRole = req.body.role;
  if (newRole === 'admin' && req.session.user.role !== 'admin') {
    req.session.error = 'لا يمكنك تعيين دور المدير';
    return res.redirect('/admin/users');
  }
  if (newRole === 'admin') {
    allowedRoles.push('admin');
  }
  if (!allowedRoles.includes(newRole)) {
    req.session.error = 'دور غير صالح';
    return res.redirect('/admin/users');
  }
  const targetUser = await User.findById(req.params.id);
  if (targetUser && targetUser.role === 'admin' && req.session.user.role !== 'admin') {
    req.session.error = 'لا يمكنك تعديل دور مدير آخر';
    return res.redirect('/admin/users');
  }
  await User.findByIdAndUpdate(req.params.id, { role: newRole }, { runValidators: true });
  logAudit({ req, action: 'تغيير دور مستخدم', category: 'admin', details: `${targetUser.name}: ${targetUser.role} → ${newRole}`, targetId: targetUser._id, targetType: 'User' });
  req.session.success = 'تم تحديث الدور';
  res.redirect('/admin/users');
});

router.post('/users/:id/toggle', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) { req.session.error = 'المستخدم غير موجود'; return res.redirect('/admin/users'); }
    if (targetUser.role === 'admin') { req.session.error = 'لا يمكن تعليق حساب المدير'; return res.redirect('/admin/users'); }
    targetUser.isActive = !targetUser.isActive;
    await targetUser.save();
    const action = targetUser.isActive ? 'تفعيل حساب' : 'تعليق حساب';
    logAudit({ req, action, category: 'admin', details: `${targetUser.name} (${targetUser.role})`, targetId: targetUser._id, targetType: 'User' });
    req.session.success = targetUser.isActive ? 'تم تفعيل الحساب' : 'تم تعليق الحساب';
  } catch (err) {
    req.session.error = 'حدث خطأ';
  }
  const redirect = req.query.from === 'companies' ? '/admin/companies' : '/admin/users';
  res.redirect(redirect);
});

router.post('/users/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) { req.session.error = 'المستخدم غير موجود'; return res.redirect('/admin/users'); }
    if (targetUser.role === 'admin') { req.session.error = 'لا يمكن حذف حساب المدير'; return res.redirect('/admin/users'); }
    if (targetUser._id.toString() === req.session.user._id.toString()) { req.session.error = 'لا يمكنك حذف حسابك الخاص'; return res.redirect('/admin/users'); }
    await User.findByIdAndDelete(req.params.id);
    logAudit({ req, action: 'حذف مستخدم', category: 'admin', details: `${targetUser.name} (${targetUser.role})`, targetId: targetUser._id, targetType: 'User' });
    req.session.success = 'تم حذف المستخدم';
  } catch (err) {
    req.session.error = 'حدث خطأ في الحذف';
  }
  const redirect = req.query.from === 'companies' ? '/admin/companies' : '/admin/users';
  res.redirect(redirect);
});

router.get('/companies', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const filter = { role: 'company' };
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'suspended') filter.isActive = false;
    if (req.query.q) {
      const regex = { $regex: req.query.q, $options: 'i' };
      filter.$or = [{ name: regex }, { email: regex }, { 'companyProfile.companyName': regex }, { 'companyProfile.sector': regex }];
    }
    const companies = await User.find(filter).sort({ createdAt: -1 });
    const companyIds = companies.map(c => c._id);
    const employees = await User.find({ role: 'employee' }).select('name email phone isActive createdAt lastLogin').lean();
    res.render('pages/admin-companies', { title: 'إدارة الشركات', companies, employees, query: req.query });
  } catch (err) {
    console.error('Admin companies error:', err);
    req.session.error = 'حدث خطأ في تحميل الشركات';
    res.redirect('/admin');
  }
});

router.get('/monitor', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    const [totalUsers, totalConsultations, totalOrders, totalAuditLogs, activeUsers, suspendedUsers] = await Promise.all([
      User.countDocuments(),
      Consultation.countDocuments(),
      Order.countDocuments(),
      AuditLog.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false })
    ]);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [todayLogins, todayOrders, recentLogs] = await Promise.all([
      AuditLog.countDocuments({ category: 'auth', action: { $regex: 'دخول', $options: 'i' }, createdAt: { $gte: todayStart } }),
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      AuditLog.find().sort({ createdAt: -1 }).limit(15).lean()
    ]);
    const io = req.app.locals.io;
    const connectedSockets = io ? io.engine.clientsCount : 0;
    const uptimeH = Math.floor(uptime / 3600);
    const uptimeM = Math.floor((uptime % 3600) / 60);
    const uptimeS = Math.floor(uptime % 60);
    res.render('pages/admin-monitor', {
      title: 'مراقبة النظام',
      mem: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        heapPercent: Math.round((mem.heapUsed / mem.heapTotal) * 100)
      },
      uptimeH, uptimeM, uptimeS,
      connectedSockets,
      stats: { totalUsers, totalConsultations, totalOrders, totalAuditLogs, activeUsers, suspendedUsers, todayLogins, todayOrders },
      recentLogs,
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    console.error('Monitor page error:', err);
    req.session.error = 'حدث خطأ في تحميل لوحة المراقبة';
    res.redirect('/admin');
  }
});

router.get('/monitor/api/stats', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const mem = process.memoryUsage();
    const io = req.app.locals.io;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [totalUsers, todayLogins] = await Promise.all([
      User.countDocuments(),
      AuditLog.countDocuments({ category: 'auth', createdAt: { $gte: todayStart } })
    ]);
    res.json({
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        heapPercent: Math.round((mem.heapUsed / mem.heapTotal) * 100)
      },
      uptime: Math.round(process.uptime()),
      connectedSockets: io ? io.engine.clientsCount : 0,
      totalUsers,
      todayLogins
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب البيانات' });
  }
});

router.get('/consultations', isAuthenticated, isAdmin, async (req, res) => {
  const consultations = await Consultation.find().populate('patient', 'name').populate('doctor', 'name').sort({ createdAt: -1 });
  const doctors = await User.find({ role: 'doctor' });
  res.render('pages/admin-consultations', { title: 'إدارة الاستشارات', consultations, doctors });
});

router.post('/consultations/:id/assign', isAuthenticated, isAdmin, async (req, res) => {
  const consultation = await Consultation.findByIdAndUpdate(req.params.id, {
    doctor: req.body.doctorId,
    status: 'assigned'
  });
  await fireNotify(req.app, req.body.doctorId, 'استشارة جديدة', 'تم تعيين استشارة جديدة لك', {
    type: 'info', link: `/consultations/${req.params.id}`
  });
  await fireNotify(req.app, consultation.patient, 'تم تعيين طبيب', 'تم تعيين طبيب لاستشارتك', {
    type: 'success', link: `/consultations/${req.params.id}`
  });
  req.session.success = 'تم تعيين الطبيب';
  res.redirect('/admin/consultations');
});

router.get('/orders', isAuthenticated, isAdmin, async (req, res) => {
  const orders = await Order.find().populate('patient', 'name phone').sort({ createdAt: -1 });
  res.render('pages/admin-orders', { title: 'إدارة الطلبات', orders });
});

router.post('/orders/:id/status', isAuthenticated, isAdmin, async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
  const statusMap = {
    confirmed: 'تم تأكيد طلبك',
    preparing: 'جاري تحضير طلبك',
    delivering: 'طلبك في الطريق',
    delivered: 'تم توصيل طلبك',
    cancelled: 'تم إلغاء طلبك'
  };
  await fireNotify(req.app, order.patient, 'تحديث الطلب', statusMap[req.body.status] || 'تم تحديث حالة طلبك', {
    type: req.body.status === 'cancelled' ? 'error' : 'success',
    link: '/pharmacy'
  });
  req.session.success = 'تم تحديث حالة الطلب';
  res.redirect('/admin/orders');
});

router.get('/complaints', isAuthenticated, isAdmin, async (req, res) => {
  const complaints = await Complaint.find().populate('user', 'name email').sort({ createdAt: -1 });
  res.render('pages/admin-complaints', { title: 'إدارة الشكاوى', complaints });
});

router.post('/complaints/:id/respond', isAuthenticated, isAdmin, async (req, res) => {
  await Complaint.findByIdAndUpdate(req.params.id, {
    response: req.body.response,
    status: 'resolved',
    respondedBy: req.session.user._id
  });
  const complaint = await Complaint.findById(req.params.id);
  await fireNotify(req.app, complaint.user, 'رد على شكواك', 'تم الرد على شكواك', {
    type: 'success', link: '/complaints'
  });
  req.session.success = 'تم الرد على الشكوى';
  res.redirect('/admin/complaints');
});

router.get('/banners', isAuthenticated, isAdmin, async (req, res) => {
  const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
  res.render('pages/admin-banners', { title: 'إدارة البانرات', banners });
});

function sanitizeBannerLink(link) {
  if (!link) return '';
  const trimmed = link.trim();
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return '';
}

router.post('/banners', isAuthenticated, isAdmin, (req, res, next) => {
  uploadBanner.single('file')(req, res, (err) => {
    if (err) {
      req.session.error = err.message || 'حدث خطأ في رفع الملف';
      return res.redirect('/admin/banners');
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      req.session.error = 'يرجى اختيار ملف';
      return res.redirect('/admin/banners');
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const isVideo = ['.mp4', '.webm', '.ogg', '.mov'].includes(ext);

    const bannerCount = await Banner.countDocuments();
    await Banner.create({
      title: req.body.title || '',
      type: isVideo ? 'video' : 'image',
      filePath: '/uploads/banners/' + req.file.filename,
      link: sanitizeBannerLink(req.body.link),
      order: req.body.order ? parseInt(req.body.order) : bannerCount,
      isActive: true,
      createdBy: req.session.user._id
    });

    req.session.success = 'تم إضافة البانر بنجاح';
    res.redirect('/admin/banners');
  } catch (err) {
    console.error('Banner upload error:', err);
    req.session.error = 'حدث خطأ في رفع البانر';
    res.redirect('/admin/banners');
  }
});

router.post('/banners/:id/toggle', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (banner) {
      banner.isActive = !banner.isActive;
      await banner.save();
      req.session.success = banner.isActive ? 'تم تفعيل البانر' : 'تم إيقاف البانر';
    }
  } catch (err) {
    req.session.error = 'حدث خطأ في تحديث البانر';
  }
  res.redirect('/admin/banners');
});

router.post('/banners/:id/update', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await Banner.findByIdAndUpdate(req.params.id, {
      title: req.body.title || '',
      link: sanitizeBannerLink(req.body.link),
      order: req.body.order ? parseInt(req.body.order) : 0
    });
    req.session.success = 'تم تحديث البانر';
  } catch (err) {
    req.session.error = 'حدث خطأ في تحديث البانر';
  }
  res.redirect('/admin/banners');
});

router.post('/banners/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (banner) {
      const relativePath = banner.filePath.replace(/^\//, '');
      const filePath = path.join(__dirname, '../../..', relativePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await Banner.findByIdAndDelete(req.params.id);
      req.session.success = 'تم حذف البانر';
    }
  } catch (err) {
    req.session.error = 'حدث خطأ في حذف البانر';
  }
  res.redirect('/admin/banners');
});

router.get('/invitations', isAuthenticated, isAdmin, async (req, res) => {
  const invitations = await Invitation.find()
    .populate('createdBy', 'name')
    .populate('usedBy', 'name email')
    .sort({ createdAt: -1 });
  res.render('pages/admin-invitations', { title: 'روابط الدعوات', invitations });
});

router.post('/invitations/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { role, name, email, phone, message, maxUses, expiryDays } = req.body;
    const allowedRoles = ['doctor', 'pharmacist', 'moderator', 'company', 'employee', 'insurance_agent'];
    if (req.session.user.role === 'admin') allowedRoles.push('admin');
    if (!allowedRoles.includes(role)) {
      req.session.error = 'دور غير صالح';
      return res.redirect('/admin/invitations');
    }

    const days = parseInt(expiryDays) || 7;
    const invitation = await Invitation.create({
      role,
      name: name ? name.trim() : undefined,
      email: email ? email.toLowerCase().trim() : undefined,
      phone: phone ? phone.replace(/\D/g, '') : undefined,
      message: message || '',
      maxUses: parseInt(maxUses) || 1,
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      createdBy: req.session.user._id
    });

    const baseUrl = process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const inviteLink = `${baseUrl}/join/${invitation.token}`;

    if (email) {
      const roleLabels = { doctor: 'طبيب', pharmacist: 'صيدلي', moderator: 'مشرف', company: 'شركة', employee: 'موظف', insurance_agent: 'وكيل تأمين', admin: 'مدير' };
      const html = buildEmailHTML({
        title: 'دعوة للانضمام إلى مفاصل الطبيه',
        greeting: name ? `مرحباً ${name}` : 'مرحباً بك',
        body: `<p style="line-height:1.9;">تمت دعوتك للانضمام إلى منصة مفاصل الطبية بدور <strong>${roleLabels[role] || role}</strong>.</p>${message ? `<p style="line-height:1.9;color:#94a3b8;">${message}</p>` : ''}<p style="line-height:1.9;">الدعوة صالحة لمدة <strong>${days} أيام</strong>.</p>`,
        ctaText: 'سجل الآن',
        ctaLink: inviteLink,
        showVideo: true
      });
      await sendEmail({ to: email, subject: 'دعوة للانضمام إلى مفاصل الطبيه', html }).catch(() => {});
    }

    req.session.success = 'تم إنشاء رابط الدعوة بنجاح';
    req.session.inviteLink = inviteLink;
    res.redirect('/admin/invitations');
  } catch (err) {
    console.error('Create invitation error:', err);
    req.session.error = 'حدث خطأ في إنشاء الدعوة';
    res.redirect('/admin/invitations');
  }
});

router.post('/invitations/:id/cancel', isAuthenticated, isAdmin, async (req, res) => {
  await Invitation.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
  req.session.success = 'تم إلغاء الدعوة';
  res.redirect('/admin/invitations');
});

router.post('/invitations/:id/resend', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);
    if (!invitation || !invitation.email) {
      req.session.error = 'لا يمكن إعادة الإرسال';
      return res.redirect('/admin/invitations');
    }
    const baseUrl = process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const inviteLink = `${baseUrl}/join/${invitation.token}`;
    const roleLabels = { doctor: 'طبيب', pharmacist: 'صيدلي', moderator: 'مشرف', company: 'شركة', employee: 'موظف', insurance_agent: 'وكيل تأمين', admin: 'مدير' };
    const html = buildEmailHTML({
      title: 'تذكير: دعوة للانضمام إلى مفاصل الطبيه',
      greeting: invitation.name ? `مرحباً ${invitation.name}` : 'مرحباً بك',
      body: `<p style="line-height:1.9;">هذا تذكير بدعوتك للانضمام إلى منصة مفاصل الطبية بدور <strong>${roleLabels[invitation.role] || invitation.role}</strong>.</p>`,
      ctaText: 'سجل الآن',
      ctaLink: inviteLink,
      showVideo: true
    });
    await sendEmail({ to: invitation.email, subject: 'تذكير: دعوة للانضمام إلى مفاصل الطبيه', html });
    req.session.success = 'تم إعادة إرسال الدعوة';
  } catch (err) {
    req.session.error = 'فشل إعادة الإرسال';
  }
  res.redirect('/admin/invitations');
});

router.get('/audit', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
    if (req.query.action) filter.action = { $regex: req.query.action, $options: 'i' };
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.ip) filter.ip = req.query.ip;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to + 'T23:59:59');
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    const stats = await AuditLog.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayCount = await AuditLog.countDocuments({ createdAt: { $gte: todayStart } });

    res.render('pages/admin-audit', {
      title: 'سجل النشاطات',
      logs,
      total,
      todayCount,
      stats,
      page,
      totalPages,
      query: req.query
    });
  } catch (err) {
    console.error('Audit page error:', err);
    req.session.error = 'خطأ في تحميل السجل';
    res.redirect('/admin');
  }
});

router.get('/audit/api/export', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to + 'T23:59:59');
    }

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

    let csv = 'التاريخ,المستخدم,الدور,الإجراء,التصنيف,التفاصيل,IP,الجهاز,الحالة\n';
    for (const log of logs) {
      csv += `"${new Date(log.createdAt).toLocaleString('ar-SA')}","${log.userName}","${log.userRole}","${log.action}","${log.category}","${log.details}","${log.ip}","${log.device}","${log.success ? 'نجاح' : 'فشل'}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التصدير' });
  }
});

module.exports = router;
