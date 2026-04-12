const express = require('express');
const router = express.Router();

router.get('/robots.txt', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /chat/
Disallow: /notifications/
Disallow: /profile/
Disallow: /api/
Disallow: /medical-profile/

Sitemap: ${baseUrl}/sitemap.xml
`);
});

router.get('/sitemap.xml', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const today = new Date().toISOString().split('T')[0];

  const pages = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/login', priority: '0.8', changefreq: 'monthly' },
    { loc: '/register', priority: '0.8', changefreq: 'monthly' },
    { loc: '/consultations', priority: '0.9', changefreq: 'daily' },
    { loc: '/pharmacy', priority: '0.9', changefreq: 'daily' },
    { loc: '/insurance', priority: '0.7', changefreq: 'weekly' },
    { loc: '/maps', priority: '0.7', changefreq: 'weekly' },
    { loc: '/scheduler', priority: '0.7', changefreq: 'daily' },
    { loc: '/ai', priority: '0.6', changefreq: 'weekly' },
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const page of pages) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${page.loc}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  res.type('application/xml');
  res.send(xml);
});

module.exports = router;
