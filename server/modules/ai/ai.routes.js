const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const AIConversation = require('./ai-conversation.model');
const User = require('../users/user.model');
const Consultation = require('../medical/consultation.model');
const aiService = require('./ai.service');
const { fireNotify } = require('../notifications/notification.service');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const conversations = await AIConversation.find({
      userId: req.session.user._id
    }).select('title type status messageCount lastMessageAt createdAt').sort({ lastMessageAt: -1 }).limit(30);

    res.render('pages/ai-assistant', {
      title: 'المساعد الذكي',
      conversations
    });
  } catch (err) {
    console.error('AI page error:', err);
    res.render('pages/ai-assistant', { title: 'المساعد الذكي', conversations: [] });
  }
});

router.post('/conversation/new', isAuthenticated, async (req, res) => {
  try {
    const { type } = req.body;
    const conv = await AIConversation.create({
      userId: req.session.user._id,
      type: type || 'general',
      title: type === 'medical' ? 'استشارة طبية' : type === 'support' ? 'دعم فني' : type === 'insurance' ? 'استفسار تأمين' : type === 'pharmacy' ? 'استفسار صيدلية' : type === 'complaint' ? 'شكوى' : 'محادثة جديدة'
    });
    res.json({ success: true, conversationId: conv._id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.get('/conversation/:id', isAuthenticated, async (req, res) => {
  try {
    const conv = await AIConversation.findOne({
      _id: req.params.id,
      userId: req.session.user._id
    });
    if (!conv) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    res.json({ success: true, conversation: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.delete('/conversation/:id', isAuthenticated, async (req, res) => {
  try {
    await AIConversation.deleteOne({ _id: req.params.id, userId: req.session.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/chat', isAuthenticated, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'الرسالة مطلوبة' });
    }

    const userId = req.session.user._id;
    const userProfile = await User.findById(userId).select('name gender dateOfBirth medicalProfile').lean();

    let conv;
    if (conversationId) {
      conv = await AIConversation.findOne({ _id: conversationId, userId });
      if (!conv) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    } else {
      conv = await AIConversation.create({ userId, type: 'general', title: 'محادثة جديدة' });
    }

    const routing = await aiService.analyzeAndRoute(message, conv.messages);

    if (conv.type === 'general' && routing.department !== 'general') {
      conv.type = routing.department;
      const typeLabels = { medical: 'استشارة طبية', support: 'دعم فني', insurance: 'استفسار تأمين', pharmacy: 'استفسار صيدلية', complaint: 'شكوى' };
      if (conv.title === 'محادثة جديدة') {
        conv.title = typeLabels[routing.department] || conv.title;
      }
    }

    if (conv.messageCount === 0 && message.length > 5) {
      conv.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    conv.messages.push({ role: 'user', content: message, metadata: { intent: routing.department, confidence: routing.confidence } });

    if (routing.urgency) {
      conv.context.urgencyLevel = routing.urgency;
    }
    if (routing.specialty) {
      conv.context.analyzedSpecialty = routing.specialty;
    }

    const historyMessages = conv.messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    const aiResult = await aiService.chat(historyMessages, conv.type, userProfile);

    const assistantMeta = {
      department: routing.department,
      confidence: routing.confidence,
      suggestions: routing.suggestions,
      referralSpecialty: routing.specialty
    };

    conv.messages.push({ role: 'assistant', content: aiResult.reply, metadata: assistantMeta });
    conv.messageCount = conv.messages.filter(m => m.role !== 'system').length;
    conv.lastMessageAt = new Date();

    await conv.save();

    res.json({
      success: true,
      reply: aiResult.reply,
      conversationId: conv._id,
      routing: {
        department: routing.department,
        specialty: routing.specialty,
        urgency: routing.urgency,
        actions: routing.actions,
        suggestions: routing.suggestions
      }
    });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ في المساعد الذكي' });
  }
});

router.post('/escalate', isAuthenticated, async (req, res) => {
  try {
    const { conversationId, department, specialty, reason } = req.body;
    const userId = req.session.user._id;

    const conv = await AIConversation.findOne({ _id: conversationId, userId });
    if (!conv) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });

    if (department === 'medical' && specialty) {
      const symptomsFromChat = conv.messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
      const consultation = await Consultation.create({
        patient: userId,
        specialty: specialty,
        symptoms: symptomsFromChat.substring(0, 1000),
        priority: conv.context.urgencyLevel === 'emergency' ? 'urgent' : conv.context.urgencyLevel === 'high' ? 'high' : 'medium',
        status: 'pending'
      });

      conv.status = 'escalated';
      conv.escalation = {
        department: 'medical',
        reason: reason || 'تحويل من المساعد الذكي',
        consultationId: consultation._id,
        escalatedAt: new Date()
      };
      await conv.save();

      fireNotify(req.app, userId, 'تم إنشاء استشارة طبية', `تم تحويلك لقسم ${specialty} بناءً على محادثتك مع المساعد الذكي`, { type: 'info', link: `/consultations/${consultation._id}`, priority: 'high' });

      return res.json({
        success: true,
        message: `تم إنشاء استشارة طبية في قسم ${specialty}`,
        consultationId: consultation._id,
        redirectUrl: `/consultations/${consultation._id}`
      });
    }

    if (department === 'complaint') {
      conv.status = 'escalated';
      conv.escalation = { department: 'complaint', reason: reason || 'تصعيد شكوى', escalatedAt: new Date() };
      await conv.save();

      return res.json({
        success: true,
        message: 'تم تسجيل شكواك وسيتم متابعتها من فريق الدعم',
        redirectUrl: '/complaints'
      });
    }

    conv.status = 'escalated';
    conv.escalation = { department: department || 'support', reason: reason || 'تصعيد للدعم', escalatedAt: new Date() };
    await conv.save();

    res.json({ success: true, message: 'تم تحويل طلبك للدعم البشري. سيتم التواصل معك قريباً.' });
  } catch (err) {
    console.error('Escalation error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ في التحويل' });
  }
});

router.post('/analyze-symptoms', isAuthenticated, async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) return res.status(400).json({ success: false });

    const specialty = aiService.detectSpecialty(symptoms);
    const urgency = aiService.detectUrgency(symptoms);

    res.json({
      success: true,
      specialty,
      urgency,
      recommendation: specialty ? `ننصحك بزيارة طبيب ${specialty.specialty}` : 'ننصحك بزيارة طبيب عام للتقييم'
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
