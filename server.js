const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mafasel';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(compression());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'mafasel-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  store: MONGODB_URI.includes('mongodb') ? MongoStore.create({
    mongoUrl: MONGODB_URI,
    ttl: 24 * 60 * 60
  }) : undefined,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
});

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  req.session.success = null;
  req.session.error = null;
  next();
});

app.locals.io = io;

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const consultationRoutes = require('./routes/consultation');
const pharmacyRoutes = require('./routes/pharmacy');
const insuranceRoutes = require('./routes/insurance');
const notificationRoutes = require('./routes/notification');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');
const complaintRoutes = require('./routes/complaint');
const profileRoutes = require('./routes/profile');

app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/consultations', consultationRoutes);
app.use('/pharmacy', pharmacyRoutes);
app.use('/insurance', insuranceRoutes);
app.use('/notifications', notificationRoutes);
app.use('/ai', aiRoutes);
app.use('/admin', adminRoutes);
app.use('/complaints', complaintRoutes);
app.use('/profile', profileRoutes);

const connectedUsers = new Map();

io.on('connection', (socket) => {
  const session = socket.request.session;
  if (session && session.user) {
    connectedUsers.set(session.user._id, socket.id);
    socket.join(`user_${session.user._id}`);
    if (session.user.role === 'admin' || session.user.role === 'moderator') {
      socket.join('admins');
    }
  }

  socket.on('disconnect', () => {
    if (session && session.user) {
      connectedUsers.delete(session.user._id);
    }
  });
});

app.locals.connectedUsers = connectedUsers;

app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'الصفحة غير موجودة' });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).render('pages/error', { title: 'خطأ في الخادم', error: err.message });
});

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    const User = require('./models/User');
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

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`MAFASEL server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
