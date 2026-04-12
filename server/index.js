const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');

const ROOT_DIR = path.join(__dirname, '..');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';

app.set('view engine', 'ejs');
app.set('views', path.join(ROOT_DIR, 'client', 'views'));

app.use(compression());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(ROOT_DIR, 'public')));
app.use('/uploads', express.static(path.join(ROOT_DIR, 'uploads')));

const isProduction = process.env.NODE_ENV === 'production';

let sessionConfig = {
  secret: process.env.SESSION_SECRET || 'mafasel-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
};

if (isProduction) {
  app.set('trust proxy', 1);
}

const sessionMiddleware = session(sessionConfig);
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  res.locals.inviteLink = req.session.inviteLink || null;
  req.session.success = null;
  req.session.error = null;
  req.session.inviteLink = null;
  next();
});

app.locals.io = io;

const { i18nMiddleware } = require('./middleware/i18n');
app.use(i18nMiddleware);

const { setupPassport } = require('./modules/auth/passport.setup');
setupPassport(app);

const authRoutes = require('./modules/auth/auth.routes');
const dashboardRoutes = require('./modules/users/dashboard.routes');
const usersRoutes = require('./modules/users/users.routes');
const medicalRoutes = require('./modules/medical/medical.routes');
const insuranceRoutes = require('./modules/medical/insurance.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const supportRoutes = require('./modules/admin/support.routes');
const meetingsRoutes = require('./modules/meetings/meetings.routes');
const medicalProfileRoutes = require('./modules/medical/medical-profile.routes');
const emailRoutes = require('./modules/email/email.routes');
const mapsRoutes = require('./modules/maps/maps.routes');
const schedulerRoutes = require('./modules/scheduler/scheduler.routes');
const seoRoutes = require('./modules/seo/seo.routes');
const { seoDefaults, medicalPlatformSchema } = require('./modules/seo/seo.middleware');

app.use(seoDefaults);
app.use(medicalPlatformSchema);
app.use('/', seoRoutes);

app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/profile', usersRoutes);
app.use('/consultations', medicalRoutes);
app.use('/insurance', insuranceRoutes);
app.use('/pharmacy', require('./modules/pharmacy/pharmacy.routes'));
app.use('/chat', chatRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/ai', aiRoutes);
app.use('/complaints', settingsRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/support', supportRoutes);
app.use('/meetings', meetingsRoutes);
app.use('/medical-profile', medicalProfileRoutes);
app.use('/email', emailRoutes);
app.use('/maps', mapsRoutes);
app.use('/scheduler', schedulerRoutes);
app.use('/health-card', require('./modules/users/health-card.routes'));
app.use('/physiotherapy', require('./modules/physiotherapy/physiotherapy.routes'));

app.get('/presentation', (req, res) => {
  res.render('pages/presentation', { title: 'مفاصل - العرض التقديمي', user: req.session.user || null, success: null, error: null });
});

app.get('/offline', (req, res) => {
  res.render('pages/offline', { title: 'غير متصل', user: req.session.user || null, success: null, error: null });
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
  const sess = socket.request.session;
  if (sess && sess.user) {
    connectedUsers.set(sess.user._id, socket.id);
    socket.join(`user_${sess.user._id}`);
    if (sess.user.role === 'admin' || sess.user.role === 'moderator') {
      socket.join('admins');
    }
  }

  socket.on('typing', (data) => {
    if (sess && sess.user && data.roomId) {
      socket.broadcast.emit('chat_typing', {
        roomId: data.roomId,
        userId: sess.user._id.toString()
      });
    }
  });

  socket.on('disconnect', () => {
    if (sess && sess.user) {
      connectedUsers.delete(sess.user._id);
    }
  });
});

app.locals.connectedUsers = connectedUsers;

const requestStats = { total: 0, errors: 0, startTime: Date.now(), responseTimes: [] };
app.locals.requestStats = requestStats;

app.use((req, res, next) => {
  const start = Date.now();
  requestStats.total++;
  res.on('finish', () => {
    const ms = Date.now() - start;
    requestStats.responseTimes.push(ms);
    if (requestStats.responseTimes.length > 200) requestStats.responseTimes.shift();
    if (res.statusCode >= 500) requestStats.errors++;
  });
  next();
});

app.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  const avg = requestStats.responseTimes.length
    ? Math.round(requestStats.responseTimes.reduce((a, b) => a + b, 0) / requestStats.responseTimes.length)
    : 0;
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    db: app.locals.dbConnected ? 'connected' : 'disconnected',
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB'
    },
    requests: {
      total: requestStats.total,
      errors: requestStats.errors,
      avgResponseMs: avg
    },
    sockets: io.engine.clientsCount,
    version: process.env.npm_package_version || '1.0.0',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'الصفحة غير موجودة' });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  if (!res.headersSent) {
    res.status(500).render('pages/error', { title: 'خطأ في الخادم', error: err.message });
  }
});

async function connectDB() {
  if (!MONGODB_URI) {
    console.log('No MONGODB_URI set, skipping DB connection');
    return false;
  }
  try {
    const opts = {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    };
    if (MONGODB_URI.includes('mongodb+srv') || MONGODB_URI.includes('mongodb.net')) {
      opts.tls = true;
      opts.tlsAllowInvalidCertificates = true;
    }
    await mongoose.connect(MONGODB_URI, opts);
    console.log('MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    return false;
  }
}

async function startServer() {
  const dbConnected = await connectDB();

  if (dbConnected) {
    try {
      const User = require('./modules/users/user.model');
      const adminExists = await User.findOne({ role: 'admin' });
      if (!adminExists) {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('admin123', 10);
        await User.create({
          name: 'مدير النظام',
          email: 'admin@mafasel.com',
          phone: '0500000000',
          password: hash,
          role: 'admin',
          isVerified: true
        });
        console.log('Default admin created: admin@mafasel.com / admin123');
      }

      const Location = require('./modules/maps/location.model');
      const Specialist = require('./modules/physiotherapy/specialist.model');
      const ptCenterCount = await Location.countDocuments({ type: 'physiotherapy_center' });
      if (ptCenterCount === 0) {
        const demoCenters = [
          { name: 'مركز مفاصل للعلاج الطبيعي', type: 'physiotherapy_center', lat: 24.7136, lng: 46.6753, address: 'شارع العليا', city: 'الرياض', phone: '0112345678', workingHours: '8:00 ص - 10:00 م', description: 'مركز متخصص في العلاج الطبيعي وإعادة التأهيل', services: ['علاج عظام', 'تأهيل عصبي', 'إصابات رياضية', 'علاج أطفال'], rating: 4.8, reviewCount: 124 },
          { name: 'مركز الحركة للتأهيل', type: 'physiotherapy_center', lat: 21.4858, lng: 39.1925, address: 'حي الروضة', city: 'جدة', phone: '0126789012', workingHours: '9:00 ص - 9:00 م', description: 'متخصصون في تأهيل الإصابات الرياضية والعظام', services: ['إصابات رياضية', 'علاج عظام', 'تأهيل بعد العمليات'], rating: 4.5, reviewCount: 87 },
          { name: 'عيادات التعافي للعلاج الطبيعي', type: 'physiotherapy_center', lat: 24.4539, lng: 39.6142, address: 'طريق الملك عبدالعزيز', city: 'المدينة المنورة', phone: '0148901234', workingHours: '8:00 ص - 8:00 م', description: 'خدمات علاج طبيعي شاملة مع أحدث الأجهزة', services: ['علاج طبيعي عام', 'علاج تنفسي', 'تأهيل عصبي', 'علاج أطفال'], rating: 4.6, reviewCount: 65 },
          { name: 'مركز اللياقة والتأهيل', type: 'physiotherapy_center', lat: 26.4207, lng: 50.0888, address: 'حي الخبر الشمالية', city: 'الخبر', phone: '0133456789', workingHours: '7:30 ص - 10:00 م', description: 'مركز رياضي وتأهيلي متكامل', services: ['إصابات رياضية', 'تأهيل بعد العمليات', 'علاج آلام الظهر'], rating: 4.3, reviewCount: 42 },
          { name: 'مجمع الشفاء للعلاج الطبيعي', type: 'physiotherapy_center', lat: 24.6333, lng: 46.7167, address: 'حي النسيم', city: 'الرياض', phone: '0115678901', workingHours: '8:00 ص - 11:00 م', description: 'أكبر مركز متخصص بالعلاج الطبيعي في الرياض', services: ['علاج عظام', 'تأهيل عصبي', 'إصابات رياضية', 'علاج تنفسي', 'علاج أطفال', 'زيارات منزلية'], rating: 4.9, reviewCount: 203 }
        ];
        for (const c of demoCenters) { await Location.create(c); }
        console.log('Demo physiotherapy centers created');
      }

      const specCount = await Specialist.countDocuments();
      if (specCount === 0) {
        const demoSpecs = [
          { name: 'د. محمد الشهري', title: 'أخصائي علاج طبيعي أول', specializations: ['علاج عظام ومفاصل', 'إصابات رياضية'], experience: 12, bio: 'حاصل على الدكتوراه في العلاج الطبيعي من جامعة الملك سعود. خبرة واسعة في علاج إصابات الملاعب والتأهيل الرياضي.', gender: 'male', city: 'الرياض', centerName: 'مركز مفاصل للعلاج الطبيعي', phone: '0551234567', licenseNumber: 'PT-1234', consultationFee: 150, sessionFee: 300, rating: 4.9, reviewCount: 89, acceptsOnline: true, acceptsHomeVisit: true, isVerified: true, isActive: true },
          { name: 'د. سارة القحطاني', title: 'أخصائية تأهيل عصبي', specializations: ['تأهيل عصبي', 'علاج أطفال'], experience: 8, bio: 'متخصصة في التأهيل العصبي للأطفال والكبار. ماجستير علاج طبيعي عصبي.', gender: 'female', city: 'جدة', centerName: 'مركز الحركة للتأهيل', phone: '0557654321', licenseNumber: 'PT-5678', consultationFee: 200, sessionFee: 350, rating: 4.8, reviewCount: 67, acceptsOnline: true, acceptsHomeVisit: false, isVerified: true, isActive: true },
          { name: 'أ. عبدالله العتيبي', title: 'أخصائي إصابات رياضية', specializations: ['إصابات رياضية', 'تأهيل بعد العمليات'], experience: 6, bio: 'أخصائي معتمد في الإصابات الرياضية. عمل مع عدة أندية رياضية سعودية.', gender: 'male', city: 'الرياض', centerName: 'مركز مفاصل للعلاج الطبيعي', phone: '0559876543', licenseNumber: 'PT-9012', consultationFee: 100, sessionFee: 250, rating: 4.7, reviewCount: 45, acceptsOnline: true, acceptsHomeVisit: true, isVerified: true, isActive: true },
          { name: 'د. نورة الدوسري', title: 'أخصائية علاج طبيعي للأطفال', specializations: ['علاج أطفال', 'تأهيل عصبي'], experience: 10, bio: 'متخصصة في علاج الشلل الدماغي وتأخر النمو الحركي عند الأطفال.', gender: 'female', city: 'الرياض', centerName: 'مجمع الشفاء للعلاج الطبيعي', phone: '0553456789', licenseNumber: 'PT-3456', consultationFee: 180, sessionFee: 320, rating: 4.9, reviewCount: 112, acceptsOnline: true, acceptsHomeVisit: true, isVerified: true, isActive: true },
          { name: 'أ. فهد المالكي', title: 'أخصائي علاج آلام الظهر', specializations: ['علاج آلام الظهر والرقبة', 'علاج عظام ومفاصل'], experience: 7, bio: 'خبرة في علاج آلام العمود الفقري والديسك باستخدام أحدث التقنيات.', gender: 'male', city: 'الخبر', centerName: 'مركز اللياقة والتأهيل', phone: '0556789012', licenseNumber: 'PT-7890', consultationFee: 120, sessionFee: 280, rating: 4.5, reviewCount: 38, acceptsOnline: false, acceptsHomeVisit: true, isVerified: true, isActive: true },
          { name: 'د. ريم السبيعي', title: 'أخصائية علاج تنفسي', specializations: ['علاج تنفسي', 'علاج طبيعي عام'], experience: 9, bio: 'متخصصة في التأهيل التنفسي وعلاج مشاكل الصدر والرئة.', gender: 'female', city: 'المدينة المنورة', centerName: 'عيادات التعافي للعلاج الطبيعي', phone: '0554567890', licenseNumber: 'PT-4567', consultationFee: 160, sessionFee: 300, rating: 4.6, reviewCount: 29, acceptsOnline: true, acceptsHomeVisit: false, isVerified: true, isActive: true }
        ];
        for (const s of demoSpecs) { await Specialist.create(s); }
        console.log('Demo specialists created');
      }

      if (process.env.NODE_ENV !== 'production') {
      const demoAccounts = [
        { name: 'مريض تجريبي', email: 'patient@mafasel.com', phone: '0500000001', role: 'patient' },
        { name: 'د. أحمد الطبيب', email: 'doctor@mafasel.com', phone: '0500000002', role: 'doctor' },
        { name: 'صيدلي تجريبي', email: 'pharmacist@mafasel.com', phone: '0500000003', role: 'pharmacist' },
        { name: 'مشرف تجريبي', email: 'moderator@mafasel.com', phone: '0500000004', role: 'moderator' },
        { name: 'شركة تجريبية', email: 'company@mafasel.com', phone: '0500000005', role: 'company' },
        { name: 'موظف تجريبي', email: 'employee@mafasel.com', phone: '0500000006', role: 'employee' },
        { name: 'وكيل تأمين تجريبي', email: 'insurance@mafasel.com', phone: '0500000007', role: 'insurance_agent' }
      ];
      const bcryptSeed = require('bcryptjs');
      const demoHash = await bcryptSeed.hash('demo123', 10);
      for (let di = 0; di < demoAccounts.length; di++) {
        const acc = demoAccounts[di];
        const exists = await User.findOne({ email: acc.email });
        if (!exists) {
          try {
            await User.create({ ...acc, password: demoHash, isVerified: true, nationalId: '200000000' + (di + 1) });
            console.log('Demo account created: ' + acc.email);
          } catch(e) { console.log('Demo skip: ' + acc.email + ' - ' + e.message); }
        }
      }
      }

      const Banner = require('./modules/admin/banner.model');
      const bannerCount = await Banner.countDocuments();
      if (bannerCount === 0) {
        const defaultBanners = [
          { title: 'منصة صحية رقمية متكاملة', filePath: '/uploads/banners/banner1.png', type: 'image', order: 0, isActive: true },
          { title: 'وسهلناها عليك', filePath: '/uploads/banners/banner2.png', type: 'image', order: 1, isActive: true },
          { title: 'دايماً معاك - دعم فني متكامل', filePath: '/uploads/banners/banner3.png', type: 'image', order: 2, isActive: true },
          { title: 'حمل التطبيق الآن', filePath: '/uploads/banners/banner4.png', type: 'image', order: 3, isActive: true }
        ];
        await Banner.insertMany(defaultBanners);
        console.log('Default banners seeded (4 banners)');
      }

      const seedLocations = require('./modules/maps/seed-locations');
      await seedLocations();

      const MongoStore = require('connect-mongo');
      const mongoStore = MongoStore.create({
        client: mongoose.connection.getClient(),
        ttl: 24 * 60 * 60
      });
      sessionMiddleware.store = mongoStore;
    } catch (seedErr) {
      console.error('Seed error:', seedErr.message);
    }
  }

  app.locals.dbConnected = dbConnected;

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MAFASEL server running on port ${PORT}` + (dbConnected ? '' : ' (without DB)'));
  });
}

startServer();

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message, err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});
