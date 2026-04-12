const https = require('https');
const fs = require('fs');
const pathModule = require('path');

const SMTP2GO_API = 'https://api.smtp2go.com/v3/email/send';
const FROM_NAME = 'مفاصل الطبيه';
const FROM_EMAIL = 'noreply@mafaseltech.com';

function getBaseUrl() {
  if (process.env.NODE_ENV === 'production' || process.env.REPL_SLUG) {
    return process.env.BASE_URL || 'https://mafaseltech.com';
  }
  return `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`;
}

let _cachedLogoB64 = null;
let _cachedGifB64 = null;

function getLogoBase64() {
  if (_cachedLogoB64) return _cachedLogoB64;
  try {
    const filePath = pathModule.join(__dirname, '../../../public/uploads/email/banner-logo.png');
    _cachedLogoB64 = fs.readFileSync(filePath).toString('base64');
    return _cachedLogoB64;
  } catch (e) { return null; }
}

function getGifBase64() {
  if (_cachedGifB64) return _cachedGifB64;
  try {
    const filePath = pathModule.join(__dirname, '../../../public/uploads/email/logo-animation.gif');
    _cachedGifB64 = fs.readFileSync(filePath).toString('base64');
    return _cachedGifB64;
  } catch (e) { return null; }
}

function buildEmailHTML(options) {
  const {
    title = '',
    greeting = '',
    body = '',
    ctaText = '',
    ctaLink = '',
    footerNote = '',
    showVideo = true
  } = options;

  const baseUrl = getBaseUrl();
  const logoUrl = 'cid:mafasel-logo';
  const gifUrl = 'cid:mafasel-banner';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1923;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1923;">
<tr><td align="center" style="padding:20px 10px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1a2736;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.4);">

<!-- Video/GIF Banner -->
${showVideo ? `
<tr>
<td align="center" style="background:linear-gradient(135deg,#0f1923 0%,#1a2736 50%,#0f1923 100%);padding:30px 20px 10px;">
<a href="${baseUrl}" target="_blank" style="text-decoration:none;">
<img src="${gifUrl}" alt="مفاصل" width="280" style="display:block;max-width:280px;height:auto;border:0;" />
</a>
</td>
</tr>
` : ''}

<!-- Logo Header -->
<tr>
<td align="center" style="padding:${showVideo ? '10px' : '30px'} 20px 20px;">
<a href="${baseUrl}" target="_blank" style="text-decoration:none;">
<img src="${logoUrl}" alt="مفاصل - Mafasel" width="220" style="display:block;max-width:220px;height:auto;border:0;" />
</a>
</td>
</tr>

<!-- Teal Divider -->
<tr>
<td style="padding:0 40px;">
<div style="height:3px;background:linear-gradient(90deg,transparent,#12a99b,transparent);border-radius:2px;"></div>
</td>
</tr>

<!-- Main Content -->
<tr>
<td style="padding:30px 40px;">
${greeting ? `<p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#ffffff;text-align:right;line-height:1.6;">${greeting}</p>` : ''}
<div style="font-size:15px;color:#b0bec5;line-height:1.8;text-align:right;">
${body}
</div>
${ctaText && ctaLink ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:28px 0 10px;">
<a href="${ctaLink}" target="_blank" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#12a99b,#0d8a7e);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(18,169,155,0.4);">
${ctaText}
</a>
</td></tr>
</table>
` : ''}
</td>
</tr>

${footerNote ? `
<!-- Footer Note -->
<tr>
<td style="padding:0 40px 20px;">
<div style="padding:16px 20px;background:rgba(18,169,155,0.08);border-radius:10px;border-right:3px solid #12a99b;">
<p style="margin:0;font-size:13px;color:#78909c;line-height:1.7;text-align:right;">${footerNote}</p>
</div>
</td>
</tr>
` : ''}

<!-- Footer -->
<tr>
<td style="padding:20px 40px;background-color:#141e2a;border-top:1px solid rgba(255,255,255,0.06);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">
<p style="margin:0 0 8px;font-size:12px;color:#546e7a;">
<a href="${baseUrl}" style="color:#12a99b;text-decoration:none;font-weight:600;">mafaseltech.com</a>
</p>
<p style="margin:0 0 4px;font-size:11px;color:#37474f;">منصة مفاصل للخدمات الطبية الرقمية</p>
<p style="margin:0;font-size:11px;color:#37474f;">المملكة العربية السعودية</p>
<p style="margin:12px 0 0;font-size:10px;color:#263238;">
هذا البريد مُرسل تلقائياً، يرجى عدم الرد عليه.
</p>
</td>
</tr>
</table>
</td>
</tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}

async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.SMTP2GO_API_KEY;
  if (!apiKey) {
    console.error('SMTP2GO_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const inlineImages = [];
  const logoB64 = getLogoBase64();
  const gifB64 = getGifBase64();
  if (logoB64) {
    inlineImages.push({
      fileblob: logoB64,
      filename: 'banner-logo.png',
      mimetype: 'image/png',
      content_id: 'mafasel-logo'
    });
  }
  if (gifB64 && html.includes('cid:mafasel-banner')) {
    inlineImages.push({
      fileblob: gifB64,
      filename: 'logo-animation.gif',
      mimetype: 'image/gif',
      content_id: 'mafasel-banner'
    });
  }

  const emailPayload = {
    api_key: apiKey,
    to: Array.isArray(to) ? to : [to],
    sender: `${FROM_NAME} <${FROM_EMAIL}>`,
    subject: subject,
    html_body: html,
    text_body: text || subject
  };

  if (inlineImages.length > 0) {
    emailPayload.inlineimages = inlineImages;
  }

  const payload = JSON.stringify(emailPayload);

  return new Promise((resolve) => {
    const url = new URL(SMTP2GO_API);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.data && result.data.succeeded > 0) {
            console.log(`Email sent to: ${Array.isArray(to) ? to.join(', ') : to}`);
            resolve({ success: true, data: result.data });
          } else {
            console.error('SMTP2GO error:', result);
            resolve({ success: false, error: result.data?.error || 'Failed to send' });
          }
        } catch (e) {
          console.error('SMTP2GO parse error:', e.message);
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });

    req.on('error', (err) => {
      console.error('SMTP2GO request error:', err.message);
      resolve({ success: false, error: err.message });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });

    req.write(payload);
    req.end();
  });
}

const templates = {

  welcome(userName) {
    const html = buildEmailHTML({
      title: 'مرحباً بك في مفاصل',
      greeting: `مرحباً ${userName} 👋`,
      body: `
        <p style="margin:0 0 12px;">يسعدنا انضمامك إلى <strong style="color:#12a99b;">منصة مفاصل</strong> للخدمات الطبية الرقمية.</p>
        <p style="margin:0 0 12px;">الآن يمكنك الاستفادة من جميع خدماتنا:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">
          <tr><td style="padding:6px 0;color:#12a99b;font-size:14px;">✦</td><td style="padding:6px 10px;color:#b0bec5;font-size:14px;">استشارات طبية مع أفضل الأطباء</td></tr>
          <tr><td style="padding:6px 0;color:#12a99b;font-size:14px;">✦</td><td style="padding:6px 10px;color:#b0bec5;font-size:14px;">صيدلية إلكترونية متكاملة</td></tr>
          <tr><td style="padding:6px 0;color:#12a99b;font-size:14px;">✦</td><td style="padding:6px 10px;color:#b0bec5;font-size:14px;">تأمين صحي رقمي</td></tr>
          <tr><td style="padding:6px 0;color:#12a99b;font-size:14px;">✦</td><td style="padding:6px 10px;color:#b0bec5;font-size:14px;">مساعد ذكي يعمل بالذكاء الاصطناعي</td></tr>
        </table>
      `,
      ctaText: 'ابدأ الآن',
      ctaLink: getBaseUrl() + '/dashboard',
      footerNote: 'ننصحك بإكمال ملفك الطبي للحصول على تجربة أفضل وتوصيات دقيقة.'
    });
    return { subject: 'مرحباً بك في منصة مفاصل 🎉', html };
  },

  otp(code, userName) {
    const html = buildEmailHTML({
      title: 'رمز التحقق',
      greeting: `مرحباً ${userName || ''}`,
      body: `
        <p style="margin:0 0 16px;">رمز التحقق الخاص بك هو:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <div style="display:inline-block;padding:16px 50px;background:linear-gradient(135deg,rgba(18,169,155,0.15),rgba(18,169,155,0.05));border:2px solid rgba(18,169,155,0.3);border-radius:14px;margin:8px 0;">
              <span style="font-size:36px;font-weight:800;color:#12a99b;letter-spacing:12px;font-family:monospace;">${code}</span>
            </div>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:13px;color:#78909c;">هذا الرمز صالح لمدة <strong style="color:#ffffff;">10 دقائق</strong> فقط.</p>
      `,
      showVideo: false,
      footerNote: 'إذا لم تطلب هذا الرمز، تجاهل هذا البريد. لا تشارك الرمز مع أي شخص.'
    });
    return { subject: `رمز التحقق: ${code}`, html };
  },

  passwordReset(resetLink, userName) {
    const html = buildEmailHTML({
      title: 'إعادة تعيين كلمة المرور',
      greeting: `مرحباً ${userName || ''}`,
      body: `
        <p style="margin:0 0 12px;">تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
        <p style="margin:0 0 12px;">اضغط على الزر أدناه لإنشاء كلمة مرور جديدة:</p>
      `,
      ctaText: 'إعادة تعيين كلمة المرور',
      ctaLink: resetLink,
      showVideo: false,
      footerNote: 'هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة التعيين، تجاهل هذا البريد.'
    });
    return { subject: 'إعادة تعيين كلمة المرور - مفاصل', html };
  },

  consultationBooked(details) {
    const html = buildEmailHTML({
      title: 'تم حجز استشارتك',
      greeting: `مرحباً ${details.patientName}`,
      body: `
        <p style="margin:0 0 16px;">تم حجز استشارتك الطبية بنجاح ✅</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:rgba(18,169,155,0.06);border-radius:12px;padding:4px;">
          <tr><td style="padding:10px 16px;color:#78909c;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">التخصص</td><td style="padding:10px 16px;color:#ffffff;font-size:14px;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.04);">${details.specialty || '—'}</td></tr>
          <tr><td style="padding:10px 16px;color:#78909c;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">الطبيب</td><td style="padding:10px 16px;color:#ffffff;font-size:14px;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.04);">${details.doctorName || 'سيتم تعيينه'}</td></tr>
          <tr><td style="padding:10px 16px;color:#78909c;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">رقم الاستشارة</td><td style="padding:10px 16px;color:#12a99b;font-size:14px;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.04);">#${details.consultationId || ''}</td></tr>
          <tr><td style="padding:10px 16px;color:#78909c;font-size:13px;">الحالة</td><td style="padding:10px 16px;color:#f59e0b;font-size:14px;font-weight:600;">قيد الانتظار</td></tr>
        </table>
      `,
      ctaText: 'متابعة الاستشارة',
      ctaLink: getBaseUrl() + '/consultations'
    });
    return { subject: 'تم حجز استشارتك الطبية - مفاصل', html };
  },

  orderConfirmation(details) {
    let itemsHtml = '';
    if (details.items && details.items.length > 0) {
      itemsHtml = details.items.map(item =>
        `<tr><td style="padding:8px 16px;color:#b0bec5;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">${item.name}</td><td style="padding:8px 16px;color:#ffffff;font-size:13px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.04);">${item.quantity || 1}x</td><td style="padding:8px 16px;color:#12a99b;font-size:13px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.04);">${item.price || ''} ر.س</td></tr>`
      ).join('');
    }

    const html = buildEmailHTML({
      title: 'تأكيد الطلب',
      greeting: `مرحباً ${details.patientName}`,
      body: `
        <p style="margin:0 0 16px;">تم تأكيد طلبك بنجاح 🎉</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:rgba(18,169,155,0.06);border-radius:12px;overflow:hidden;">
          <tr style="background:rgba(18,169,155,0.1);"><td style="padding:10px 16px;color:#12a99b;font-size:13px;font-weight:700;">المنتج</td><td style="padding:10px 16px;color:#12a99b;font-size:13px;font-weight:700;text-align:left;">الكمية</td><td style="padding:10px 16px;color:#12a99b;font-size:13px;font-weight:700;text-align:left;">السعر</td></tr>
          ${itemsHtml}
          <tr style="background:rgba(18,169,155,0.08);"><td colspan="2" style="padding:12px 16px;color:#ffffff;font-size:14px;font-weight:700;">المجموع</td><td style="padding:12px 16px;color:#12a99b;font-size:16px;font-weight:800;text-align:left;">${details.total || ''} ر.س</td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:13px;color:#78909c;">رقم الطلب: <strong style="color:#ffffff;">#${details.orderId || ''}</strong></p>
      `,
      ctaText: 'تتبع الطلب',
      ctaLink: getBaseUrl() + '/orders'
    });
    return { subject: `تأكيد الطلب #${details.orderId || ''} - مفاصل`, html };
  },

  supportReply(details) {
    const html = buildEmailHTML({
      title: 'رد من فريق الدعم',
      greeting: `مرحباً ${details.userName}`,
      body: `
        <p style="margin:0 0 12px;">لديك رد جديد من فريق الدعم الفني:</p>
        <div style="padding:16px 20px;background:rgba(18,169,155,0.06);border-radius:12px;border-right:3px solid #12a99b;margin:12px 0;">
          <p style="margin:0;color:#ffffff;font-size:14px;line-height:1.8;">${details.message}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#546e7a;">${details.agentName || 'فريق الدعم'}</p>
        </div>
      `,
      ctaText: 'فتح المحادثة',
      ctaLink: getBaseUrl() + '/chat/room/' + (details.roomId || ''),
      showVideo: false
    });
    return { subject: 'رد جديد من الدعم الفني - مفاصل', html };
  },

  notification(details) {
    const html = buildEmailHTML({
      title: details.title || 'إشعار',
      greeting: `مرحباً ${details.userName}`,
      body: `<p style="margin:0;">${details.message}</p>`,
      ctaText: details.ctaText || '',
      ctaLink: details.ctaLink || '',
      showVideo: false
    });
    return { subject: details.title || 'إشعار من مفاصل', html };
  }
};

async function sendTemplateEmail(templateName, to, data) {
  if (!templates[templateName]) {
    console.error(`Email template "${templateName}" not found`);
    return { success: false, error: 'Template not found' };
  }

  let template;
  switch (templateName) {
    case 'welcome':
      template = templates.welcome(typeof data === 'string' ? data : (data.userName || ''));
      break;
    case 'otp':
      template = templates.otp(data.code || data, data.userName || '');
      break;
    case 'passwordReset':
      template = templates.passwordReset(data.resetLink || '', data.userName || '');
      break;
    case 'consultationBooked':
      template = templates.consultationBooked(data);
      break;
    case 'orderConfirmation':
      template = templates.orderConfirmation(data);
      break;
    case 'supportReply':
      template = templates.supportReply(data);
      break;
    case 'notification':
    default:
      template = templates.notification(data);
      break;
  }

  return sendEmail({
    to,
    subject: template.subject,
    html: template.html
  });
}

module.exports = {
  sendEmail,
  sendTemplateEmail,
  buildEmailHTML,
  templates,
  getBaseUrl
};
