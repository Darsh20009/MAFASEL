const fs = require('fs');
const path = require('path');

const translations = {};

function loadTranslations() {
  const localesDir = path.join(__dirname, '../../locales');
  const files = fs.readdirSync(localesDir).filter(f => /^[a-z]{2}\.json$/.test(f));
  files.forEach(file => {
    const lang = file.replace('.json', '');
    translations[lang] = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
  });
}

loadTranslations();

function t(key, lang) {
  const dict = translations[lang] || translations['ar'];
  const keys = key.split('.');
  let val = dict;
  for (const k of keys) {
    if (val && typeof val === 'object' && k in val) {
      val = val[k];
    } else {
      const fallback = translations['ar'];
      let fVal = fallback;
      for (const fk of keys) {
        if (fVal && typeof fVal === 'object' && fk in fVal) {
          fVal = fVal[fk];
        } else {
          return key;
        }
      }
      return fVal;
    }
  }
  return val;
}

function getCookieLang(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)lang=([a-z]{2})/);
  return match ? match[1] : null;
}

function i18nMiddleware(req, res, next) {
  let lang = req.query.lang || getCookieLang(req) || (req.session && req.session.lang) || 'ar';
  if (!translations[lang]) lang = 'ar';

  if (req.query.lang && translations[req.query.lang]) {
    res.cookie('lang', req.query.lang, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: false });
    lang = req.query.lang;
  }

  req.lang = lang;
  res.locals.lang = lang;
  res.locals.dir = lang === 'ar' ? 'rtl' : 'ltr';
  res.locals.t = function(key) { return t(key, lang); };
  res.locals.translations = translations[lang] || translations['ar'];

  next();
}

module.exports = { i18nMiddleware, t, translations };
