function seoDefaults(req, res, next) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.locals.canonicalUrl = baseUrl + req.originalUrl.split('?')[0];
  res.locals.metaDescription = null;
  res.locals.metaImage = null;
  res.locals.metaRobots = null;
  res.locals.schemaMarkup = null;
  next();
}

function medicalPlatformSchema(req, res, next) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  if (!res.locals.schemaMarkup) {
    res.locals.schemaMarkup = {
      "@context": "https://schema.org",
      "@type": "MedicalBusiness",
      "name": "مفاصل",
      "alternateName": "Mafasel",
      "description": "منصة مفاصل الطبية الرقمية المتكاملة - استشارات طبية، صيدلية إلكترونية، تأمين صحي، مساعد ذكي بالذكاء الاصطناعي",
      "url": baseUrl,
      "logo": baseUrl + "/icons/icon-512.png",
      "image": baseUrl + "/icons/icon-512.png",
      "telephone": "",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "SA",
        "addressLocality": "الرياض"
      },
      "areaServed": {
        "@type": "Country",
        "name": "المملكة العربية السعودية"
      },
      "availableService": [
        {
          "@type": "MedicalTherapy",
          "name": "استشارات طبية عن بُعد",
          "description": "استشارات طبية مع أطباء متخصصين عبر الإنترنت"
        },
        {
          "@type": "MedicalTherapy",
          "name": "صيدلية إلكترونية",
          "description": "طلب الأدوية والمستلزمات الطبية إلكترونياً"
        }
      ],
      "sameAs": [],
      "potentialAction": {
        "@type": "SearchAction",
        "target": baseUrl + "/pharmacy?search={search_term}",
        "query-input": "required name=search_term"
      }
    };
  }
  next();
}

function pageSchema(type, data) {
  return function(req, res, next) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    if (type === 'pharmacy') {
      res.locals.schemaMarkup = {
        "@context": "https://schema.org",
        "@type": "Pharmacy",
        "name": "صيدلية مفاصل",
        "description": "صيدلية إلكترونية متكاملة - أدوية، مستلزمات طبية، توصيل سريع",
        "url": baseUrl + "/pharmacy",
        "image": baseUrl + "/icons/icon-512.png",
        "address": { "@type": "PostalAddress", "addressCountry": "SA" },
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "كتالوج الأدوية والمنتجات الصحية"
        }
      };
    } else if (type === 'consultation') {
      res.locals.schemaMarkup = {
        "@context": "https://schema.org",
        "@type": "MedicalClinic",
        "name": "استشارات مفاصل الطبية",
        "description": "استشارات طبية متخصصة عن بُعد مع أفضل الأطباء",
        "url": baseUrl + "/consultations",
        "image": baseUrl + "/icons/icon-512.png",
        "medicalSpecialty": "GeneralPractice",
        "availableService": {
          "@type": "MedicalTherapy",
          "name": "استشارة طبية إلكترونية"
        }
      };
    } else if (type === 'maps') {
      res.locals.schemaMarkup = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "خريطة المستشفيات والصيدليات",
        "description": "مواقع المستشفيات والصيدليات في المملكة العربية السعودية",
        "url": baseUrl + "/maps"
      };
    }
    next();
  };
}

module.exports = { seoDefaults, medicalPlatformSchema, pageSchema };
