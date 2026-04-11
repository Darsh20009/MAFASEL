const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');

router.get('/', isAuthenticated, (req, res) => {
  res.render('pages/ai-assistant', { title: 'المساعد الذكي' });
});

router.post('/chat', isAuthenticated, async (req, res) => {
  try {
    const { message } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.json({
        reply: 'عذراً، المساعد الذكي غير متاح حالياً. يرجى المحاولة لاحقاً.'
      });
    }

    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `أنت مساعد طبي ذكي في منصة "مفاصل" الطبية. تساعد المستخدمين في:
- الإجابة على الأسئلة الطبية العامة
- توجيههم للخدمات المناسبة في المنصة
- تقديم نصائح صحية عامة
- شرح الأدوية وآثارها الجانبية
تنبيه مهم: أنت لست بديلاً عن الطبيب. دائماً انصح بمراجعة الطبيب للحالات الخطيرة.
أجب باللغة العربية دائماً وبأسلوب مهني ولطيف.`
        },
        { role: 'user', content: message }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error('AI error:', err);
    res.json({ reply: 'عذراً، حدث خطأ في المساعد الذكي. يرجى المحاولة مرة أخرى.' });
  }
});

module.exports = router;
