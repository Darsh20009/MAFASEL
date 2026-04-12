const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../../middleware/auth');
const Pharmacy = require('./pharmacy.model');
const Drug = require('./drug.model');
const Order = require('../orders/order.model');
const Insurance = require('../medical/insurance.model');
const { fireNotify, fireNotifyAdmins } = require('../notifications/notification.service');
const { sendTemplateEmail } = require('../email/email.service');
const User = require('../users/user.model');

router.get('/', isAuthenticated, async (req, res) => {
  const pharmacies = await Pharmacy.find({ isActive: true }).sort({ isFeatured: -1, rating: -1 });
  const orders = await Order.find({ patient: req.session.user._id }).sort({ createdAt: -1 }).limit(20);
  const insurance = await Insurance.findOne({ patient: req.session.user._id, status: 'active' });
  res.render('pages/pharmacy', { title: 'الصيدليات', pharmacies, orders, insurance });
});

router.get('/store/:id', isAuthenticated, async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.id);
  if (!pharmacy || !pharmacy.isActive) {
    req.session.error = 'الصيدلية غير متوفرة';
    return res.redirect('/pharmacy');
  }
  const drugs = await Drug.find({ pharmacyId: pharmacy._id, isActive: true }).sort({ category: 1, soldCount: -1 });
  const categories = [...new Set(drugs.map(d => d.category))];
  const insurance = await Insurance.findOne({ patient: req.session.user._id, status: 'active' });
  res.render('pages/pharmacy-store', { title: pharmacy.name, pharmacy, drugs, categories, insurance });
});

router.get('/search', isAuthenticated, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ drugs: [] });
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const activePharmacyIds = (await Pharmacy.find({ isActive: true }).select('_id').lean()).map(p => p._id);
  const drugs = await Drug.find({
    isActive: true,
    pharmacyId: { $in: activePharmacyIds },
    $or: [
      { name: { $regex: escaped, $options: 'i' } },
      { nameEn: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
      { category: { $regex: escaped, $options: 'i' } }
    ]
  }).populate('pharmacyId', 'name logo').limit(20).lean();
  res.json({ drugs });
});

router.post('/order', isAuthenticated, async (req, res) => {
  try {
    const { pharmacyId, items, address, notes, paymentMethod, insuranceId } = req.body;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

    if (!parsedItems || !parsedItems.length) {
      return res.status(400).json({ error: 'السلة فارغة' });
    }

    if (!pharmacyId) return res.status(400).json({ error: 'يرجى اختيار صيدلية' });
    const pharmacy = await Pharmacy.findOne({ _id: pharmacyId, isActive: true });
    if (!pharmacy) return res.status(400).json({ error: 'الصيدلية غير متاحة' });

    let totalPrice = 0;
    let insuranceDiscount = 0;
    let activeInsurance = null;

    if (paymentMethod === 'insurance' && insuranceId) {
      activeInsurance = await Insurance.findOne({
        _id: insuranceId,
        patient: req.session.user._id,
        status: 'active'
      });
      if (!activeInsurance || !activeInsurance.coverageDetails.medications) {
        return res.status(400).json({ error: 'التأمين غير صالح أو لا يغطي الأدوية' });
      }
    }

    const drugIds = parsedItems.map(i => i.drugId).filter(Boolean);
    if (!drugIds.length) return res.status(400).json({ error: 'الأدوية غير صالحة' });
    const dbDrugs = await Drug.find({ _id: { $in: drugIds }, pharmacyId: pharmacy._id, isActive: true });
    if (dbDrugs.length !== drugIds.length) {
      return res.status(400).json({ error: 'بعض الأدوية غير متوفرة في هذه الصيدلية' });
    }
    const drugMap = {};
    dbDrugs.forEach(d => { drugMap[d._id.toString()] = d; });

    for (const item of parsedItems) {
      const qty = Math.max(1, Math.min(parseInt(item.quantity) || 1, 50));
      const drug = drugMap[item.drugId];
      if (drug && drug.stock < qty) {
        return res.status(400).json({ error: `الدواء "${drug.name}" غير متوفر بالكمية المطلوبة (المتبقي: ${drug.stock})` });
      }
    }

    const orderItems = parsedItems.map(item => {
      const drug = drugMap[item.drugId];
      const price = drug.price;
      const qty = Math.max(1, Math.min(parseInt(item.quantity) || 1, 50));
      let itemInsurancePrice = 0;

      if (activeInsurance && drug.insuranceSupported && drug.insurancePrice != null) {
        itemInsurancePrice = drug.insurancePrice;
        insuranceDiscount += (price - drug.insurancePrice) * qty;
        totalPrice += drug.insurancePrice * qty;
      } else {
        totalPrice += price * qty;
      }

      return {
        drugId: drug._id,
        name: drug.name,
        quantity: qty,
        price: price,
        insurancePrice: itemInsurancePrice || undefined,
        prescription: drug.prescription
      };
    });

    let deliveryFee = 0;
    if (pharmacy) {
      deliveryFee = pharmacy.deliveryFee || 0;
      if (pharmacy.freeDeliveryAbove > 0 && totalPrice >= pharmacy.freeDeliveryAbove) {
        deliveryFee = 0;
      }
    }

    if (activeInsurance) {
      const remaining = activeInsurance.coverageAmount - activeInsurance.usedAmount;
      if (insuranceDiscount > remaining) {
        insuranceDiscount = remaining;
        totalPrice = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0) - insuranceDiscount;
      }
    }

    const order = await Order.create({
      patient: req.session.user._id,
      pharmacyId: pharmacy ? pharmacy._id : undefined,
      pharmacy: pharmacy ? pharmacy.name : 'صيدلية مفاصل',
      items: orderItems,
      totalPrice: totalPrice + deliveryFee,
      deliveryFee,
      address,
      notes,
      paymentMethod: paymentMethod || 'cash',
      insuranceId: activeInsurance ? activeInsurance._id : undefined,
      insuranceDiscount,
      trackingNumber: 'MF-' + Date.now().toString(36).toUpperCase()
    });

    if (activeInsurance && insuranceDiscount > 0) {
      activeInsurance.usedAmount += insuranceDiscount;
      await activeInsurance.save();
    }

    if (pharmacy) {
      pharmacy.totalOrders = (pharmacy.totalOrders || 0) + 1;
      await pharmacy.save();
    }

    for (const item of orderItems) {
      if (item.drugId) {
        await Drug.findByIdAndUpdate(item.drugId, {
          $inc: { soldCount: item.quantity, stock: -item.quantity }
        });
      }
    }

    await fireNotify(req.app, req.session.user._id, 'تم استلام طلبك', `طلب رقم ${order.trackingNumber} قيد المعالجة`, {
      type: 'success', link: '/pharmacy'
    });
    await fireNotifyAdmins(req.app, 'طلب صيدلية جديد', `طلب جديد من ${req.session.user.name} بقيمة ${order.totalPrice} ريال`, {
      type: 'info', link: '/admin/orders'
    });

    const user = await User.findById(req.session.user._id);
    if (user && user.email) {
      sendTemplateEmail('orderConfirmation', user.email, {
        patientName: user.name,
        orderId: order.trackingNumber,
        items: orderItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
        total: order.totalPrice
      }).catch(() => {});
    }

    res.json({ success: true, orderId: order._id, trackingNumber: order.trackingNumber });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'حدث خطأ في إرسال الطلب' });
  }
});

router.get('/admin/pharmacies', isAuthenticated, isAdmin, async (req, res) => {
  const pharmacies = await Pharmacy.find().sort({ createdAt: -1 });
  res.render('pages/admin-pharmacies', { title: 'إدارة الصيدليات', pharmacies });
});

router.post('/admin/pharmacies/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, nameEn, description, city, district, address, phone, email, workingHours, deliveryFee, freeDeliveryAbove, insuranceSupported, licenseNumber } = req.body;
    await Pharmacy.create({
      name: name.trim(),
      nameEn: nameEn ? nameEn.trim() : '',
      description: description || '',
      location: { city: city || '', district: district || '', address: address || '' },
      phone: phone || '',
      email: email || '',
      workingHours: workingHours || '8:00 ص - 12:00 م',
      deliveryFee: parseFloat(deliveryFee) || 0,
      freeDeliveryAbove: parseFloat(freeDeliveryAbove) || 0,
      insuranceSupported: insuranceSupported === 'on',
      licenseNumber: licenseNumber || '',
      isActive: true
    });
    req.session.success = 'تم إضافة الصيدلية';
  } catch (err) {
    req.session.error = 'خطأ في إضافة الصيدلية';
  }
  res.redirect('/pharmacy/admin/pharmacies');
});

router.post('/admin/pharmacies/:id/toggle', isAuthenticated, isAdmin, async (req, res) => {
  const p = await Pharmacy.findById(req.params.id);
  if (p) { p.isActive = !p.isActive; await p.save(); }
  res.redirect('/pharmacy/admin/pharmacies');
});

router.post('/admin/pharmacies/:id/feature', isAuthenticated, isAdmin, async (req, res) => {
  const p = await Pharmacy.findById(req.params.id);
  if (p) { p.isFeatured = !p.isFeatured; await p.save(); }
  res.redirect('/pharmacy/admin/pharmacies');
});

router.get('/admin/drugs/:pharmacyId', isAuthenticated, isAdmin, async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.pharmacyId);
  if (!pharmacy) { req.session.error = 'صيدلية غير موجودة'; return res.redirect('/pharmacy/admin/pharmacies'); }
  const drugs = await Drug.find({ pharmacyId: pharmacy._id }).sort({ category: 1, name: 1 });
  res.render('pages/admin-drugs', { title: `أدوية ${pharmacy.name}`, pharmacy, drugs });
});

router.post('/admin/drugs/:pharmacyId/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, nameEn, description, category, price, originalPrice, insurancePrice, insuranceSupported, prescription, dosage, manufacturer, stock } = req.body;
    await Drug.create({
      pharmacyId: req.params.pharmacyId,
      name: name.trim(),
      nameEn: nameEn ? nameEn.trim() : '',
      description: description || '',
      category: category || 'أخرى',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      insurancePrice: insurancePrice ? parseFloat(insurancePrice) : undefined,
      insuranceSupported: insuranceSupported === 'on',
      prescription: prescription === 'on',
      dosage: dosage || '',
      manufacturer: manufacturer || '',
      stock: parseInt(stock) || 100
    });
    req.session.success = 'تم إضافة الدواء';
  } catch (err) {
    req.session.error = 'خطأ في إضافة الدواء';
  }
  res.redirect('/pharmacy/admin/drugs/' + req.params.pharmacyId);
});

router.post('/admin/drugs/:id/toggle', isAuthenticated, isAdmin, async (req, res) => {
  const d = await Drug.findById(req.params.id);
  if (d) { d.isActive = !d.isActive; await d.save(); res.redirect('/pharmacy/admin/drugs/' + d.pharmacyId); }
  else res.redirect('/pharmacy/admin/pharmacies');
});

router.post('/admin/drugs/:id/update', isAuthenticated, isAdmin, async (req, res) => {
  const { price, insurancePrice, stock } = req.body;
  const d = await Drug.findById(req.params.id);
  if (d) {
    if (price) d.price = parseFloat(price);
    if (insurancePrice) d.insurancePrice = parseFloat(insurancePrice);
    if (stock !== undefined) d.stock = parseInt(stock);
    await d.save();
    res.redirect('/pharmacy/admin/drugs/' + d.pharmacyId);
  } else res.redirect('/pharmacy/admin/pharmacies');
});

router.post('/admin/seed', isAuthenticated, isAdmin, async (req, res) => {
  const existingCount = await Pharmacy.countDocuments();
  if (existingCount > 0) { req.session.error = 'توجد صيدليات بالفعل'; return res.redirect('/pharmacy/admin/pharmacies'); }

  const pharmacies = [
    { name: 'صيدلية الدواء', nameEn: 'Al Dawaa Pharmacy', description: 'أكبر سلسلة صيدليات في المملكة', location: { city: 'الرياض', district: 'العليا' }, phone: '920008855', workingHours: '24 ساعة', isFeatured: true, insuranceSupported: true, supportedInsuranceCompanies: ['بوبا', 'التعاونية', 'ميدغلف'], deliveryFee: 0, rating: 4.8 },
    { name: 'صيدلية النهدي', nameEn: 'Nahdi Pharmacy', description: 'صيدليتك المفضلة دائماً', location: { city: 'الرياض', district: 'النخيل' }, phone: '920001010', workingHours: '8:00 ص - 12:00 م', isFeatured: true, insuranceSupported: true, supportedInsuranceCompanies: ['بوبا', 'التعاونية'], deliveryFee: 10, freeDeliveryAbove: 100, rating: 4.7 },
    { name: 'صيدلية كيان', nameEn: 'Kayan Pharmacy', description: 'جودة عالية وأسعار منافسة', location: { city: 'جدة', district: 'الحمراء' }, phone: '0500000000', workingHours: '9:00 ص - 11:00 م', insuranceSupported: false, deliveryFee: 15, freeDeliveryAbove: 150, rating: 4.5 }
  ];

  const created = await Pharmacy.insertMany(pharmacies);

  const sampleDrugs = [
    { name: 'بنادول أكسترا', nameEn: 'Panadol Extra', category: 'مسكنات', price: 15, insurancePrice: 5, insuranceSupported: true, description: 'مسكن للألم وخافض للحرارة', dosage: '500mg', manufacturer: 'GSK', prescription: false, stock: 200 },
    { name: 'أموكسيسيلين', nameEn: 'Amoxicillin', category: 'مضادات حيوية', price: 35, insurancePrice: 10, insuranceSupported: true, description: 'مضاد حيوي واسع المجال', dosage: '500mg', manufacturer: 'Hikma', prescription: true, stock: 80 },
    { name: 'أوميبرازول', nameEn: 'Omeprazole', category: 'معدة', price: 25, insurancePrice: 8, insuranceSupported: true, description: 'لعلاج حموضة المعدة والارتجاع', dosage: '20mg', manufacturer: 'AstraZeneca', prescription: false, stock: 150 },
    { name: 'ميتفورمين', nameEn: 'Metformin', category: 'سكري', price: 20, insurancePrice: 5, insuranceSupported: true, description: 'لعلاج السكري النوع الثاني', dosage: '850mg', manufacturer: 'Merck', prescription: true, stock: 120 },
    { name: 'فيتامين د', nameEn: 'Vitamin D3', category: 'فيتامينات', price: 30, description: 'مكمل فيتامين د للعظام والمناعة', dosage: '5000 IU', manufacturer: 'Nature Made', prescription: false, stock: 250, insuranceSupported: false },
    { name: 'لوسارتان', nameEn: 'Losartan', category: 'ضغط', price: 28, insurancePrice: 8, insuranceSupported: true, description: 'لعلاج ارتفاع ضغط الدم', dosage: '50mg', manufacturer: 'MSD', prescription: true, stock: 90 },
    { name: 'سيتريزين', nameEn: 'Cetirizine', category: 'حساسية', price: 12, insurancePrice: 4, insuranceSupported: true, description: 'مضاد للحساسية', dosage: '10mg', manufacturer: 'UCB', prescription: false, stock: 180 },
    { name: 'أتورفاستاتين', nameEn: 'Atorvastatin', category: 'كوليسترول', price: 40, insurancePrice: 12, insuranceSupported: true, description: 'لخفض الكوليسترول', dosage: '20mg', manufacturer: 'Pfizer', prescription: true, stock: 70 },
    { name: 'كريم بيتاديرم', nameEn: 'Betaderm Cream', category: 'جلدية', price: 18, description: 'كريم لعلاج الالتهابات الجلدية', dosage: '0.1%', manufacturer: 'Riyadh Pharma', prescription: false, stock: 100, insuranceSupported: false },
    { name: 'قطرة أوبتيف', nameEn: 'Optive Eye Drops', category: 'عيون', price: 22, insurancePrice: 8, insuranceSupported: true, description: 'قطرة مرطبة للعين', dosage: '10ml', manufacturer: 'Allergan', prescription: false, stock: 130 }
  ];

  for (const ph of created) {
    const drugs = sampleDrugs.map(d => ({
      ...d,
      pharmacyId: ph._id,
      price: d.price + Math.floor(Math.random() * 5) - 2,
      stock: d.stock + Math.floor(Math.random() * 50)
    }));
    await Drug.insertMany(drugs);
  }

  req.session.success = `تم إنشاء ${created.length} صيدليات و ${created.length * sampleDrugs.length} دواء`;
  res.redirect('/pharmacy/admin/pharmacies');
});

module.exports = router;
