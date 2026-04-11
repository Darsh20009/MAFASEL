# منصة مفاصل الطبية - MAFASEL

## نبذة عن المشروع
منصة طبية رقمية متكاملة تجمع بين الخدمات الصحية في مكان واحد (استشارات، صيدلية، تأمين، مساعد ذكي).

## البنية التقنية
- **Backend**: Node.js + Express.js
- **Frontend**: EJS Templates (Server-Side Rendering)
- **Database**: MongoDB Atlas
- **Real-time**: Socket.io (WebSocket)
- **AI**: Groq API (llama-3.3-70b-versatile)
- **Port**: 5000

## هيكل الملفات
```
├── server.js              # نقطة الدخول الرئيسية
├── server/                # الخادم (Backend)
│   ├── index.js           # إعداد Express والخادم
│   ├── routes/            # المسارات (auth, dashboard, consultation, pharmacy, insurance, ai, admin, complaint, profile, notification)
│   ├── models/            # نماذج MongoDB (User, Consultation, Order, Insurance, Notification, Complaint)
│   ├── middleware/        # وسيط المصادقة
│   └── utils/             # أدوات مساعدة (إشعارات)
├── client/                # الواجهة الأمامية
│   └── views/             # قوالب EJS
│       ├── partials/      # أجزاء مشتركة (header, footer)
│       └── pages/         # الصفحات
├── public/                # الملفات الثابتة
│   ├── css/style.css      # التنسيقات
│   ├── js/app.js          # JavaScript العميل
│   └── icons/             # الأيقونات واللوجو
├── shared/                # أكواد مشتركة (ثوابت، مساعدات)
├── script/                # سكربتات (seed.js)
├── memory/                # حالة الذاكرة
├── uploads/               # الملفات المرفوعة
├── artifacts/             # ملفات إضافية
├── apple-pay-certs/       # شهادات Apple Pay
└── test_reports/          # تقارير الاختبارات
```

## المتغيرات البيئية المطلوبة
- `MONGODB_URI` - رابط اتصال MongoDB Atlas
- `GROQ_API_KEY` - مفتاح Groq API للمساعد الذكي
- `SESSION_SECRET` - مفتاح الجلسات
- `PORT` - المنفذ (5000)

## الألوان
- اللون الأساسي: `#101d23`
- اللون الثانوي: `#12a99b`
- الأبيض: `#FFFFFF`

## حساب المدير الافتراضي
- البريد: admin@mafasel.com
- كلمة المرور: admin123

## ملاحظات
- يجب إضافة `0.0.0.0/0` في MongoDB Atlas Network Access للسماح بالاتصال من Replit
- المشروع يعمل بدون قاعدة بيانات في وضع التطوير
- الواجهة تدعم RTL والعربية بالكامل
- يدعم الوضع الليلي والنهاري
