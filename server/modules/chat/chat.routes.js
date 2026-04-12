const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const { uploadChat } = require('../../middleware/upload');
const { ChatMessage, ChatRoom } = require('./chat.model');
const User = require('../users/user.model');
const { fireNotify } = require('../notifications/notification.service');
const path = require('path');

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

router.get('/', isAuthenticated, async (req, res) => {
  const userId = req.session.user._id;
  const rooms = await ChatRoom.find({
    participants: userId,
    isActive: true
  }).populate('participants', 'name role avatar').sort({ lastMessageAt: -1 });

  const unreadCounts = {};
  rooms.forEach(r => {
    unreadCounts[r._id] = (r.unreadCount && r.unreadCount.get(userId.toString())) || 0;
  });

  const doctors = await User.find({ role: 'doctor' }).select('name avatar');

  res.render('pages/chat', {
    title: 'المحادثات',
    rooms,
    unreadCounts,
    doctors
  });
});

router.post('/new', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { type, targetId, title } = req.body;

    if (type === 'doctor' && targetId) {
      const existing = await ChatRoom.findOne({
        participants: { $all: [userId, targetId] },
        type: 'doctor',
        isActive: true
      });
      if (existing) return res.redirect('/chat/room/' + existing._id);

      const doctor = await User.findById(targetId);
      if (!doctor) {
        req.session.error = 'الطبيب غير موجود';
        return res.redirect('/chat');
      }
      const room = await ChatRoom.create({
        participants: [userId, targetId],
        type: 'doctor',
        title: title || 'محادثة مع د. ' + doctor.name,
        lastMessageAt: new Date()
      });
      await ChatMessage.create({
        room: room._id,
        sender: userId,
        text: 'تم بدء المحادثة',
        type: 'system'
      });
      await fireNotify(req.app, targetId, 'محادثة جديدة', 'لديك محادثة جديدة من مريض', {
        type: 'info', link: '/chat/room/' + room._id
      });
      return res.redirect('/chat/room/' + room._id);
    }

    if (type === 'support') {
      const existing = await ChatRoom.findOne({
        participants: userId,
        type: 'support',
        isActive: true
      });
      if (existing) return res.redirect('/chat/room/' + existing._id);

      const admins = await User.find({ role: { $in: ['admin', 'moderator'] } }).select('_id');
      const adminIds = admins.map(a => a._id);

      const room = await ChatRoom.create({
        participants: [userId, ...adminIds],
        type: 'support',
        title: title || 'دعم فني',
        lastMessageAt: new Date()
      });
      await ChatMessage.create({
        room: room._id,
        sender: userId,
        text: 'تم فتح طلب دعم فني',
        type: 'system'
      });
      return res.redirect('/chat/room/' + room._id);
    }

    if (type === 'internal' && targetId) {
      const staffRoles = ['admin', 'moderator', 'doctor', 'pharmacist', 'employee'];
      if (!staffRoles.includes(req.session.user.role)) {
        req.session.error = 'غير مصرح لك';
        return res.redirect('/chat');
      }
      const existing = await ChatRoom.findOne({
        participants: { $all: [userId, targetId] },
        type: 'internal',
        isActive: true
      });
      if (existing) return res.redirect('/chat/room/' + existing._id);

      const target = await User.findById(targetId);
      if (!target) {
        req.session.error = 'المستخدم غير موجود';
        return res.redirect('/chat');
      }
      const room = await ChatRoom.create({
        participants: [userId, targetId],
        type: 'internal',
        title: 'محادثة داخلية',
        lastMessageAt: new Date()
      });
      await ChatMessage.create({
        room: room._id,
        sender: userId,
        text: 'تم بدء المحادثة الداخلية',
        type: 'system'
      });
      return res.redirect('/chat/room/' + room._id);
    }

    req.session.error = 'نوع المحادثة غير صالح';
    res.redirect('/chat');
  } catch (err) {
    console.error('Chat new error:', err);
    req.session.error = 'حدث خطأ في إنشاء المحادثة';
    res.redirect('/chat');
  }
});

router.get('/room/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const room = await ChatRoom.findById(req.params.id).populate('participants', 'name role avatar');

    if (!room || !room.participants.some(p => p._id.toString() === userId.toString())) {
      req.session.error = 'المحادثة غير موجودة';
      return res.redirect('/chat');
    }

    const messages = await ChatMessage.find({ room: room._id })
      .populate('sender', 'name role avatar')
      .sort({ createdAt: 1 })
      .limit(200);

    await ChatMessage.updateMany(
      { room: room._id, sender: { $ne: userId }, read: false },
      { read: true, readAt: new Date() }
    );

    if (room.unreadCount) {
      room.unreadCount.set(userId.toString(), 0);
      await room.save();
    }

    const otherParticipant = room.participants.find(p => p._id.toString() !== userId.toString());

    res.render('pages/chat-room', {
      title: room.title || 'محادثة',
      room,
      messages,
      otherParticipant
    });
  } catch (err) {
    console.error('Chat room error:', err);
    req.session.error = 'حدث خطأ';
    res.redirect('/chat');
  }
});

router.post('/room/:id/send', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const room = await ChatRoom.findById(req.params.id);
    if (!room || !room.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({ error: 'غير مصرح' });
    }
    if (!room.isActive) {
      return res.status(400).json({ error: 'المحادثة مغلقة' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'الرسالة فارغة' });
    }

    const msg = await ChatMessage.create({
      room: room._id,
      sender: userId,
      text: esc(text.trim()),
      type: 'text'
    });

    room.lastMessage = text.trim().substring(0, 100);
    room.lastMessageAt = new Date();
    room.lastMessageBy = userId;

    room.participants.forEach(pId => {
      if (pId.toString() !== userId.toString()) {
        const current = (room.unreadCount && room.unreadCount.get(pId.toString())) || 0;
        room.unreadCount.set(pId.toString(), current + 1);
      }
    });
    await room.save();

    const io = req.app.locals.io;
    room.participants.forEach(pId => {
      if (pId.toString() !== userId.toString()) {
        io.to(`user_${pId}`).emit('chat_message', {
          roomId: room._id,
          message: {
            _id: msg._id,
            text: msg.text,
            type: msg.type,
            sender: { _id: userId, name: req.session.user.name, role: req.session.user.role },
            createdAt: msg.createdAt,
            attachments: []
          }
        });
      }
    });

    res.json({
      success: true,
      message: {
        _id: msg._id,
        text: msg.text,
        type: msg.type,
        createdAt: msg.createdAt
      }
    });
  } catch (err) {
    console.error('Chat send error:', err);
    res.status(500).json({ error: 'خطأ في إرسال الرسالة' });
  }
});

router.post('/room/:id/upload', isAuthenticated, (req, res, next) => {
  uploadChat.array('files', 5)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'خطأ في رفع الملف' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const room = await ChatRoom.findById(req.params.id);
    if (!room || !room.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({ error: 'غير مصرح' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'لم يتم اختيار ملفات' });
    }

    const attachments = req.files.map(f => ({
      url: '/uploads/chat/' + f.filename,
      name: f.originalname,
      type: f.mimetype,
      size: f.size
    }));

    const isImage = attachments.every(a => a.type.startsWith('image/'));

    const msg = await ChatMessage.create({
      room: room._id,
      sender: userId,
      text: req.body.text ? esc(req.body.text.trim()) : (isImage ? 'صورة' : 'ملف مرفق'),
      type: isImage ? 'image' : 'file',
      attachments
    });

    room.lastMessage = isImage ? '📷 صورة' : '📎 ملف مرفق';
    room.lastMessageAt = new Date();
    room.lastMessageBy = userId;
    room.participants.forEach(pId => {
      if (pId.toString() !== userId.toString()) {
        const current = (room.unreadCount && room.unreadCount.get(pId.toString())) || 0;
        room.unreadCount.set(pId.toString(), current + 1);
      }
    });
    await room.save();

    const io = req.app.locals.io;
    room.participants.forEach(pId => {
      if (pId.toString() !== userId.toString()) {
        io.to(`user_${pId}`).emit('chat_message', {
          roomId: room._id,
          message: {
            _id: msg._id,
            text: msg.text,
            type: msg.type,
            sender: { _id: userId, name: req.session.user.name, role: req.session.user.role },
            createdAt: msg.createdAt,
            attachments: msg.attachments
          }
        });
      }
    });

    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('Chat upload error:', err);
    res.status(500).json({ error: 'خطأ في رفع الملفات' });
  }
});

router.post('/room/:id/close', isAuthenticated, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'غير موجود' });

    const userId = req.session.user._id;
    const isAdmin = req.session.user.role === 'admin' || req.session.user.role === 'moderator';
    if (!room.participants.some(p => p.toString() === userId.toString()) && !isAdmin) {
      return res.status(403).json({ error: 'غير مصرح' });
    }

    room.isActive = false;
    room.closedAt = new Date();
    room.closedBy = userId;
    await room.save();

    await ChatMessage.create({
      room: room._id,
      sender: userId,
      text: 'تم إغلاق المحادثة',
      type: 'system'
    });

    req.session.success = 'تم إغلاق المحادثة';
    res.redirect('/chat');
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/chat');
  }
});

router.get('/staff', isAuthenticated, async (req, res) => {
  const staffRoles = ['admin', 'moderator', 'doctor', 'pharmacist', 'employee'];
  if (!staffRoles.includes(req.session.user.role)) {
    req.session.error = 'غير مصرح لك';
    return res.redirect('/chat');
  }
  const staff = await User.find({
    role: { $in: staffRoles },
    _id: { $ne: req.session.user._id }
  }).select('name role avatar');
  res.json({ staff });
});

module.exports = router;
