const express = require('express');
const router = express.Router();
const Location = require('./location.model');
const { isAuthenticated, isAdmin } = require('../../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.type && ['hospital', 'pharmacy', 'physiotherapy_center'].includes(req.query.type)) {
      filter.type = req.query.type;
    }
    if (req.query.city) {
      filter.city = new RegExp(req.query.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    const locations = await Location.find(filter).sort({ name: 1 });
    const cities = await Location.distinct('city', { isActive: true });
    res.render('pages/maps', {
      title: 'الخريطة',
      locations,
      cities: cities.filter(c => c),
      selectedType: req.query.type || '',
      selectedCity: req.query.city || ''
    });
  } catch (err) {
    console.error('Maps error:', err);
    req.flash('error', 'حدث خطأ في تحميل الخريطة');
    res.redirect('/dashboard');
  }
});

router.get('/api/locations', async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.type && ['hospital', 'pharmacy', 'physiotherapy_center'].includes(req.query.type)) {
      filter.type = req.query.type;
    }
    if (req.query.city) {
      filter.city = new RegExp(req.query.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    const locations = await Location.find(filter).sort({ name: 1 });
    res.json({ success: true, locations });
  } catch (err) {
    res.status(500).json({ success: false, error: 'خطأ في جلب المواقع' });
  }
});

router.post('/add', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, type, lat, lng, address, city, phone, workingHours, description, services } = req.body;
    if (!name || !type || !lat || !lng) {
      req.flash('error', 'يرجى تعبئة جميع الحقول المطلوبة');
      return res.redirect('/maps');
    }
    if (!['hospital', 'pharmacy', 'physiotherapy_center'].includes(type)) {
      req.flash('error', 'نوع الموقع غير صحيح');
      return res.redirect('/maps');
    }
    await Location.create({
      name: name.trim(),
      type,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      address: (address || '').trim(),
      city: (city || '').trim(),
      phone: (phone || '').trim(),
      workingHours: (workingHours || '').trim(),
      description: (description || '').trim(),
      services: services ? services.split(',').map(s => s.trim()).filter(Boolean) : [],
      addedBy: req.session.user._id
    });
    req.flash('success', 'تمت إضافة الموقع بنجاح');
    res.redirect('/maps');
  } catch (err) {
    console.error('Add location error:', err);
    req.flash('error', 'حدث خطأ في إضافة الموقع');
    res.redirect('/maps');
  }
});

router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await Location.findByIdAndDelete(req.params.id);
    req.flash('success', 'تم حذف الموقع');
    res.redirect('/maps');
  } catch (err) {
    req.flash('error', 'حدث خطأ');
    res.redirect('/maps');
  }
});

router.post('/toggle/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const loc = await Location.findById(req.params.id);
    if (loc) {
      loc.isActive = !loc.isActive;
      await loc.save();
    }
    req.flash('success', 'تم تحديث حالة الموقع');
    res.redirect('/maps');
  } catch (err) {
    req.flash('error', 'حدث خطأ');
    res.redirect('/maps');
  }
});

module.exports = router;
