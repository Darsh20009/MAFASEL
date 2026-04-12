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
    }).select('title type status assignedPersona messageCount lastMessageAt createdAt').sort({ lastMessageAt: -1 }).limit(30);

    res.render('pages/ai-assistant', {
      title: 'فريق الرعاية',
      conversations
    });
  } catch (err) {
    console.error('AI page error:', err);
    res.render('pages/ai-assistant', { title: 'فريق الرعاية', conversations: [] });
  }
});

router.post('/conversation/new', isAuthenticated, async (req, res) => {
  try {
    const { type } = req.body;
    const dept = type || 'general';
    const persona = aiService.getPersona(dept, null);

    const typeLabels = {
      medical: 'استشارة طبية',
      support: 'خدمة العملاء',
      insurance: 'استفسار تأمين',
      pharmacy: 'استفسار صيدلي',
      complaint: 'ملاحظات وشكاوى',
      general: 'محادثة جديدة'
    };

    const conv = await AIConversation.create({
      userId: req.session.user._id,
      type: dept,
      title: typeLabels[dept] || 'محادثة جديدة',
      assignedPersona: {
        name: persona.name,
        title: persona.title,
        avatar: persona.avatar,
        department: persona.department
      }
    });

    res.json({
      success: true,
      conversationId: conv._id,
      persona: { name: persona.name, title: persona.title, avatar: persona.avatar }
    });
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
      const persona = aiService.getPersona('general', null);
      conv = await AIConversation.create({
        userId,
        type: 'general',
        title: 'محادثة جديدة',
        assignedPersona: {
          name: persona.name,
          title: persona.title,
          avatar: persona.avatar,
          department: persona.department
        }
      });
    }

    const routing = await aiService.analyzeAndRoute(message, conv.messages);

    if (conv.type === 'general' && routing.department !== 'general') {
      conv.type = routing.department;
      const typeLabels = {
        medical: 'استشارة طبية',
        support: 'خدمة العملاء',
        insurance: 'استفسار تأمين',
        pharmacy: 'استفسار صيدلي',
        complaint: 'ملاحظات وشكاوى'
      };
      if (conv.title === 'محادثة جديدة') {
        conv.title = typeLabels[routing.department] || conv.title;
      }

      const newPersona = routing.persona;
      conv.assignedPersona = {
        name: newPersona.name,
        title: newPersona.title,
        avatar: newPersona.avatar,
        department: newPersona.department
      };
    }

    if (conv.messageCount === 0 && message.length > 5) {
      conv.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    const currentPersona = conv.assignedPersona || routing.persona;

    conv.messages.push({
      role: 'user',
      content: message,
      metadata: { intent: routing.department, confidence: routing.confidence }
    });

    if (routing.urgency) {
      conv.context.urgencyLevel = routing.urgency;
    }
    if (routing.specialty) {
      conv.context.analyzedSpecialty = routing.specialty;
    }

    const historyMessages = conv.messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    const aiResult = await aiService.chat(historyMessages, conv.type, userProfile, currentPersona);

    const assistantMeta = {
      department: routing.department,
      confidence: routing.confidence,
      suggestions: routing.suggestions,
      referralSpecialty: routing.specialty
    };

    conv.messages.push({
      role: 'assistant',
      content: aiResult.reply,
      metadata: assistantMeta,
      persona: {
        name: currentPersona.name,
        title: currentPersona.title,
        avatar: currentPersona.avatar
      }
    });

    conv.messageCount = conv.messages.filter(m => m.role !== 'system').length;
    conv.lastMessageAt = new Date();

    await conv.save();

    res.json({
      success: true,
      reply: aiResult.reply,
      conversationId: conv._id,
      persona: {
        name: currentPersona.name,
        title: currentPersona.title,
        avatar: currentPersona.avatar
      },
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
    res.status(500).json({ success: false, message: 'حدث خطأ في الاتصال' });
  }
});

router.post('/escalate', isAuthenticated, async (req, res) => {
  try {
    const { conversationId, department, specialty, reason } = req.body;
    const userId = req.session.user._id;

    const conv = await AIConversation.findOne({ _id: conversationId, userId });
    if (!conv) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });

    const persona = conv.assignedPersona || aiService.getPersona(department, specialty);

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
        reason: reason || `تحويل من ${persona.name}`,
        consultationId: consultation._id,
        escalatedAt: new Date()
      };
      await conv.save();

      fireNotify(req.app, userId, 'تم حجز استشارة طبية', `${persona.name} حوّلك لقسم ${specialty} لمتابعة حالتك بشكل أدق`, { type: 'info', link: `/consultations/${consultation._id}`, priority: 'high' });

      return res.json({
        success: true,
        message: `تم حجز استشارة في قسم ${specialty}. سيتم تعيين أخصائي مختص لمتابعة حالتك.`,
        consultationId: consultation._id,
        redirectUrl: `/consultations/${consultation._id}`
      });
    }

    if (department === 'complaint') {
      conv.status = 'escalated';
      conv.escalation = { department: 'complaint', reason: reason || 'تسجيل شكوى رسمية', escalatedAt: new Date() };
      await conv.save();

      return res.json({
        success: true,
        message: 'تم تسجيل شكواك برقم مرجعي وسيتم متابعتها خلال 24 ساعة',
        redirectUrl: '/complaints'
      });
    }

    conv.status = 'escalated';
    conv.escalation = { department: department || 'support', reason: reason || 'تحويل للمتابعة', escalatedAt: new Date() };
    await conv.save();

    res.json({ success: true, message: 'تم تحويل طلبك للمتابعة. سيتواصل معك أحد المختصين قريباً.' });
  } catch (err) {
    console.error('Escalation error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/report/:conversationId', isAuthenticated, async (req, res) => {
  try {
    const conv = await AIConversation.findOne({
      _id: req.params.conversationId,
      userId: req.session.user._id
    });
    if (!conv) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });

    if (conv.messages.length < 4) {
      return res.status(400).json({ success: false, message: 'المحادثة قصيرة جداً لإنشاء تقرير' });
    }

    const userProfile = await User.findById(req.session.user._id).select('name gender dateOfBirth medicalProfile').lean();
    const reportContent = await aiService.generateReport(conv, userProfile);

    if (!reportContent) {
      return res.status(500).json({ success: false, message: 'لم نتمكن من إنشاء التقرير حالياً' });
    }

    conv.report = {
      generated: true,
      content: reportContent,
      generatedAt: new Date(),
      type: conv.type === 'medical' ? 'medical' : 'general'
    };
    await conv.save();

    res.json({
      success: true,
      report: reportContent,
      persona: conv.assignedPersona
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
});

router.post('/analyze-symptoms', isAuthenticated, async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) return res.status(400).json({ success: false });

    const specialty = aiService.detectSpecialty(symptoms);
    const urgency = aiService.detectUrgency(symptoms);
    const persona = aiService.getPersona('medical', specialty ? specialty.specialty : null);

    res.json({
      success: true,
      specialty,
      urgency,
      persona: { name: persona.name, title: persona.title },
      recommendation: specialty ? `ننصحك بمراجعة ${persona.name} - ${persona.title}` : 'ننصحك بزيارة أخصائي للتقييم'
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
