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
