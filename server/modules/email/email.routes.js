const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../../middleware/auth');
const { sendEmail, sendTemplateEmail, buildEmailHTML, templates, getBaseUrl } = require('./email.service');
const User = require('../users/user.model');

router.get('/preview/:template', isAuthenticated, isAdmin, (req, res) => {
  const { template } = req.params;
  const userName = req.session.user.name || 'مستخدم';

  let html = '';
  switch (template) {
    case 'welcome':
      html = templates.welcome(userName).html;
      break;
    case 'otp':
      html = templates.otp('482913', userName).html;
      break;
    case 'password-reset':
      html = templates.passwordReset(getBaseUrl() + '/reset-password/abc123', userName).html;
      break;
    case 'consultation':
      html = templates.consultationBooked({
        patientName: userName,
        specialty: 'طب العظام',
        doctorName: 'د. فهد المحمدي',
        consultationId: 'CSN-20260412'
      }).html;
      break;
    case 'order':
      html = templates.orderConfirmation({
        patientName: userName,
        orderId: 'ORD-7829',
        items: [
          { name: 'بروفين 400mg', quantity: 2, price: 18 },
          { name: 'فيتامين D3', quantity: 1, price: 45 }
        ],
        total: 81
      }).html;
      break;
    case 'support':
      html = templates.supportReply({
        userName: userName,
        message: 'شكراً لتواصلك معنا. تم حل مشكلتك وسيتم تحديث حسابك خلال 24 ساعة.',
        agentName: 'أحمد - فريق الدعم',
        roomId: 'demo'
      }).html;
      break;
    default:
      html = templates.notification({
        userName: userName,
        title: 'إشعار تجريبي',
        message: 'هذا إشعار تجريبي من منصة مفاصل للخدمات الطبية الرقمية.',
        ctaText: 'فتح المنصة',
        ctaLink: getBaseUrl()
      }).html;
  }

  res.send(html);
});

router.post('/send-test', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { to, template } = req.body;
    const email = to || req.session.user.email;
    if (!email) return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });

    const userName = req.session.user.name || 'مستخدم';
    let emailData;

    switch (template) {
      case 'welcome':
        emailData = templates.welcome(userName);
        break;
      case 'otp':
        emailData = templates.otp('482913', userName);
        break;
      case 'password-reset':
        emailData = templates.passwordReset(getBaseUrl() + '/reset-password/demo', userName);
        break;
      case 'consultation':
        emailData = templates.consultationBooked({
          patientName: userName,
          specialty: 'طب العظام',
          doctorName: 'د. فهد المحمدي',
          consultationId: 'CSN-DEMO'
        });
        break;
      case 'order':
        emailData = templates.orderConfirmation({
          patientName: userName,
          orderId: 'ORD-DEMO',
          items: [
            { name: 'بروفين 400mg', quantity: 2, price: 18 },
            { name: 'فيتامين D3', quantity: 1, price: 45 }
          ],
          total: 81
        });
        break;
      case 'support':
        emailData = templates.supportReply({
          userName: userName,
          message: 'شكراً لتواصلك. تم حل مشكلتك بنجاح.',
          agentName: 'فريق الدعم',
          roomId: 'demo'
        });
        break;
      default:
        emailData = templates.notification({
          userName,
          title: 'بريد تجريبي من مفاصل',
          message: 'هذا بريد تجريبي للتحقق من عمل النظام البريدي.',
          ctaText: 'فتح المنصة',
          ctaLink: getBaseUrl()
        });
    }

    const result = await sendEmail({ to: email, subject: emailData.subject, html: emailData.html });

    res.json({ success: result.success, error: result.error });
  } catch (err) {
    console.error('Test email error:', err);
    res.status(500).json({ error: 'خطأ في إرسال البريد' });
  }
});

router.get('/templates', isAuthenticated, isAdmin, (req, res) => {
  res.render('pages/admin-email-templates', {
    title: 'قوالب البريد الإلكتروني',
    templates: ['welcome', 'otp', 'password-reset', 'consultation', 'order', 'support', 'notification']
  });
});

module.exports = router;
