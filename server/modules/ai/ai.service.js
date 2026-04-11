const Groq = require('groq-sdk');

let groqClient = null;

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

const SPECIALTIES = {
  'عظام': { keywords: ['مفصل', 'عظم', 'ركبة', 'ظهر', 'عمود فقري', 'كسر', 'خلع', 'غضروف', 'أربطة', 'كتف', 'رقبة', 'ورك', 'كاحل', 'معصم', 'تيبس', 'تآكل', 'هشاشة', 'التهاب مفاصل', 'روماتيزم', 'نقرس'], icon: 'fa-bone' },
  'باطنية': { keywords: ['معدة', 'بطن', 'هضم', 'كبد', 'كلى', 'ضغط', 'سكر', 'غدة', 'درقية', 'أمعاء', 'قولون', 'مغص', 'حرقة', 'ارتجاع', 'إسهال', 'إمساك', 'غثيان', 'تقيؤ'], icon: 'fa-stomach' },
  'قلب': { keywords: ['قلب', 'صدر', 'ضيق تنفس', 'خفقان', 'نبض', 'شريان', 'وريد', 'جلطة', 'ضغط دم', 'كوليسترول'], icon: 'fa-heartbeat' },
  'أعصاب': { keywords: ['صداع', 'دوخة', 'تنميل', 'شلل', 'عصب', 'دماغ', 'صرع', 'تشنج', 'ذاكرة', 'أرق', 'نوم'], icon: 'fa-brain' },
  'جلدية': { keywords: ['جلد', 'طفح', 'حكة', 'أكزيما', 'صدفية', 'حب شباب', 'بقع', 'تصبغ', 'شعر', 'أظافر', 'حساسية جلدية', 'حرق'], icon: 'fa-hand-dots' },
  'عيون': { keywords: ['عين', 'نظر', 'رؤية', 'ضبابية', 'احمرار عين', 'جفاف عين', 'ماء أبيض', 'ماء أزرق', 'شبكية'], icon: 'fa-eye' },
  'أنف وأذن وحنجرة': { keywords: ['أنف', 'أذن', 'حنجرة', 'سمع', 'بلع', 'لوز', 'جيوب', 'شخير', 'صوت', 'طنين'], icon: 'fa-ear-listen' },
  'أسنان': { keywords: ['سن', 'ضرس', 'لثة', 'تسوس', 'خلع', 'تقويم', 'زراعة أسنان', 'ألم أسنان', 'فك'], icon: 'fa-tooth' },
  'نفسية': { keywords: ['اكتئاب', 'قلق', 'توتر', 'خوف', 'وسواس', 'نفسي', 'مزاج', 'حزن', 'ذعر', 'رهاب', 'إدمان'], icon: 'fa-brain' },
  'أطفال': { keywords: ['طفل', 'رضيع', 'تطعيم', 'نمو', 'حرارة طفل', 'إسهال طفل', 'سعال طفل'], icon: 'fa-baby' },
  'نساء وتوليد': { keywords: ['حمل', 'ولادة', 'دورة', 'رحم', 'مبيض', 'هرمونات أنثوية', 'تبويض', 'عقم', 'نزيف'], icon: 'fa-person-pregnant' },
  'مسالك بولية': { keywords: ['بول', 'مثانة', 'بروستاتا', 'كلية', 'حصوة', 'التهاب بولي', 'تبول'], icon: 'fa-droplet' }
};

const DEPARTMENT_KEYWORDS = {
  medical: ['مرض', 'ألم', 'علاج', 'دواء', 'أعراض', 'تشخيص', 'فحص', 'تحليل', 'طبيب', 'عملية', 'جراحة', 'وصفة', 'حالة صحية', 'مستشفى', 'عيادة', 'صحة', 'مرضي', 'يؤلم', 'وجع', 'التهاب'],
  pharmacy: ['صيدلية', 'دواء', 'وصفة طبية', 'حبوب', 'شراب', 'مسكن', 'مضاد حيوي', 'فيتامين', 'جرعة', 'طلب دواء', 'سعر دواء', 'بديل دواء', 'تأثيرات جانبية', 'توصيل أدوية'],
  insurance: ['تأمين', 'بوليصة', 'تغطية', 'مطالبة', 'شبكة طبية', 'موافقة مسبقة', 'فئة تأمين', 'تأمين صحي', 'اشتراك تأمين', 'حد تأمين'],
  complaint: ['شكوى', 'مشكلة', 'خطأ', 'سوء', 'تأخير', 'إهمال', 'اعتراض', 'رفض', 'غير راضي', 'بلاغ'],
  support: ['مساعدة', 'كيف', 'طريقة', 'شرح', 'حساب', 'تسجيل', 'تطبيق', 'خطوات', 'إعدادات', 'تحديث', 'تغيير', 'حذف', 'إضافة', 'ربط', 'موقع']
};

function classifyIntent(message) {
  const msg = message.toLowerCase();
  const scores = {};

  for (const [dept, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    scores[dept] = 0;
    for (const keyword of keywords) {
      if (msg.includes(keyword)) {
        scores[dept] += 1;
      }
    }
  }

  let maxDept = 'general';
  let maxScore = 0;
  for (const [dept, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxDept = dept;
    }
  }

  const totalKeywords = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalKeywords > 0 ? maxScore / totalKeywords : 0;

  return {
    department: maxDept,
    confidence: Math.round(confidence * 100) / 100,
    scores
  };
}

function detectSpecialty(message) {
  const msg = message.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [specialty, data] of Object.entries(SPECIALTIES)) {
    let score = 0;
    for (const keyword of data.keywords) {
      if (msg.includes(keyword)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = specialty;
    }
  }

  return bestMatch ? { specialty: bestMatch, confidence: Math.min(bestScore / 3, 1), icon: SPECIALTIES[bestMatch].icon } : null;
}

function detectUrgency(message) {
  const msg = message.toLowerCase();
  const emergencyWords = ['طوارئ', 'إسعاف', 'نزيف حاد', 'فقدان وعي', 'سكتة', 'أزمة قلبية', 'اختناق', 'حادث', 'تسمم', 'لا يتنفس', 'إغماء'];
  const highWords = ['شديد', 'حاد', 'لا أستطيع', 'لا أقدر', 'مستمر', 'متواصل', 'حرارة مرتفعة', 'ألم شديد', 'دم', 'تورم كبير'];
  const mediumWords = ['متوسط', 'أحياناً', 'بين فترة', 'مزعج', 'يزداد', 'بدأ من'];

  for (const w of emergencyWords) { if (msg.includes(w)) return 'emergency'; }
  for (const w of highWords) { if (msg.includes(w)) return 'high'; }
  for (const w of mediumWords) { if (msg.includes(w)) return 'medium'; }
  return 'low';
}

function getSystemPrompt(type, userProfile) {
  const profileInfo = userProfile ? `
معلومات المريض:
- الاسم: ${userProfile.name}
- الجنس: ${userProfile.gender === 'male' ? 'ذكر' : userProfile.gender === 'female' ? 'أنثى' : 'غير محدد'}
- العمر: ${userProfile.dateOfBirth ? Math.floor((Date.now() - new Date(userProfile.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) + ' سنة' : 'غير محدد'}
- فصيلة الدم: ${userProfile.medicalProfile?.bloodType || 'غير محددة'}
- الأمراض المزمنة: ${userProfile.medicalProfile?.chronicDiseases?.join('، ') || 'لا يوجد'}
- الأدوية الحالية: ${userProfile.medicalProfile?.medications?.join('، ') || 'لا يوجد'}
- الحساسيات: ${userProfile.medicalProfile?.allergies?.join('، ') || 'لا يوجد'}` : '';

  const prompts = {
    medical: `أنت "مساعد مفاصل الطبي" - مساعد طبي ذكي متخصص في منصة مفاصل الطبية.

مهامك الأساسية:
1. تحليل الأعراض التي يصفها المستخدم بشكل منهجي
2. طرح أسئلة توضيحية لفهم الحالة بشكل أفضل (مثل: منذ متى؟ هل يزداد؟ هل هناك أعراض مصاحبة؟)
3. تقديم تحليل أولي محتمل مع التأكيد أنه ليس تشخيصاً نهائياً
4. اقتراح التخصص الطبي المناسب للحالة
5. تقديم نصائح فورية يمكن اتباعها قبل زيارة الطبيب
6. التحذير من أي علامات خطر تستوجب الذهاب للطوارئ فوراً

${profileInfo}

قواعد مهمة:
- أجب دائماً باللغة العربية بأسلوب مهني ولطيف وواضح
- لا تشخص أبداً بشكل قاطع - استخدم عبارات مثل "قد يكون" أو "من المحتمل"
- دائماً انصح بمراجعة الطبيب المختص
- إذا وصف المريض أعراض طوارئ، انصحه بالذهاب فوراً للطوارئ
- قدم إجابات منظمة وواضحة باستخدام النقاط والترقيم
- اعرض دائماً إمكانية حجز استشارة مع طبيب عبر المنصة
- اذكر في نهاية الرد إمكانية إحالته لطبيب متخصص عبر المنصة`,

    support: `أنت "مساعد مفاصل للدعم الفني" - مساعد دعم فني ذكي في منصة مفاصل الطبية.

مهامك:
1. مساعدة المستخدمين في استخدام المنصة وشرح الميزات
2. حل المشاكل التقنية الشائعة
3. شرح خطوات العمليات (تسجيل، حجز استشارة، طلب أدوية، التأمين)
4. توجيه المستخدم للقسم المناسب
5. اقتراح حلول قبل تصعيد المشكلة للدعم البشري

خدمات المنصة المتاحة:
- الاستشارات الطبية: حجز استشارة مع طبيب متخصص (/consultations/new)
- الصيدلية: طلب أدوية وتوصيلها (/pharmacy)
- التأمين الصحي: إدارة بوليصة التأمين (/insurance)
- الملف الطبي: تحديث البيانات الصحية (/profile)
- الشكاوى: تقديم شكوى أو ملاحظة (/complaints)
- المحادثات: التواصل مع الطبيب (/chat)

أجب باللغة العربية بأسلوب ودود ومساعد. إذا لم تستطع حل المشكلة، اعرض تصعيدها للدعم البشري.`,

    insurance: `أنت مساعد ذكي متخصص في التأمين الصحي في منصة مفاصل.

مهامك:
1. شرح أنواع التأمين المتاحة وتغطياتها
2. مساعدة المستخدم في فهم بوليصته
3. شرح إجراءات المطالبات
4. توضيح شبكة مقدمي الخدمة
5. الإجابة على أسئلة التغطية والاستثناءات

أجب باللغة العربية بشكل واضح ومبسط.`,

    pharmacy: `أنت مساعد ذكي متخصص في الصيدلية في منصة مفاصل.

مهامك:
1. الإجابة على أسئلة الأدوية (الاستخدام، الجرعات، التأثيرات الجانبية)
2. شرح بدائل الأدوية المتاحة
3. التحذير من التفاعلات الدوائية
4. مساعدة المستخدم في طلب الأدوية

${profileInfo}

تنبيه: لا تصف أدوية جديدة - فقط أجب عن الأسئلة واقترح مراجعة الطبيب للوصفات.
أجب باللغة العربية بأسلوب مهني.`,

    general: `أنت "مساعد مفاصل الذكي" - المساعد الرئيسي في منصة مفاصل الطبية.

مهامك:
1. الترحيب بالمستخدمين والإجابة على أسئلتهم العامة
2. توجيههم للقسم المناسب حسب حاجتهم
3. تقديم معلومات عامة عن المنصة وخدماتها
4. تحديد نوع الطلب وتحويله تلقائياً

الأقسام المتاحة:
- طبي: استشارات وتحليل أعراض
- صيدلية: أسئلة عن الأدوية وطلبها
- تأمين: أسئلة التأمين الصحي
- دعم فني: مساعدة في استخدام المنصة
- شكاوى: تقديم شكوى أو ملاحظة

${profileInfo}

أجب باللغة العربية بأسلوب مرح ومهني. وجّه المستخدم للقسم المناسب عند الحاجة.`,

    complaint: `أنت مساعد ذكي لاستقبال الشكاوى والملاحظات في منصة مفاصل.

مهامك:
1. الاستماع للشكوى بعناية وتعاطف
2. محاولة حل المشكلة إذا كانت بسيطة
3. توثيق تفاصيل الشكوى
4. اقتراح حلول قبل التصعيد
5. إبلاغ المستخدم بآلية المتابعة

أجب باللغة العربية بأسلوب متعاطف ومهني. أكد للمستخدم أن ملاحظاته مهمة.`
  };

  return prompts[type] || prompts.general;
}

async function chat(messages, type, userProfile) {
  const groq = getGroqClient();
  if (!groq) {
    return { reply: 'عذراً، المساعد الذكي غير متاح حالياً. يرجى المحاولة لاحقاً.', error: true };
  }

  const systemPrompt = getSystemPrompt(type, userProfile);

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  try {
    const completion = await groq.chat.completions.create({
      messages: apiMessages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1500
    });

    return { reply: completion.choices[0].message.content };
  } catch (err) {
    console.error('Groq API error:', err.message);
    return { reply: 'عذراً، حدث خطأ في المساعد الذكي. يرجى المحاولة مرة أخرى.', error: true };
  }
}

async function analyzeAndRoute(message, conversationHistory) {
  const intent = classifyIntent(message);
  const specialty = detectSpecialty(message);
  const urgency = detectUrgency(message);

  let department = intent.department;
  if (department === 'general' && specialty) {
    department = 'medical';
  }

  const suggestions = [];
  const actions = [];

  switch (department) {
    case 'medical':
      if (urgency === 'emergency') {
        suggestions.push('حالتك تبدو طارئة! يرجى التوجه لأقرب طوارئ فوراً أو الاتصال بالإسعاف.');
      }
      if (specialty) {
        suggestions.push(`بناءً على وصفك، قد تحتاج لاستشارة طبيب ${specialty.specialty}`);
        actions.push({ type: 'referral', label: `حجز استشارة ${specialty.specialty}`, url: `/consultations/new?specialty=${encodeURIComponent(specialty.specialty)}`, icon: specialty.icon });
      }
      actions.push({ type: 'consultation', label: 'حجز استشارة طبية', url: '/consultations/new', icon: 'fa-stethoscope' });
      break;

    case 'pharmacy':
      actions.push({ type: 'pharmacy', label: 'تصفح الصيدلية', url: '/pharmacy', icon: 'fa-pills' });
      break;

    case 'insurance':
      actions.push({ type: 'insurance', label: 'إدارة التأمين', url: '/insurance', icon: 'fa-shield-alt' });
      break;

    case 'complaint':
      suggestions.push('يمكنك تقديم شكوى رسمية وسيتم متابعتها من فريق الدعم');
      actions.push({ type: 'complaint', label: 'تقديم شكوى', url: '/complaints', icon: 'fa-comment-dots' });
      break;

    case 'support':
      suggestions.push('سأحاول مساعدتك. إذا لم أستطع حل مشكلتك، يمكنني تحويلك للدعم البشري.');
      break;
  }

  return {
    department,
    confidence: intent.confidence,
    specialty: specialty ? specialty.specialty : null,
    urgency,
    suggestions,
    actions,
    scores: intent.scores
  };
}

module.exports = {
  chat,
  classifyIntent,
  detectSpecialty,
  detectUrgency,
  analyzeAndRoute,
  getGroqClient,
  SPECIALTIES
};
