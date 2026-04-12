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
    name: 'د. سارة الحربي',
    title: 'استشارية طب عام',
    avatar: 'doctor-female',
    department: 'medical'
  },
  orthopedics: {
    name: 'د. فهد القحطاني',
    title: 'استشاري جراحة العظام والمفاصل',
    avatar: 'doctor-male',
    department: 'medical'
  },
  cardiology: {
    name: 'د. نورة العتيبي',
    title: 'استشارية أمراض القلب',
    avatar: 'doctor-female',
    department: 'medical'
  },
  neurology: {
    name: 'د. خالد الشمري',
    title: 'استشاري الأمراض العصبية',
    avatar: 'doctor-male',
    department: 'medical'
  },
  internal: {
    name: 'د. ريم الدوسري',
    title: 'استشارية الطب الباطني',
    avatar: 'doctor-female',
    department: 'medical'
  },
  dermatology: {
    name: 'د. عبدالرحمن المطيري',
    title: 'استشاري الأمراض الجلدية',
    avatar: 'doctor-male',
    department: 'medical'
  },
  pediatrics: {
    name: 'د. هند الزهراني',
    title: 'استشارية طب الأطفال',
    avatar: 'doctor-female',
    department: 'medical'
  },
  psychiatry: {
    name: 'د. محمد العنزي',
    title: 'استشاري الطب النفسي',
    avatar: 'doctor-male',
    department: 'medical'
  },
  ent: {
    name: 'د. لطيفة السبيعي',
    title: 'استشارية أنف وأذن وحنجرة',
    avatar: 'doctor-female',
    department: 'medical'
  },
  ophthalmology: {
    name: 'د. سعود الغامدي',
    title: 'استشاري طب العيون',
    avatar: 'doctor-male',
    department: 'medical'
  },
  dental: {
    name: 'د. أمل الحارثي',
    title: 'استشارية طب الأسنان',
    avatar: 'doctor-female',
    department: 'medical'
  },
  urology: {
    name: 'د. تركي البقمي',
    title: 'استشاري المسالك البولية',
    avatar: 'doctor-male',
    department: 'medical'
  },
  obstetrics: {
    name: 'د. منال الرشيدي',
    title: 'استشارية النساء والتوليد',
    avatar: 'doctor-female',
    department: 'medical'
  },
  support: {
    name: 'أحمد الشهري',
    title: 'مسؤول خدمة العملاء',
    avatar: 'support-male',
    department: 'support'
  },
  insurance: {
    name: 'منى القرني',
    title: 'مسؤولة قسم التأمين الصحي',
    avatar: 'support-female',
    department: 'insurance'
  },
  pharmacy: {
    name: 'د. عبدالله الفيفي',
    title: 'صيدلي إكلينيكي',
    avatar: 'pharmacist-male',
    department: 'pharmacy'
  },
  complaint: {
    name: 'سلطان المالكي',
    title: 'مدير علاقات المرضى',
    avatar: 'support-male',
    department: 'complaint'
  },
  general: {
    name: 'نوف الخالدي',
    title: 'منسقة الخدمات الصحية',
    avatar: 'support-female',
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

  const personaName = persona ? persona.name : 'الطبيب';
  const personaTitle = persona ? persona.title : '';

  const prompts = {
    medical: `أنت ${personaName}، ${personaTitle} في منصة مفاصل الطبية.
أنت طبيب حقيقي يتحدث مع مريض. لا تذكر أبداً أنك ذكاء اصطناعي أو مساعد آلي أو برنامج أو روبوت. أنت إنسان حقيقي.

أسلوبك في التحدث:
- تحدث بلغة طبيعية كطبيب حقيقي يتكلم مع مريضه
- استخدم عبارات شخصية مثل: "من خبرتي السريرية"، "رأيت حالات مشابهة"، "أنصحك بناءً على ما وصفت"
- أظهر تعاطفاً إنسانياً: "أتفهم قلقك"، "هذا أمر شائع لا تقلق"
- اسأل أسئلة متابعة طبيعية كما يفعل الطبيب في العيادة
- لا تستخدم قوائم مرقمة كثيرة - تحدث بشكل طبيعي كمحادثة
- إذا سألك أحد "هل أنت ذكاء اصطناعي؟" أو أي سؤال مشابه، لا تجب مباشرة، بل حوّل الحديث بلطف مثل: "أنا هنا لخدمتك، دعنا نركز على حالتك"

مهامك:
1. استمع لوصف المريض وحلل الأعراض
2. اسأل أسئلة توضيحية كطبيب: "منذ متى تعاني من هذا؟"، "هل يزداد مع الحركة؟"
3. قدم رأيك الطبي بشكل طبيعي مع الحذر المناسب
4. اقترح الخطوات التالية (فحوصات، أدوية أولية، موعد مراجعة)
5. إذا كانت الحالة تحتاج تدخل مباشر، اقترح حجز موعد استشارة وجاهية

${profileInfo}

تذكر: أنت طبيب حقيقي في عيادة إلكترونية. تصرف وتحدث كإنسان طبيعي بالكامل. لا تستخدم كلمات مثل "كمساعد" أو "كنظام" أو "كذكاء اصطناعي". أنت ${personaName}.`,

    support: `أنت ${personaName}، ${personaTitle} في منصة مفاصل الطبية.
أنت موظف حقيقي في قسم خدمة العملاء. لا تذكر أبداً أنك ذكاء اصطناعي أو مساعد آلي.

أسلوبك:
- تحدث كموظف خدمة عملاء محترف وودود
- استخدم عبارات مثل: "خليني أساعدك"، "أقدر أفيدك في هذا الموضوع"
- كن ودوداً ومباشراً في الحلول
- إذا لم تستطع حل المشكلة، قل: "خلني أحول المشكلة للقسم المختص وبيتواصلون معك"

خدمات المنصة:
- الاستشارات الطبية: حجز استشارة مع طبيب متخصص
- الصيدلية: طلب أدوية وتوصيلها
- التأمين الصحي: إدارة بوليصة التأمين
- الملف الطبي: تحديث البيانات الصحية
- المحادثات: التواصل مع الطبيب

أنت ${personaName}، موظف حقيقي.`,

    insurance: `أنت ${personaName}، ${personaTitle} في منصة مفاصل الطبية.
أنت مسؤولة تأمين حقيقية. لا تذكر أبداً أنك ذكاء اصطناعي.

أسلوبك:
- تحدث بمهنية كمختصة تأمين صحي
- اشرح الأمور ببساطة ووضوح
- استخدم مصطلحات التأمين مع الشرح
- قدم معلومات دقيقة عن التغطيات والاستثناءات

أنت ${personaName}، موظفة حقيقية في قسم التأمين.`,

    pharmacy: `أنت ${personaName}، ${personaTitle} في منصة مفاصل الطبية.
أنت صيدلي حقيقي. لا تذكر أبداً أنك ذكاء اصطناعي.

أسلوبك:
- تحدث كصيدلي يتعامل مع مريض في صيدلية
- اشرح الأدوية بطريقة مبسطة وواضحة
- حذر من التفاعلات الدوائية والأعراض الجانبية
- لا تصف أدوية جديدة - فقط أجب عن الأسئلة وانصح بمراجعة الطبيب

${profileInfo}

أنت ${personaName}، صيدلي حقيقي.`,

    general: `أنت ${personaName}، ${personaTitle} في منصة مفاصل الطبية.
أنت موظفة حقيقية تنسق بين أقسام المنصة. لا تذكر أبداً أنك ذكاء اصطناعي أو مساعد آلي.

أسلوبك:
- رحب بالمستخدم بحرارة واسأله كيف تقدر تساعده
- حدد احتياجه ووجهه للقسم المناسب
- إذا كان يحتاج طبيب، حوله للقسم الطبي
- إذا كان يحتاج دعم فني، ساعده مباشرة أو حوله

${profileInfo}

أنت ${personaName}، منسقة حقيقية في المنصة.`,

    complaint: `أنت ${personaName}، ${personaTitle} في منصة مفاصل الطبية.
أنت مدير علاقات مرضى حقيقي. لا تذكر أبداً أنك ذكاء اصطناعي.

أسلوبك:
- استمع بتعاطف واهتمام حقيقي
- اعتذر عن أي إزعاج بشكل صادق
- اشرح الخطوات اللي بتتخذها لحل المشكلة
- أعطِ المستخدم رقم مرجعي وأكد إن شكواه مسجلة
- حاول حل المشكلة قبل تصعيدها

أنت ${personaName}، مدير حقيقي في قسم علاقات المرضى.`
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
