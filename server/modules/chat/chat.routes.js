const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const { ChatMessage, ChatRoom } = require('./chat.model');

router.get('/', isAuthenticated, async (req, res) => {
  const rooms = await ChatRoom.find({
    participants: req.session.user._id,
    isActive: true
  }).populate('participants', 'name role avatar').sort({ lastMessageAt: -1 });
  res.render('pages/chat', { title: 'المحادثات', rooms });
});

router.get('/room/:id', isAuthenticated, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id).populate('participants', 'name role avatar');
    if (!room) {
      req.session.error = 'المحادثة غير موجودة';
      return res.redirect('/chat');
    }
    const messages = await ChatMessage.find({ room: room._id })
      .populate('sender', 'name role avatar')
      .sort({ createdAt: 1 })
      .limit(100);
    res.render('pages/chat-room', { title: 'محادثة', room, messages });
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/chat');
  }
});

router.post('/room/:id/send', isAuthenticated, async (req, res) => {
  try {
    const { text } = req.body;
    const msg = await ChatMessage.create({
      room: req.params.id,
      sender: req.session.user._id,
      text
    });
    await ChatRoom.findByIdAndUpdate(req.params.id, {
      lastMessage: text.substring(0, 100),
      lastMessageAt: new Date()
    });
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إرسال الرسالة' });
  }
});

module.exports = router;
