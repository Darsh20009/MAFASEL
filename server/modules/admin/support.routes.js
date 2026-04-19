const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../../middleware/auth');
const { ChatRoom, ChatMessage } = require('../chat/chat.model');
const User = require('../users/user.model');
const Consultation = require('../medical/consultation.model');
const Order = require('../orders/order.model');
const { fireNotify } = require('../notifications/notification.service');
const Groq = require('groq-sdk');
const { templates, sendEmail } = require('../email/email.service');

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const PRIORITY_LABELS = { normal: 'عادي', medium: 'متوسط', high: 'مرتفع', urgent: 'عاجل' };

router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status = 'all', priority = 'all' } = req.query;

    let filter = { type: 'support' };
    if (status === 'open') filter.isActive = true;
    else if (status === 'closed') filter.isActive = false;
    if (priority !== 'all') filter.priority = priority;

    const rooms = await ChatRoom.find(filter)
      .populate('participants', 'name email phone role avatar lastLogin')
      .populate('assignedTo', 'name avatar')
      .sort({ lastMessageAt: -1 })
      .limit(100);

    const roomsWithUser = rooms.map(room => {
      const patient = room.participants.find(p =>
        p.role === 'patient' || (!['admin','moderator','doctor','pharmacist'].includes(p.role))
      );
      const unread = room.unreadCount ? Array.from(room.unreadCount.values()).reduce((a,b)=>a+b,0) : 0;
      return { room, patient, unread };
    });

    const agents = await User.find({ role: { $in: ['admin','moderator'] } }).select('name avatar');

    res.render('pages/admin-support', {
      title: 'لوحة الدعم الفني',
      roomsWithUser,
      agents,
      filters: { status, priority }
    });
  } catch (err) {
    console.error('Support list error:', err);
    res.render('pages/admin-support', { title: 'لوحة الدعم الفني', roomsWithUser: [], agents: [], filters: {} });
  }
});

router.get('/room/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id)
      .populate('participants', 'name email phone role avatar lastLogin medicalProfile companyProfile createdAt isVerified isActive authProvider specialty bio dateOfBirth gender')
      .populate('assignedTo', 'name avatar')
      .populate('internalNotes.author', 'name avatar');

    if (!room) {
      req.session.error = 'المحادثة غير موجودة';
      return res.redirect('/admin/support');
    }

    const patient = room.participants.find(p =>
      !['admin','moderator','doctor','pharmacist','employee','insurance_agent'].includes(p.role)
    ) || room.participants[0];

    const messages = await ChatMessage.find({ room: room._id })
      .populate('sender', 'name role avatar')
      .sort({ createdAt: 1 })
      .limit(300);

    let consultations = [], orders = [];
    if (patient) {
      [consultations, orders] = await Promise.all([
        Consultation.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(10),
        Order.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(10)
      ]);
    }

    const agents = await User.find({ role: { $in: ['admin','moderator'] } }).select('name avatar');

    res.render('pages/admin-support-room', {
      title: 'دعم فني | ' + (patient ? patient.name : room.title),
      room,
      messages,
      patient,
      consultations,
      orders,
      agents,
      PRIORITY_LABELS
    });
  } catch (err) {
    console.error('Support room error:', err);
    req.session.error = 'حدث خطأ';
    res.redirect('/admin/support');
  }
});

router.post('/room/:id/reply', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room || !room.isActive) return res.status(400).json({ error: 'المحادثة غير موجودة أو مغلقة' });

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'الرسالة فارغة' });

    const userId = req.session.user._id;
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
            _id: msg._id, text: msg.text, type: msg.type,
            sender: { _id: userId, name: req.session.user.name, role: req.session.user.role },
            createdAt: msg.createdAt, attachments: []
          }
        });
        fireNotify(req.app, pId.toString(), 'رد من الدعم الفني', text.trim().substring(0, 80), {
          type: 'info', link: '/chat/room/' + room._id
        }).catch(() => {});

        User.findById(pId).select('email name role').then(u => {
          if (u && u.email && !['admin', 'moderator', 'doctor', 'pharmacist', 'employee'].includes(u.role)) {
            const { html, subject } = templates.supportReply({
              userName: u.name || '',
              message: text.trim(),
              agentName: req.session.user.name,
              roomId: room._id
            });
            sendEmail({ to: u.email, subject, html }).catch(() => {});
          }
        }).catch(() => {});
      }
    });

    res.json({ success: true, message: { _id: msg._id, text: msg.text, createdAt: msg.createdAt, sender: { name: req.session.user.name, role: req.session.user.role } } });
  } catch (err) {
    console.error('Support reply error:', err);
    res.status(500).json({ error: 'خطأ في إرسال الرد' });
  }
});

router.post('/room/:id/note', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      req.session.error = 'الملاحظة فارغة';
      return res.redirect('/admin/support/room/' + req.params.id + '#notes');
    }
    const room = await ChatRoom.findById(req.params.id);
    if (!room) { req.session.error = 'غير موجود'; return res.redirect('/admin/support'); }

    room.internalNotes.push({ author: req.session.user._id, text: text.trim() });
    await room.save();
    req.session.success = 'تمت إضافة الملاحظة';
    res.redirect('/admin/support/room/' + req.params.id + '#notes');
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/admin/support/room/' + req.params.id);
  }
});

router.post('/room/:id/transfer', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { agentId } = req.body;
    const room = await ChatRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'غير موجود' });

    const agent = await User.findById(agentId);
    if (!agent) return res.status(404).json({ error: 'الموظف غير موجود' });

    room.assignedTo = agentId;
    if (!room.participants.some(p => p.toString() === agentId)) {
      room.participants.push(agentId);
    }
    await room.save();

    await ChatMessage.create({
      room: room._id,
      sender: req.session.user._id,
      text: `تم تحويل المحادثة إلى ${agent.name}`,
      type: 'system'
    });

    fireNotify(req.app, agentId, 'محادثة دعم محوّلة إليك', `طلب دعم من عميل بانتظار ردك`, {
      type: 'info', link: '/admin/support/room/' + room._id
    }).catch(() => {});

    req.session.success = 'تم التحويل بنجاح';
    res.redirect('/admin/support/room/' + req.params.id);
  } catch (err) {
    req.session.error = 'حدث خطأ في التحويل';
    res.redirect('/admin/support/room/' + req.params.id);
  }
});

router.post('/room/:id/priority', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { priority } = req.body;
    const allowed = ['normal','medium','high','urgent'];
    if (!allowed.includes(priority)) return res.status(400).json({ error: 'غير صالح' });

    await ChatRoom.findByIdAndUpdate(req.params.id, { priority });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.post('/room/:id/close', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) { req.session.error = 'غير موجود'; return res.redirect('/admin/support'); }

    room.isActive = false;
    room.closedAt = new Date();
    room.closedBy = req.session.user._id;
    await room.save();

    await ChatMessage.create({
      room: room._id,
      sender: req.session.user._id,
      text: 'تم إغلاق المحادثة من قبل فريق الدعم',
      type: 'system'
    });

    room.participants.forEach(pId => {
      if (pId.toString() !== req.session.user._id.toString()) {
        fireNotify(req.app, pId.toString(), 'تم إغلاق طلب الدعم', 'تم إغلاق محادثتك مع فريق الدعم الفني', {
          type: 'success', link: '/chat/room/' + room._id
        }).catch(() => {});
      }
    });

    req.session.success = 'تم إغلاق المحادثة';
    res.redirect('/admin/support');
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/admin/support');
  }
});

router.post('/room/:id/reopen', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await ChatRoom.findByIdAndUpdate(req.params.id, { isActive: true, closedAt: null, closedBy: null });
    req.session.success = 'تم إعادة فتح المحادثة';
    res.redirect('/admin/support/room/' + req.params.id);
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/admin/support/room/' + req.params.id);
  }
});

router.post('/room/:id/internal-msg', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'المحادثة غير موجودة' });

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'الرسالة فارغة' });

    const userId = req.session.user._id;
    const msg = await ChatMessage.create({
      room: room._id,
      sender: userId,
      text: esc(text.trim()),
      type: 'text',
      isInternal: true
    });

    const io = req.app.locals.io;
    const staffRoles = ['admin', 'moderator', 'doctor', 'pharmacist', 'employee'];
    const staffParticipants = await User.find({
      _id: { $in: room.participants },
      role: { $in: staffRoles }
    }).select('_id');

    staffParticipants.forEach(sp => {
      if (sp._id.toString() !== userId.toString()) {
        io.to(`user_${sp._id}`).emit('chat_internal', {
          roomId: room._id,
          message: {
            _id: msg._id,
            text: msg.text,
            isInternal: true,
            sender: { _id: userId, name: req.session.user.name, role: req.session.user.role },
            createdAt: msg.createdAt
          }
        });
      }
    });

    res.json({
      success: true,
      message: {
        _id: msg._id,
        text: msg.text,
        isInternal: true,
        createdAt: msg.createdAt,
        sender: { name: req.session.user.name, role: req.session.user.role }
      }
    });
  } catch (err) {
    console.error('Internal msg error:', err);
    res.status(500).json({ error: 'خطأ' });
  }
});

router.post('/room/:id/ai-suggest', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return res.json({ suggestion: '' });

    const room = await ChatRoom.findById(req.params.id)
      .populate('participants', 'name role medicalProfile');
    const messages = await ChatMessage.find({ room: room._id })
      .populate('sender', 'name role')
      .sort({ createdAt: -1 }).limit(10);

    const patient = room.participants.find(p => !['admin','moderator'].includes(p.role));
    const lastMsgs = messages.reverse().map(m => {
      const role = m.sender && ['admin','moderator'].includes(m.sender.role) ? 'وكيل الدعم' : 'العميل';
      return `${role}: ${m.text}`;
    }).join('\n');

    const systemPrompt = `أنت وكيل دعم فني محترف لمنصة مفاصل الطبية. 
مهمتك: اقتراح رد مناسب وودي ومهني باللغة العربية على رسالة العميل.
الرد يجب أن يكون قصيراً ومفيداً (2-3 جمل) ولا يتجاوز 150 كلمة.
${patient && patient.medicalProfile && patient.medicalProfile.chronicDiseases && patient.medicalProfile.chronicDiseases.length ? `ملاحظة: العميل يعاني من: ${patient.medicalProfile.chronicDiseases.join('، ')}` : ''}`;

    const groq = new Groq({ apiKey: groqKey });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `المحادثة:\n${lastMsgs}\n\nاقترح رداً مناسباً على آخر رسالة للعميل:` }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    const suggestion = completion.choices[0]?.message?.content?.trim() || '';
    res.json({ suggestion });
  } catch (err) {
    console.error('AI suggest error:', err.message);
    res.json({ suggestion: '' });
  }
});

router.get('/user/:id/full-data', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('-password -__v').lean();
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const MedicalProfile = require('../medical/medical-profile.model').MedicalProfile;

    const [medicalProfile, consultations, orders, chatRooms] = await Promise.all([
      MedicalProfile.findOne({ user: userId }).lean(),
      Consultation.find({ patient: userId }).sort({ createdAt: -1 }).limit(20).lean(),
      Order.find({ patient: userId }).sort({ createdAt: -1 }).limit(20).lean(),
      ChatRoom.find({ participants: userId }).sort({ lastMessageAt: -1 }).limit(10)
        .populate('participants', 'name role avatar').lean()
    ]);

    res.json({
      success: true,
      data: {
        user,
        medicalProfile: medicalProfile || null,
        consultations,
        orders,
        chatRooms,
        stats: {
          totalConsultations: consultations.length,
          totalOrders: orders.length,
          totalChats: chatRooms.length,
          allergiesCount: medicalProfile ? (medicalProfile.allergies || []).length : 0,
          chronicDiseasesCount: medicalProfile ? (medicalProfile.chronicDiseases || []).length : 0,
          activeMedicationsCount: medicalProfile ? (medicalProfile.medications || []).filter(m => m.isActive).length : 0
        }
      }
    });
  } catch (err) {
    console.error('Full data error:', err);
    res.status(500).json({ error: 'خطأ في جلب البيانات' });
  }
});

module.exports = router;
