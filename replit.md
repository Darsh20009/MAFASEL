# منصة مفاصل الطبية - MAFASEL

## نبذة عن المشروع
منصة طبية رقمية متكاملة تجمع بين الخدمات الصحية في مكان واحد (استشارات، صيدلية، تأمين، مساعد ذكي).

## البنية التقنية
- **Backend**: Node.js + Express.js
- **Frontend**: EJS Templates (Server-Side Rendering)
- **Database**: MongoDB Atlas
- **Real-time**: Socket.io (WebSocket)
- **AI**: Groq API (llama-3.3-70b-versatile)
- **Auth**: Passport.js (Google OAuth), Apple Sign-In, WebAuthn, OTP, Nafath
- **Port**: 5000

## هيكل الملفات
```
├── server.js                    # نقطة الدخول الرئيسية
├── server/
│   ├── index.js                 # إعداد Express والخادم
│   ├── middleware/auth.js       # وسيط المصادقة
│   └── modules/                 # وحدات النظام
│       ├── auth/                # تسجيل الدخول (Email, Phone OTP, Google, Apple, Nafath, WebAuthn)
│       │   ├── auth.routes.js
│       │   ├── auth.model.js
│       │   └── passport.setup.js
│       ├── users/               # إدارة المستخدمين والملف الشخصي
│       │   ├── user.model.js
│       │   ├── users.routes.js
│       │   └── dashboard.routes.js
│       ├── medical/             # الخدمات الطبية
│       │   ├── consultation.model.js
│       │   ├── insurance.model.js
│       │   ├── medical.routes.js
│       │   └── insurance.routes.js
│       ├── orders/              # نظام الطلبات (الصيدلية)
│       │   ├── order.model.js
│       │   └── orders.routes.js
│       ├── chat/                # نظام الشات (real-time WebSocket, typing, seen, internal msgs)
│       │   ├── chat.model.js    # ChatMessage (isInternal, read, readAt), ChatRoom (internalNotes, priority)
│       │   └── chat.routes.js   # /chat/room/:id/send, /mark-read, /upload, /close
│       ├── notifications/       # نظام الإشعارات (3 طبقات: DB + WebSocket + Web Push)
│       │   ├── notification.model.js
│       │   ├── notification.service.js
│       │   ├── notifications.routes.js
│       │   └── push-subscription.model.js  # اشتراكات Web Push (VAPID)
│       ├── email/               # نظام البريد الإلكتروني (SMTP2GO)
│       │   ├── email.service.js # إرسال + قوالب HTML (welcome, otp, reset, consultation, order, support)
│       │   └── email.routes.js  # /email/preview/:template, /email/send-test, /email/templates
│       ├── ai/                  # المساعد الذكي (Groq)
│       │   └── ai.routes.js
│       ├── settings/            # الإعدادات والشكاوى
│       │   ├── complaint.model.js
│       │   └── settings.routes.js
│       └── admin/               # لوحة الإدارة
│           ├── admin.routes.js
│           ├── support.routes.js # لوحة الدعم + /user/:id/full-data + /internal-msg + AI suggest
│           └── banner.model.js  # نموذج البانر (ديناميكي من قاعدة البيانات)
├── client/views/                # قوالب EJS
├── public/                      # ملفات ثابتة (CSS, JS, Icons)
├── shared/                      # أكواد مشتركة
├── apple-pay-certs/             # شهادات Apple (مستبعدة من Git)
├── uploads/                     # ملفات مرفوعة
└── .well-known/                 # Apple domain verification
```

## نظام المصادقة
- **البريد + كلمة المرور**: تسجيل تقليدي
- **الجوال + OTP**: رمز تحقق 6 أرقام (محاكاة في بيئة التطوير)
- **Google OAuth**: عبر Passport.js
- **Apple Sign-In**: عبر apple-signin-auth
- **نفاذ Nafath**: محاكاة (يحتاج ربط API الحكومي)
- **WebAuthn**: تسجيل بالبصمة/الوجه عبر @simplewebauthn

## المتغيرات البيئية
- `MONGODB_URI` - رابط MongoDB Atlas
- `GROQ_API_KEY` - مفتاح Groq API
- `GOOGLE_CLIENT_ID` - معرف Google OAuth
- `GOOGLE_CLIENT_SECRET` - سر Google OAuth
- `APPLE_TEAM_ID` - معرف فريق Apple Developer
- `APPLE_KEY_ID` - معرف مفتاح Apple
- `SESSION_SECRET` - مفتاح الجلسات
- `PORT` - المنفذ (5000)

## الألوان
- اللون الأساسي: `#101d23`
- اللون الثانوي: `#12a99b`
- الأبيض: `#FFFFFF`

## حساب المدير الافتراضي
- البريد: admin@mafasel.com
- كلمة المرور: admin123

## الصفحة الرئيسية (Landing)
- تصميم فاخر مع particles متحركة، gradient overlay، إحصائيات أرقام متحركة
- 3 أزرار: تسجيل دخول، إنشاء حساب، تصفح المنصة
- قسم خدمات مع بطاقات متحركة (6 بطاقات)
- قسم CTA + فوتر
- دعم الوضع الليلي

## لوحة التحكم (Dashboard)
- **دعم الزوار**: يمكن تصفح المنصة بدون تسجيل دخول ("مرحباً، مستخدم")
- بانر ديناميكي مع gradient blend في الأسفل
- تبديل تلقائي كل 5 ثوانٍ + أسهم تنقل + نقاط + سحب باللمس
- قسم ترحيب premium مع حالة الحساب والدور
- إحصائيات بتصميم premium (glassmorphism + shine effects)
- 6 إجراءات سريعة مع glow hover effects
- آخر الاستشارات والطلبات مع روابط "عرض الكل"
- إشعارات مهمة مع تمييز الأولوية (عادي/مرتفع/عاجل)
- بطاقة فريق الرعاية الصحية مع تأثيرات بصرية متحركة

## التسجيل
- التسجيل للمرضى فقط (لا يوجد اختيار دور)
- المدير ينشئ الحسابات الأخرى (أطباء، صيادلة، مشرفين، شركات، موظفين)

## نظام البانرات (إدارة)
- صفحة إدارة البانرات: `/admin/banners`
- رفع صور (JPG, PNG, GIF, WebP) وفيديوهات (MP4, WebM)
- تفعيل/إيقاف، حذف، تعديل العنوان والرابط والترتيب
- الملفات مخزنة في `uploads/banners/` وليس كروابط خارجية

## التحقق من البيانات
- رقم الجوال: يبدأ بـ 5 ويتكون من 9 أرقام مع عرض +966
- رقم الهوية الوطنية: يبدأ بـ 1 أو 2 ويتكون من 10 أرقام

## نظام الذكاء الاصطناعي (مخفي - يظهر كفريق رعاية حقيقي)
- **المبدأ**: لا أحد يعرف أنه ذكاء اصطناعي - يظهر كطاقم طبي وإداري حقيقي
- **Groq API**: نموذج llama-3.3-70b-versatile مع شخصيات مختلفة
- **الشخصيات**: 17+ شخصية (أطباء، صيادلة، موظفي دعم، مدير علاقات)
  - كل تخصص طبي له طبيب باسم حقيقي ولقب مناسب
  - التوجيه التلقائي يختار الشخصية المناسبة حسب نوع الاستفسار
- **التوجيه الذكي**: تصنيف الطلبات (طبي/صيدلي/تأمين/شكوى/دعم) تلقائياً
- **التقارير**: تقارير طبية تبدو كأنها من طبيب حقيقي (موقعة باسم الشخصية)
- **النموذج**: `server/modules/ai/ai-conversation.model.js`
- **الخدمة**: `server/modules/ai/ai.service.js`
- **المسارات**: `server/modules/ai/ai.routes.js`
- **الصفحة**: `client/views/pages/ai-assistant.ejs` (تصميم شات مع sidebar)
- **عنوان URL**: `/ai` - يظهر كـ"فريق الرعاية" في القائمة

## نظام الشات
- أنواع الغرف: `doctor`, `support`, `internal`, `consultation`
- صور الشخصيات (الأطباء/الدعم) في `public/avatars/` (SVG)
- رفع ملفات (صور/PDF/Word/Excel) حتى 20MB في `uploads/chat/`
- Socket.io للتسليم الفوري + إيصالات القراءة
- CSS كامل للشات في `public/css/style.css`

## نظام الإشعارات (3 طبقات)
1. **قاعدة البيانات**: تخزين دائم في MongoDB (notification.model.js)
2. **WebSocket**: إشعارات فورية عبر Socket.io للمستخدمين المتصلين
3. **Web Push**: إشعارات المتصفح عبر VAPID (حتى عند إغلاق الصفحة)
   - Service Worker: `public/sw.js`
   - اشتراكات Push: `push-subscription.model.js`
   - VAPID keys مخزنة في env vars

## ملاحظات أمنية
- ملفات `.p8` مستبعدة من Git
- رمز OTP يُعرض فقط في بيئة التطوير
- الكوكيز آمنة في بيئة الإنتاج (secure + sameSite)
- نفاذ في وضع المحاكاة حتى يتم ربط API الرسمي
- IDOR protection على إشعارات المستخدم (scoped by userId)
