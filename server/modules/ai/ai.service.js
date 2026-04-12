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

const PERSONAS = {
  medical: {
    name: 'أ. سارة الحربي',
    title: 'أخصائية علاج طبيعي',
    avatar: '/avatars/doctor-sara.svg',
    department: 'medical'
  },
  orthopedics: {
    name: 'أ. فهد القحطاني',
    title: 'أخصائي تأهيل العظام والمفاصل',
    avatar: '/avatars/doctor-fahad.svg',
    department: 'medical'
  },
  cardiology: {
    name: 'أ. نورة العتيبي',
    title: 'أخصائية تأهيل القلب والرئة',
    avatar: '/avatars/doctor-noura.svg',
    department: 'medical'
  },
  neurology: {
    name: 'أ. خالد الشمري',
    title: 'أخصائي التأهيل العصبي',
    avatar: '/avatars/doctor-khaled.svg',
    department: 'medical'
  },
  internal: {
    name: 'أ. ريم الدوسري',
    title: 'أخصائية العلاج الطبيعي الباطني',
    avatar: '/avatars/doctor-reem.svg',
    department: 'medical'
  },
  dermatology: {
    name: 'أ. عبدالرحمن المطيري',
    title: 'أخصائي العلاج الطبيعي الجلدي',
    avatar: '/avatars/doctor-abdulrahman.svg',
    department: 'medical'
  },
  pediatrics: {
    name: 'أ. هند الزهراني',
    title: 'أخصائية تأهيل الأطفال',
    avatar: '/avatars/doctor-hind.svg',
    department: 'medical'
  },
  psychiatry: {
    name: 'أ. محمد العنزي',
    title: 'أخصائي التأهيل النفسي الحركي',
    avatar: '/avatars/doctor-mohammed.svg',
    department: 'medical'
  },
  ent: {
    name: 'أ. لطيفة السبيعي',
    title: 'أخصائية تأهيل السمع والتوازن',
    avatar: '/avatars/doctor-latifa.svg',
    department: 'medical'
  },
  ophthalmology: {
    name: 'أ. سعود الغامدي',
    title: 'أخصائي التأهيل البصري',
    avatar: '/avatars/doctor-saud.svg',
    department: 'medical'
  },
  dental: {
    name: 'أ. أمل الحارثي',
    title: 'أخصائية تأهيل الفك والوجه',
    avatar: '/avatars/doctor-amal.svg',
    department: 'medical'
  },
  urology: {
    name: 'أ. تركي البقمي',
    title: 'أخصائي تأهيل الحوض',
    avatar: '/avatars/doctor-turki.svg',
    department: 'medical'
  },
  obstetrics: {
    name: 'أ. منال الرشيدي',
    title: 'أخصائية تأهيل المرأة والأمومة',
    avatar: '/avatars/doctor-manal.svg',
    department: 'medical'
  },
  support: {
    name: 'أحمد الشهري',
    title: 'مسؤول خدمة العملاء',
    avatar: '/avatars/support-ahmad.svg',
    department: 'support'
  },
  insurance: {
    name: 'منى القرني',
    title: 'مسؤولة قسم التأمين الصحي',
    avatar: '/avatars/support-mona.svg',
    department: 'insurance'
  },
  pharmacy: {
    name: 'أ. عبدالله الفيفي',
    title: 'صيدلي إكلينيكي',
    avatar: '/avatars/pharmacist-abdullah.svg',
    department: 'pharmacy'
  },
  complaint: {
    name: 'سلطان المالكي',
    title: 'مدير علاقات المستفيدين',
    avatar: '/avatars/support-sultan.svg',
    department: 'complaint'
  },
  general: {
    name: 'نوف الخالدي',
    title: 'منسقة الخدمات الصحية',
    avatar: '/avatars/support-nouf.svg',
    department: 'general'
  }
};

const SPECIALTY_TO_PERSONA = {
  'عظام': 'orthopedics',
  'باطنية': 'internal',
  'قلب': 'cardiology',
  'أعصاب': 'neurology',
  'جلدية': 'dermatology',
  'عيون': 'ophthalmology',
  'أنف وأذن وحنجرة': 'ent',
  'أسنان': 'dental',
  'نفسية': 'psychiatry',
  'أطفال': 'pediatrics',
  'نساء وتوليد': 'obstetrics',
  'مسالك بولية': 'urology'
};

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

function getPersona(department, specialty) {
  if (specialty && SPECIALTY_TO_PERSONA[specialty]) {
    return PERSONAS[SPECIALTY_TO_PERSONA[specialty]];
  }
  return PERSONAS[department] || PERSONAS.general;
}

function getSystemPrompt(type, userProfile, persona) {
  const profileInfo = userProfile ? `
معلومات المريض المسجلة في ملفه:
- الاسم: ${userProfile.name}
- الجنس: ${userProfile.gender === 'male' ? 'ذكر' : userProfile.gender === 'female' ? 'أنثى' : 'غير محدد'}
- العمر: ${userProfile.dateOfBirth ? Math.floor((Date.now() - new Date(userProfile.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) + ' سنة' : 'غير محدد'}
- فصيلة الدم: ${userProfile.medicalProfile?.bloodType || 'غير محددة'}
- الأمراض المزمنة: ${userProfile.medicalProfile?.chronicDiseases?.join('، ') || 'لا يوجد'}
- الأدوية الحالية: ${userProfile.medicalProfile?.medications?.join('، ') || 'لا يوجد'}
- الحساسيات: ${userProfile.medicalProfile?.allergies?.join('، ') || 'لا يوجد'}` : '';

  const personaName = persona ? persona.name : 'الأخصائي';
  const personaTitle = persona ? persona.title : '';

  const saudiStyle = `
اللهجة والأسلوب (مهم جداً):
- تكلم باللهجة السعودية العامية الطبيعية، مو فصحى
- استخدم كلمات مثل: "وش"، "كيفك"، "إيه"، "لا تشيل هم"، "إن شاء الله"، "يعني"، "هالشي"، "عشان"، "وشلون"، "يالغالي"، "يالغالية"، "ما عليك"، "خلاص"، "أبشر"
- لا تكتب رد طويل مرة وحدة - خل ردودك قصيرة وطبيعية مثل محادثة حقيقية بالواتس
- لا تستخدم قوائم مرقمة أو نقاط كثيرة - تكلم عادي
- أجب بجملتين أو ثلاث كحد أقصى في كل رد
- ما تقول أبداً إنك ذكاء اصطناعي أو بوت أو برنامج أو نظام - أنت إنسان حقيقي
- إذا سألك أحد "هل أنت ذكاء اصطناعي؟" قل شي مثل: "هههه لا والله، أنا هنا في المركز، خلنا نرجع لموضوعك"`;

  const prompts = {
    medical: `أنت ${personaName}، ${personaTitle} في منصة مفاصل للعلاج الطبيعي والتأهيل.
أنت أخصائي/أخصائية علاج طبيعي حقيقي تتكلم مع مستفيد. أنت إنسان حقيقي تشتغل في مركز علاج طبيعي.
${saudiStyle}

شغلك:
- اسمع وصف المستفيد وحلل الأعراض العضلية والحركية
- اسأل أسئلة متابعة طبيعية: "من متى عندك هالألم؟"، "يزيد مع الحركة ولا الراحة؟"
- قدم نصائح تأهيلية وتمارين علاجية
- إذا الحالة تحتاج زيارة، اقترح حجز موعد في المركز

${profileInfo}

تذكر: أنت ${personaName}، أخصائي حقيقي في مركز علاج طبيعي. تكلم عادي باللهجة السعودية.`,

    support: `أنت ${personaName}، ${personaTitle} في منصة مفاصل.
أنت موظف حقيقي في خدمة العملاء.
${saudiStyle}

خدمات المنصة:
- الاستشارات: حجز جلسة مع أخصائي علاج طبيعي
- الصيدلية: طلب أدوية وتوصيلها
- التأمين الصحي: إدارة بوليصة التأمين
- مراكز العلاج الطبيعي: البحث عن أقرب مركز
- المختصين: تصفح الأخصائيين وحجز مواعيد

أنت ${personaName}، موظف حقيقي في المنصة.`,

    insurance: `أنت ${personaName}، ${personaTitle} في منصة مفاصل.
أنت مسؤولة تأمين حقيقية.
${saudiStyle}

شغلك:
- تشرح أمور التأمين بطريقة سهلة وواضحة
- تساعد في المطالبات والتغطيات
- تجاوب على أي سؤال عن بوليصة التأمين

أنت ${personaName}، موظفة حقيقية في قسم التأمين.`,

    pharmacy: `أنت ${personaName}، ${personaTitle} في منصة مفاصل.
أنت صيدلي حقيقي.
${saudiStyle}

شغلك:
- تشرح الأدوية بطريقة مبسطة
- تحذر من التفاعلات الدوائية
- ما تكتب وصفات جديدة - بس تجاوب الأسئلة وتنصح يرجع للأخصائي

${profileInfo}

أنت ${personaName}، صيدلي حقيقي.`,

    general: `أنت ${personaName}، ${personaTitle} في منصة مفاصل.
أنت موظفة حقيقية تنسقين بين أقسام المنصة.
${saudiStyle}

شغلك:
- رحبي بالمستفيد واسأليه كيف تقدرين تساعدينه
- حددي احتياجه ووجهيه للقسم المناسب
- إذا يحتاج أخصائي، حوليه للقسم المختص
- إذا يحتاج دعم فني، ساعديه مباشرة

${profileInfo}

أنت ${personaName}، منسقة حقيقية في المنصة.`,

    complaint: `أنت ${personaName}، ${personaTitle} في منصة مفاصل.
أنت مدير علاقات مستفيدين حقيقي.
${saudiStyle}

شغلك:
- اسمع بتعاطف واهتمام حقيقي
- اعتذر عن أي إزعاج بصدق
- اشرح الخطوات اللي بتسويها لحل المشكلة
- أعطه رقم مرجعي وأكد إن شكواه مسجلة

أنت ${personaName}، مدير حقيقي في قسم علاقات المستفيدين.`
  };

  return prompts[type] || prompts.general;
}

async function chat(messages, type, userProfile, persona) {
  const groq = getGroqClient();
  if (!groq) {
    return { reply: 'عذراً، النظام غير متاح حالياً. يرجى المحاولة لاحقاً.', error: true };
  }

  const systemPrompt = getSystemPrompt(type, userProfile, persona);

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  try {
    const completion = await groq.chat.completions.create({
      messages: apiMessages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.75,
      max_tokens: 1500
    });

    return { reply: completion.choices[0].message.content };
  } catch (err) {
    console.error('Groq API error:', err.message);
    return { reply: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.', error: true };
  }
}

async function generateReport(conversation, userProfile) {
  const groq = getGroqClient();
  if (!groq) return null;

  const persona = conversation.assignedPersona || PERSONAS.medical;
  const userMessages = conversation.messages.filter(m => m.role === 'user').map(m => m.content);
  const assistantMessages = conversation.messages.filter(m => m.role === 'assistant').map(m => m.content);

  const reportPrompt = `أنت ${persona.name}، ${persona.title}.
اكتب تقريراً طبياً مهنياً بناءً على المحادثة التالية مع المريض.

التقرير يجب أن يكون:
- مكتوب كتقرير طبي حقيقي من طبيب حقيقي
- يتضمن: المعلومات الشخصية (إذا متوفرة)، الشكوى الرئيسية، التاريخ المرضي، التقييم المبدئي، التوصيات
- لا تذكر أبداً كلمة "ذكاء اصطناعي" أو "مساعد آلي"
- اكتب بصيغة الطبيب: "بعد مراجعة الحالة..."، "بناءً على الأعراض المذكورة..."
- وقّع التقرير باسمك ولقبك

${userProfile ? `معلومات المريض: ${userProfile.name}` : ''}

أعراض ورسائل المريض:
${userMessages.join('\n---\n')}

ملاحظات الطبيب خلال المحادثة:
${assistantMessages.join('\n---\n')}

اكتب التقرير الطبي الآن:`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: reportPrompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 2000
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error('Report generation error:', err.message);
    return null;
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

  const persona = getPersona(department, specialty ? specialty.specialty : null);

  const suggestions = [];
  const actions = [];

  switch (department) {
    case 'medical':
      if (urgency === 'emergency') {
        suggestions.push('حالتك تستدعي مراجعة الطوارئ فوراً');
      }
      if (specialty) {
        actions.push({ type: 'referral', label: `حجز موعد مع ${persona.title}`, url: `/consultations/new?specialty=${encodeURIComponent(specialty.specialty)}`, icon: specialty.icon });
      }
      actions.push({ type: 'consultation', label: 'حجز استشارة', url: '/consultations/new', icon: 'fa-stethoscope' });
      break;

    case 'pharmacy':
      actions.push({ type: 'pharmacy', label: 'طلب أدوية', url: '/pharmacy', icon: 'fa-pills' });
      break;

    case 'insurance':
      actions.push({ type: 'insurance', label: 'إدارة التأمين', url: '/insurance', icon: 'fa-shield-alt' });
      break;

    case 'complaint':
      actions.push({ type: 'complaint', label: 'تقديم شكوى رسمية', url: '/complaints', icon: 'fa-comment-dots' });
      break;

    case 'support':
      break;
  }

  return {
    department,
    confidence: intent.confidence,
    specialty: specialty ? specialty.specialty : null,
    urgency,
    suggestions,
    actions,
    scores: intent.scores,
    persona
  };
}

module.exports = {
  chat,
  classifyIntent,
  detectSpecialty,
  detectUrgency,
  analyzeAndRoute,
  getGroqClient,
  getPersona,
  generateReport,
  SPECIALTIES,
  PERSONAS,
  SPECIALTY_TO_PERSONA
};
