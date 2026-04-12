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

## نظام الترجمة (i18n)
- **Middleware**: `server/middleware/i18n.js` - يقرأ اللغة من query param `?lang=`, cookie `lang`, أو session
- **ملفات الترجمة**: `locales/ar.json` (عربي - افتراضي), `locales/en.json` (إنجليزي)
- **الأقسام المترجمة**: `nav`, `roles`, `common`, `auth`, `landing`, `dashboard`, `physiotherapy`, `ai`
- **دالة الترجمة**: `t('key.path')` متاحة في جميع القوالب عبر `res.locals.t`
- **متغيرات القالب**: `lang` (ar/en), `dir` (rtl/ltr), `t()`, `translations`
- **تبديل اللغة**: زر الكرة الأرضية في الـ navbar (يظهر "EN" بالعربي، "ع" بالإنجليزي)
- **صفحات مترجمة بالكامل**: landing.ejs, login.ejs, register.ejs, header.ejs
- **CSS LTR**: قواعد `html[dir="ltr"]` في نهاية `style.css` لتحويل التخطيط من RTL إلى LTR
- **الخط الإنجليزي**: Inter (Google Fonts) للنصوص الإنجليزية

## البطاقة الصحية الذكية
- **الصفحة**: `/health-card` — بطاقة رقمية بتصميم بطاقة ائتمانية مع QR Code وتأثير flip
- **مسح QR**: `/health-card/scan/:userId?t=token` — صفحة عامة تعرض بيانات المستفيد الكاملة عند مسح QR
- **API مسح**: `/health-card/api/scan/:userId?t=token` — JSON endpoint للتكامل مع أنظمة المراكز
- **Apple Wallet**: `/health-card/wallet-pass` — توليد ملف .pkpass (يتطلب شهادات Apple في `apple-wallet-certs/`)
- **التحقق**: كل بطاقة تحمل token مشفر بـ SHA256 — لا يمكن الوصول بدون الرمز الصحيح
- **نقل الملف**: عند مسح البطاقة في مركز جديد، يمكن نقل البيانات تلقائياً لإنشاء ملف جديد
- **الملفات**: `health-card.routes.js` (backend)، `health-card.ejs` (البطاقة)، `health-card-scan.ejs` (صفحة المسح)

## هيكل الملفات
```
├── server.js                    # نقطة الدخول الرئيسية
├── locales/                     # ملفات الترجمة (ar.json, en.json)
├── server/
│   ├── index.js                 # إعداد Express والخادم
│   ├── middleware/auth.js       # وسيط المصادقة
│   ├── middleware/i18n.js       # وسيط الترجمة
│   └── modules/                 # وحدات النظام
│       ├── auth/                # تسجيل الدخول (Email, Phone OTP, Google, Apple, Nafath, WebAuthn)
│       │   ├── auth.routes.js
│       │   ├── auth.model.js
│       │   └── passport.setup.js
│       ├── users/               # إدارة المستخدمين والملف الشخصي
│       │   ├── user.model.js
│       │   ├── users.routes.js
│       │   ├── health-card.routes.js  # البطاقة الصحية الذكية (QR scan, Apple Wallet, نقل الملف)
│       │   └── dashboard.routes.js
│       ├── medical/             # الخدمات الطبية
│       │   ├── consultation.model.js
│       │   ├── insurance.model.js
│       │   ├── medical.routes.js
│       │   └── insurance.routes.js
│       ├── pharmacy/            # سوق الصيدليات (4 صيدليات: النهدي، الدواء، ليمون، أورانج)
│       │   ├── pharmacy.model.js   # نموذج الصيدلية (اسم، لوغو، موقع، تأمين، توصيل)
│       │   ├── drug.model.js       # نموذج الدواء (18 نوع لكل صيدلية، تأمين، وصفة، مخزون)
│       │   └── pharmacy.routes.js  # تصفح/بحث/طلب/إدارة/seed
│       ├── orders/              # نظام الطلبات (5 طرق دفع: نقد، بطاقة، Apple Pay، تأمين، البطاقة الصحية)
│       │   ├── order.model.js      # طلب مرتبط بصيدلية + أدوية + تأمين + تتبع حالة
│       │   └── orders.routes.js    # (قديم - غير مستخدم)
│       ├── chat/                # نظام الشات (real-time WebSocket, typing, seen, internal msgs)
│       │   ├── chat.model.js    # ChatMessage (isInternal, read, readAt), ChatRoom (internalNotes, priority)
│       │   └── chat.routes.js   # /chat/room/:id/send, /mark-read, /upload, /close
│       ├── notifications/       # نظام الإشعارات (3 طبقات: DB + WebSocket + Web Push)
│       │   ├── notification.model.js
│       │   ├── notification.service.js
│       │   ├── notifications.routes.js
│       │   └── push-subscription.model.js  # اشتراكات Web Push (VAPID)
│       ├── email/               # نظام البريد الإلكتروني (SMTP2GO) - صور مستضافة (hosted URLs, لا CID)
│       │   ├── email.service.js # إرسال + قوالب HTML + getLogoUrl()/getGifUrl() للصور المستضافة
│       │   └── email.routes.js  # /email/preview/:template, /email/send-test, /email/templates
│       ├── ai/                  # المساعد الذكي (Groq)
│       │   └── ai.routes.js
│       ├── settings/            # الإعدادات والشكاوى
│       │   ├── complaint.model.js
│       │   └── settings.routes.js
│       └── admin/               # لوحة الإدارة
│           ├── admin.routes.js
│           ├── support.routes.js # لوحة الدعم + /user/:id/full-data + /internal-msg + AI suggest
│           ├── invitation.model.js # نموذج الدعوات (token, role, expiry, maxUses)
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
- **Apple Sign-In**: عبر apple-signin-auth (يعمل فقط في بيئة الإنتاج - يحتاج تسجيل redirect URL في Apple Developer Console)
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
- الجوال: 0500000000

## الحسابات التجريبية (كلمة المرور: demo123)
| الدور | البريد | الجوال |
|-------|--------|--------|
| مستفيد | patient@mafasel.com | 0500000001 |
| أخصائي | doctor@mafasel.com | 0500000002 |
| صيدلي | pharmacist@mafasel.com | 0500000003 |
| مشرف | moderator@mafasel.com | 0500000004 |
| شركة | company@mafasel.com | 0500000005 |
| موظف | employee@mafasel.com | 0500000006 |
| وكيل تأمين | insurance@mafasel.com | 0500000007 |

## العلاج الطبيعي (Physiotherapy)
- صفحة رئيسية `/physiotherapy` مع أقسام الخدمات والمراكز والأخصائيين
- `/physiotherapy/centers` — قائمة مراكز العلاج الطبيعي مع فلتر المدن
- `/physiotherapy/specialists` — قائمة الأخصائيين مع فلتر المدن والتخصصات والجنس
- `/physiotherapy/specialist/:id` — ملف الأخصائي التفصيلي مع التقييمات والحجز
- نموذج Specialist في `server/modules/physiotherapy/specialist.model.js`
- نوع موقع جديد `physiotherapy_center` في نموذج Location
- تخصصات: علاج عظام ومفاصل، تأهيل عصبي، علاج أطفال، إصابات رياضية، علاج تنفسي، آلام الظهر والرقبة
- بيانات تجريبية: 5 مراكز + 6 أخصائيين

## البطاقة الصحية (Health Card)
- صفحة `/health-card` تعرض بطاقة صحية رقمية للمستفيد
- تصميم إبداعي مع وجه أمامي (صورة، اسم، بيانات سريعة، QR) ووجه خلفي (تفاصيل طبية)
- يمكن قلب البطاقة بالنقر أو السحب
- تحميل كصورة PNG أو طباعة
- زر Apple Wallet (يعمل على أجهزة Apple فقط)
- QR يحتوي فقط على معرف المستفيد (بدون بيانات حساسة)

## العرض التقديمي (Presentation)
- صفحة عرض تقديمي احترافية على `/presentation` بتصميم كتاب (Book-style)
- 18 صفحة تغطي جميع المراحل التطويرية: الغلاف، الهوية البصرية، الرؤية، البنية التحتية، المصادقة، الهوية/نفاذ، الملف الطبي، الشات، الاجتماعات، الصيدلية، الإشعارات/AI، الخرائط/المواعيد، البانر/PWA/SEO، الأمان/Audit، لوحة الإدارة، الاختبار/النشر، الدفع، الأدوار، خارطة الطريق
- خلفية بيضاء مع ألوان الموقع (teal + primary)
- تنقل بالأسهم الجانبية، الكيبورد، والسحب باللمس
- شريط تقدم + عداد صفحات
- Mockup هاتف تفاعلي + أكواد Model
- دعم RTL كامل ومتجاوب مع جميع الشاشات

## الصفحة الرئيسية (Landing)
- تصميم فاخر مع particles متحركة، gradient overlay، إحصائيات أرقام متحركة
- 3 أزرار: تسجيل دخول، إنشاء حساب، تصفح المنصة
- قسم خدمات مع بطاقات متحركة (6 بطاقات)
- قسم CTA + فوتر
- دعم الوضع الليلي

## لوحة التحكم (Dashboard)
- **دعم الزوار**: يمكن تصفح المنصة بدون تسجيل دخول ("مرحباً، مستخدم")
- بانر ديناميكي مع gradient blend في الأسفل
- تبديل تلقائي كل 5 ثوانٍ + سحب باللمس
- قسم ترحيب premium مع حالة الحساب والدور
- **واجهة حسب الدور**: إحصائيات وإجراءات مختلفة لكل دور (مستفيد/أخصائي/صيدلي/مدير/مشرف/شركة/موظف/وكيل تأمين)
- إحصائيات بتصميم premium (glassmorphism + shine effects)
- إجراءات سريعة مخصصة حسب الدور مع glow hover effects
- آخر الاستشارات والطلبات مع روابط "عرض الكل"
- إشعارات مهمة مع تمييز الأولوية (عادي/مرتفع/عاجل)
- بطاقة فريق الرعاية الصحية مع تأثيرات بصرية متحركة

## لوحة الإدارة (Admin Panel)
- تصميم sidebar ثابت في جميع صفحات الإدارة (`admin-layout` + `admin-sidebar`)
- Sidebar partial: `client/views/partials/admin-sidebar.ejs`
- الصفحات: admin.ejs, admin-users.ejs, admin-consultations.ejs, admin-orders.ejs, admin-complaints.ejs, admin-banners.ejs, admin-invitations.ejs, admin-support.ejs, admin-email-templates.ejs
- إحصائيات مع أيقونات ملونة (users, consultations, orders, complaints, insurances)
- آخر المستخدمين والاستشارات والطلبات في لوحة التحكم الرئيسية
- التنقل: عام، خدمات، تواصل، إدارة

## التنقل حسب الدور (Header Navigation)
- `client/views/partials/header.ejs` يعرض روابط مختلفة حسب دور المستخدم
- الأدوار: patient, doctor, pharmacist, admin, moderator, company, employee, insurance_agent

## الخريطة (Maps)
- نموذج Location: name, type (hospital/pharmacy/physiotherapy_center), lat, lng, address, city, phone, workingHours
- خريطة تفاعلية باستخدام Leaflet.js مع بلاطات CARTO
- علامات مخصصة: أزرق لمراكز العلاج الطبيعي، أخضر للصيدليات
- حساب المسافة باستخدام صيغة Haversine + تقدير الوقت
- فتح في خرائط Google للتنقل
- فلترة حسب النوع (مراكز/مراكز علاج طبيعي/صيدلية) والمدينة
- إدارة المواقع للمدير: إضافة/حذف مع تحديد الإحداثيات بالنقر على الخريطة
- 18 موقع مبدئي (مراكز علاج طبيعي وصيدليات في الرياض وجدة ومكة والدمام والخبر والمدينة)
- المسارات: `/maps`, `/maps/api/locations`, `/maps/add`, `/maps/delete/:id`

## المواعيد والتذكيرات (Scheduler)
- **نظام المواعيد**: حجز مواعيد مع أخصائيين، تاريخ/وقت/مدة/مكان/ملاحظات
  - حالات: scheduled, confirmed, completed, cancelled, missed
  - تذكيرات: 15 دقيقة، 30 دقيقة، ساعة، يوم قبل الموعد
  - عرض منفصل للمواعيد القادمة والسابقة
  - تأكيد/إلغاء/حذف المواعيد
- **تذكيرات الأدوية**: اسم الدواء، الجرعة، أوقات متعددة، أيام محددة
  - تفعيل/إيقاف التذكير
  - تسجيل تناول الجرعة (taken)
  - تاريخ بدء وانتهاء اختياري
- النماذج: `server/modules/scheduler/appointment.model.js`, `reminder.model.js`
- المسارات: `/scheduler`, `/scheduler/appointments/add`, `/scheduler/reminders/add`
- API: `/scheduler/api/today` - مواعيد وتذكيرات اليوم

## PWA (تطبيق ويب تقدمي)
- **manifest.json**: اسم التطبيق، أيقونات (8 أحجام: 72-512px)، اختصارات سريعة (استشارة، صيدلية، مواعيد)
- **Service Worker** (`public/sw.js`):
  - تخزين مؤقت للملفات الثابتة (CSS, JS, أيقونات، خطوط)
  - استراتيجية Stale-While-Revalidate للأصول الثابتة
  - Network-first للصفحات مع عرض صفحة "غير متصل" كبديل
  - دعم Push Notifications مع أزرار (فتح/تجاهل)
  - اكتشاف التحديثات مع شريط "تحديث جديد متوفر"
- **Install App**: زر تثبيت في شريط التنقل (يظهر عند توفر `beforeinstallprompt`)
- **Offline Mode**: صفحة `/offline` مخصصة + شريط حالة اتصال أحمر
- **Push Notifications**: اشتراك تلقائي عبر VAPID keys + حفظ الاشتراك بقاعدة البيانات
- **Apple**: دعم `apple-mobile-web-app-capable` و `apple-touch-icon`

## SEO (تحسين محركات البحث)
- **SSR**: التطبيق يستخدم EJS (Server-Side Rendering) بالكامل — كل المحتوى يُعرض من الخادم
- **Meta Tags**: وصف ديناميكي، Open Graph، Twitter Cards، canonical URL، robots لكل صفحة
  - الصفحات الخاصة (login, admin) تستخدم `noindex, nofollow`
  - متغيرات EJS اختيارية: `metaDescription`, `canonicalUrl`, `metaImage`, `metaRobots`, `schemaMarkup`
- **robots.txt**: `/robots.txt` — يسمح بالزحف مع حظر `/admin/`, `/chat/`, `/api/`, `/profile/`
- **sitemap.xml**: `/sitemap.xml` — 9 صفحات عامة مع أولويات وتواتر التحديث
- **Schema.org Medical**: JSON-LD بنوع `MedicalBusiness` مع:
  - `MedicalTherapy` للاستشارات والصيدلية
  - `SearchAction` للبحث في الصيدلية
  - عنوان السعودية/الرياض
  - `pageSchema()` middleware لصفحات مخصصة (Pharmacy, MedicalClinic, ItemList)
- الملفات: `server/modules/seo/seo.routes.js`, `server/modules/seo/seo.middleware.js`

## سجل النشاطات (Audit Log)
- **النموذج**: `server/modules/audit/audit.model.js` — يسجل: userId, userName, userRole, action, category, details, targetId, targetType, ip, device, userAgent, method, path, statusCode, success
- **الخدمة**: `server/modules/audit/audit.service.js` — `logAudit()` لتسجيل الأحداث، `auditAction()` middleware تلقائي
  - `getClientIp()` يدعم X-Forwarded-For, X-Real-IP
  - `parseDevice()` يستخدم `ua-parser-js` لتحليل المتصفح/النظام/الجهاز
- **التصنيفات**: auth, user, consultation, pharmacy, insurance, admin, chat, notification, system, scheduler, maps
- **الأحداث المسجلة**: تسجيل دخول (كل الطرق)، محاولات فاشلة، تسجيل خروج، إنشاء مستخدم، تغيير أدوار
- **صفحة الإدارة**: `/admin/audit` — جدول مع فلاتر (تصنيف، إجراء، IP، تاريخ)، إحصائيات، pagination
- **تصدير CSV**: `/admin/audit/api/export` — تصدير حتى 5000 سجل بترميز UTF-8 BOM
- **فهارس MongoDB**: createdAt, userId, action, category, ip — للأداء

## التسجيل
- التسجيل للمستفيدين فقط (لا يوجد اختيار دور)
- المدير ينشئ الحسابات الأخرى (أخصائيين، صيادلة، مشرفين، شركات، موظفين)

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
- **الشخصيات**: 17+ شخصية (أخصائيين، صيادلة، موظفي دعم، مدير علاقات)
  - كل تخصص طبي له أخصائي باسم حقيقي ولقب مناسب
  - التوجيه التلقائي يختار الشخصية المناسبة حسب نوع الاستفسار
- **التوجيه الذكي**: تصنيف الطلبات (طبي/صيدلي/تأمين/شكوى/دعم) تلقائياً
- **التقارير**: تقارير طبية تبدو كأنها من أخصائي حقيقي (موقعة باسم الشخصية)
- **النموذج**: `server/modules/ai/ai-conversation.model.js`
- **الخدمة**: `server/modules/ai/ai.service.js`
- **المسارات**: `server/modules/ai/ai.routes.js`
- **الصفحة**: `client/views/pages/ai-assistant.ejs` (تصميم شات مع sidebar)
- **عنوان URL**: `/ai` - يظهر كـ"فريق الرعاية" في القائمة

## نظام الشات
- أنواع الغرف: `doctor`, `support`, `internal`, `consultation`
- صور الشخصيات (الأخصائيين/الدعم) في `public/avatars/` (SVG)
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
