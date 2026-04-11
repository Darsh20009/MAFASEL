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
│       ├── chat/                # نظام الشات
│       │   ├── chat.model.js
│       │   └── chat.routes.js
│       ├── notifications/       # نظام الإشعارات (3 طبقات)
│       │   ├── notification.model.js
│       │   ├── notification.service.js
│       │   └── notifications.routes.js
│       ├── ai/                  # المساعد الذكي (Groq)
│       │   └── ai.routes.js
│       ├── settings/            # الإعدادات والشكاوى
│       │   ├── complaint.model.js
│       │   └── settings.routes.js
│       └── admin/               # لوحة الإدارة
│           └── admin.routes.js
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

## ملاحظات أمنية
- ملفات `.p8` مستبعدة من Git
- رمز OTP يُعرض فقط في بيئة التطوير
- الكوكيز آمنة في بيئة الإنتاج (secure + sameSite)
- نفاذ في وضع المحاكاة حتى يتم ربط API الرسمي
