const express = require('express');
const router = express.Router();
const Specialist = require('./specialist.model');
const Location = require('../maps/location.model');
const Consultation = require('../medical/consultation.model');
const { isAuthenticated } = require('../../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const centers = await Location.find({ type: 'physiotherapy_center', isActive: true }).sort({ rating: -1, name: 1 });
    const specialists = await Specialist.find({ isActive: true }).sort({ rating: -1 }).limit(6);
    const cities = await Location.distinct('city', { type: 'physiotherapy_center', isActive: true });
    const specializations = await Specialist.distinct('specializations', { isActive: true });

    res.render('pages/physiotherapy', {
      title: 'العلاج الطبيعي',
      centers,
      specialists,
      cities: cities.filter(c => c),
      specializations: specializations.filter(s => s),
      selectedCity: req.query.city || '',
      selectedSpec: req.query.spec || ''
    });
  } catch (err) {
    console.error('Physiotherapy page error:', err);
    req.flash('error', 'حدث خطأ');
    res.redirect('/dashboard');
  }
});

router.get('/centers', async (req, res) => {
  try {
    const filter = { type: 'physiotherapy_center', isActive: true };
    if (req.query.city) filter.city = new RegExp(req.query.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const centers = await Location.find(filter).sort({ rating: -1, name: 1 });
    const cities = await Location.distinct('city', { type: 'physiotherapy_center', isActive: true });

    res.render('pages/physio-centers', {
      title: 'مراكز العلاج الطبيعي',
      centers,
      cities: cities.filter(c => c),
      selectedCity: req.query.city || ''
    });
  } catch (err) {
    console.error('Centers error:', err);
    res.redirect('/physiotherapy');
  }
});

router.get('/specialists', async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.city) filter.city = new RegExp(req.query.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (req.query.spec) filter.specializations = req.query.spec;
    if (req.query.gender) filter.gender = req.query.gender;

    const specialists = await Specialist.find(filter).sort({ rating: -1, experience: -1 });
    const cities = await Specialist.distinct('city', { isActive: true });
    const specializations = await Specialist.distinct('specializations', { isActive: true });

    res.render('pages/physio-specialists', {
      title: 'أخصائيو العلاج الطبيعي',
      specialists,
      cities: cities.filter(c => c),
      specializations: specializations.filter(s => s),
      selectedCity: req.query.city || '',
      selectedSpec: req.query.spec || '',
      selectedGender: req.query.gender || ''
    });
  } catch (err) {
    console.error('Specialists error:', err);
    res.redirect('/physiotherapy');
  }
});

router.get('/specialist/:id', async (req, res) => {
  try {
    const specialist = await Specialist.findById(req.params.id).populate('center').populate('reviews.patient', 'name avatar');
    if (!specialist) {
      req.flash('error', 'الأخصائي غير موجود');
      return res.redirect('/physiotherapy/specialists');
    }
    res.render('pages/physio-specialist-profile', {
      title: specialist.name,
      specialist
    });
  } catch (err) {
    console.error('Specialist profile error:', err);
    res.redirect('/physiotherapy/specialists');
  }
});

router.post('/request', isAuthenticated, async (req, res) => {
  try {
    const { specialistId, specialization, symptoms, sessionType, priority } = req.body;

    const consultation = await Consultation.create({
      patient: req.session.user._id,
      specialty: specialization || 'علاج طبيعي',
      symptoms: symptoms,
      priority: priority || 'medium',
      status: 'pending'
    });

    req.flash('success', 'تم إرسال طلب الأخصائي بنجاح! سيتم التواصل معك قريباً.');
    res.redirect('/consultations');
  } catch (err) {
    console.error('Request specialist error:', err);
    req.flash('error', 'حدث خطأ في إرسال الطلب');
    res.redirect('/physiotherapy');
  }
});

router.post('/specialist/:id/review', isAuthenticated, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const specialist = await Specialist.findById(req.params.id);
    if (!specialist) return res.redirect('/physiotherapy/specialists');

    specialist.reviews.push({
      patient: req.session.user._id,
      rating: parseInt(rating),
      comment: (comment || '').trim()
    });

    const totalRating = specialist.reviews.reduce((sum, r) => sum + r.rating, 0);
    specialist.rating = Math.round((totalRating / specialist.reviews.length) * 10) / 10;
    specialist.reviewCount = specialist.reviews.length;
    await specialist.save();

    req.flash('success', 'تم إضافة تقييمك بنجاح');
    res.redirect('/physiotherapy/specialist/' + req.params.id);
  } catch (err) {
    req.flash('error', 'حدث خطأ');
    res.redirect('/physiotherapy/specialists');
  }
});

module.exports = router;
