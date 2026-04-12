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
  const orders = await Order.find({ patient: req.session.user._id }).sort({ createdAt: -1 }).limit(20).populate('pharmacyId', 'name logo');
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
    const validPayments = ['cash', 'insurance', 'card', 'apple_pay', 'health_card'];
    if (paymentMethod && !validPayments.includes(paymentMethod)) {
      return res.status(400).json({ error: 'طريقة دفع غير صالحة' });
    }
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
  if (existingCount > 0) {
    await Drug.deleteMany({});
    await Order.deleteMany({});
    await Pharmacy.deleteMany({});
  }

  const pharmacies = [
    {
      name: 'صيدلية النهدي',
      nameEn: 'Nahdi Pharmacy',
      logo: '/uploads/pharmacy/nahdi-logo.png',
      description: 'صيدليتك المفضلة — أكثر من 1100 فرع في المملكة مع خدمة توصيل سريعة وبرنامج ولاء نقاطي',
      location: { city: 'الرياض', district: 'العليا', address: 'طريق الملك فهد، حي العليا' },
      phone: '920001010',
      workingHours: '24 ساعة',
      isFeatured: true,
      insuranceSupported: true,
      supportedInsuranceCompanies: ['بوبا', 'التعاونية', 'ميدغلف', 'تكافل الراجحي', 'ملاذ'],
      deliveryFee: 0,
      freeDeliveryAbove: 0,
      rating: 4.8,
      isActive: true
    },
    {
      name: 'صيدلية الدواء',
      nameEn: 'Al-Dawaa Pharmacy',
      logo: '/uploads/pharmacy/aldawaa-logo.png',
      description: 'أكبر سلسلة صيدليات في الشرق الأوسط — أكثر من 900 فرع مع تغطية تأمينية شاملة',
      location: { city: 'الرياض', district: 'النخيل', address: 'طريق أنس بن مالك، حي النخيل' },
      phone: '920008855',
      workingHours: '8:00 ص - 12:00 م',
      isFeatured: true,
      insuranceSupported: true,
      supportedInsuranceCompanies: ['بوبا', 'التعاونية', 'ميدغلف', 'الأهلية', 'وفا'],
      deliveryFee: 10,
      freeDeliveryAbove: 100,
      rating: 4.7,
      isActive: true
    },
    {
      name: 'صيدلية ليمون',
      nameEn: 'Lemon Pharmacy',
      logo: '/uploads/pharmacy/lemon-logo.png',
      description: 'صيدلية متخصصة بالمنتجات الطبيعية والمكملات الغذائية والعناية بالبشرة — جودة عالية بأسعار منافسة',
      location: { city: 'جدة', district: 'الحمراء', address: 'شارع فلسطين، حي الحمراء' },
      phone: '0126543210',
      workingHours: '9:00 ص - 11:00 م',
      isFeatured: false,
      insuranceSupported: true,
      supportedInsuranceCompanies: ['بوبا', 'التعاونية'],
      deliveryFee: 15,
      freeDeliveryAbove: 150,
      rating: 4.5,
      isActive: true
    },
    {
      name: 'صيدلية أورانج',
      nameEn: 'Orange Pharmacy',
      logo: '/uploads/pharmacy/orange-logo.png',
      description: 'صيدلية المجتمع — خدمة شخصية ومتميزة مع فريق صيدلي محترف واستشارات مجانية',
      location: { city: 'الدمام', district: 'الشاطئ', address: 'الكورنيش، حي الشاطئ' },
      phone: '0138765432',
      workingHours: '8:00 ص - 10:00 م',
      isFeatured: false,
      insuranceSupported: false,
      supportedInsuranceCompanies: [],
      deliveryFee: 12,
      freeDeliveryAbove: 120,
      rating: 4.6,
      isActive: true
    }
  ];

  const created = await Pharmacy.insertMany(pharmacies);

  const drugImages = {
    panadol: 'https://cdn-images.ep.link/s/w-400/660d49f76bcff.png',
    panadolCold: 'https://cdn-images.ep.link/s/w-400/660d4a236bcff.png',
    brufen: 'https://cdn-images.ep.link/s/w-400/660d4a746bcff.png',
    amoxicillin: 'https://cdn-images.ep.link/s/w-400/660d4b1c6bcff.png',
    augmentin: 'https://cdn-images.ep.link/s/w-400/660d4b436bcff.png',
    omeprazole: 'https://cdn-images.ep.link/s/w-400/660d4bc56bcff.png',
    metformin: 'https://cdn-images.ep.link/s/w-400/660d4c4f6bcff.png',
    vitaminD: 'https://cdn-images.ep.link/s/w-400/660d4cd46bcff.png',
    vitaminC: 'https://cdn-images.ep.link/s/w-400/660d4cfe6bcff.png',
    losartan: 'https://cdn-images.ep.link/s/w-400/660d4d5a6bcff.png',
    cetirizine: 'https://cdn-images.ep.link/s/w-400/660d4d876bcff.png',
    atorvastatin: 'https://cdn-images.ep.link/s/w-400/660d4db76bcff.png',
    betaderm: 'https://cdn-images.ep.link/s/w-400/660d4de16bcff.png',
    optive: 'https://cdn-images.ep.link/s/w-400/660d4e0c6bcff.png',
    omega3: 'https://cdn-images.ep.link/s/w-400/660d4e3c6bcff.png',
  };

  const sampleDrugs = [
    { name: 'بنادول أكسترا', nameEn: 'Panadol Extra', category: 'مسكنات', price: 14.5, insurancePrice: 5, insuranceSupported: true, description: 'مسكن قوي للألم وخافض للحرارة، يحتوي على باراسيتامول وكافيين', dosage: '500mg/65mg', manufacturer: 'GSK', prescription: false, stock: 200, image: drugImages.panadol },
    { name: 'بنادول كولد + فلو', nameEn: 'Panadol Cold+Flu', category: 'مسكنات', price: 18, insurancePrice: 7, insuranceSupported: true, description: 'لعلاج أعراض البرد والإنفلونزا — صداع، رشح، احتقان', dosage: '500mg', manufacturer: 'GSK', prescription: false, stock: 180, image: drugImages.panadolCold },
    { name: 'بروفين 400', nameEn: 'Brufen 400', category: 'مسكنات', price: 12, insurancePrice: 4, insuranceSupported: true, description: 'مضاد للالتهاب ومسكن للألم والحمى', dosage: '400mg', manufacturer: 'Abbott', prescription: false, stock: 220, image: drugImages.brufen },
    { name: 'أموكسيسيلين', nameEn: 'Amoxicillin', category: 'مضادات حيوية', price: 32, insurancePrice: 10, insuranceSupported: true, description: 'مضاد حيوي واسع المجال لعلاج الالتهابات البكتيرية', dosage: '500mg', manufacturer: 'Hikma', prescription: true, stock: 80, image: drugImages.amoxicillin },
    { name: 'أوجمنتين', nameEn: 'Augmentin', category: 'مضادات حيوية', price: 45, insurancePrice: 15, insuranceSupported: true, description: 'مضاد حيوي قوي (أموكسيسيلين + كلافيولانيك أسيد)', dosage: '625mg', manufacturer: 'GSK', prescription: true, stock: 60, image: drugImages.augmentin },
    { name: 'أوميبرازول', nameEn: 'Omeprazole', category: 'معدة', price: 22, insurancePrice: 8, insuranceSupported: true, description: 'لعلاج حموضة المعدة وقرحة المعدة والارتجاع المريئي', dosage: '20mg', manufacturer: 'AstraZeneca', prescription: false, stock: 150, image: drugImages.omeprazole },
    { name: 'ميتفورمين', nameEn: 'Metformin', category: 'سكري', price: 18, insurancePrice: 5, insuranceSupported: true, description: 'الخط الأول لعلاج السكري النوع الثاني — ينظم مستوى السكر', dosage: '850mg', manufacturer: 'Merck', prescription: true, stock: 120, image: drugImages.metformin },
    { name: 'فيتامين د3', nameEn: 'Vitamin D3', category: 'فيتامينات', price: 35, description: 'مكمل فيتامين د لدعم العظام والمناعة — جرعة أسبوعية', dosage: '50,000 IU', manufacturer: 'Nature Made', prescription: false, stock: 250, insuranceSupported: false, image: drugImages.vitaminD },
    { name: 'فيتامين سي', nameEn: 'Vitamin C', category: 'فيتامينات', price: 28, description: 'مضاد أكسدة ودعم المناعة — أقراص فوارة', dosage: '1000mg', manufacturer: 'Redoxon', prescription: false, stock: 300, insuranceSupported: false, image: drugImages.vitaminC },
    { name: 'أوميغا 3', nameEn: 'Omega-3 Fish Oil', category: 'مكملات', price: 55, description: 'زيت السمك لصحة القلب والدماغ والمفاصل', dosage: '1000mg', manufacturer: 'Nature Made', prescription: false, stock: 150, insuranceSupported: false, image: drugImages.omega3 },
    { name: 'لوسارتان', nameEn: 'Losartan', category: 'ضغط', price: 25, insurancePrice: 8, insuranceSupported: true, description: 'لعلاج ارتفاع ضغط الدم وحماية الكلى', dosage: '50mg', manufacturer: 'MSD', prescription: true, stock: 90, image: drugImages.losartan },
    { name: 'سيتريزين', nameEn: 'Cetirizine', category: 'حساسية', price: 10, insurancePrice: 3, insuranceSupported: true, description: 'مضاد للحساسية والهيستامين — لا يسبب النعاس', dosage: '10mg', manufacturer: 'UCB', prescription: false, stock: 200, image: drugImages.cetirizine },
    { name: 'أتورفاستاتين', nameEn: 'Atorvastatin (Lipitor)', category: 'كوليسترول', price: 38, insurancePrice: 12, insuranceSupported: true, description: 'لخفض الكوليسترول والدهون الثلاثية في الدم', dosage: '20mg', manufacturer: 'Pfizer', prescription: true, stock: 75, image: drugImages.atorvastatin },
    { name: 'كريم بيتاديرم', nameEn: 'Betaderm Cream', category: 'جلدية', price: 16, description: 'كريم كورتيزون لعلاج الالتهابات والحكة الجلدية', dosage: '0.1% - 30g', manufacturer: 'Riyadh Pharma', prescription: false, stock: 110, insuranceSupported: false, image: drugImages.betaderm },
    { name: 'قطرة أوبتيف', nameEn: 'Optive Eye Drops', category: 'عيون', price: 24, insurancePrice: 9, insuranceSupported: true, description: 'قطرة مرطبة للعين لعلاج جفاف العين', dosage: '15ml', manufacturer: 'Allergan', prescription: false, stock: 130, image: drugImages.optive },
    { name: 'بنادول أطفال شراب', nameEn: 'Panadol Baby Syrup', category: 'أطفال', price: 16, insurancePrice: 6, insuranceSupported: true, description: 'خافض حرارة ومسكن آمن للأطفال من عمر 2 شهر', dosage: '120mg/5ml', manufacturer: 'GSK', prescription: false, stock: 160, image: drugImages.panadol },
    { name: 'فلاجيل', nameEn: 'Flagyl', category: 'معدة', price: 15, insurancePrice: 5, insuranceSupported: true, description: 'مضاد للبكتيريا والطفيليات — لعلاج التهابات الجهاز الهضمي', dosage: '500mg', manufacturer: 'Sanofi', prescription: true, stock: 95, image: drugImages.amoxicillin },
    { name: 'كلاريتين', nameEn: 'Claritin', category: 'حساسية', price: 22, insurancePrice: 8, insuranceSupported: true, description: 'مضاد هيستامين طويل المفعول للحساسية الموسمية', dosage: '10mg', manufacturer: 'Bayer', prescription: false, stock: 170, image: drugImages.cetirizine },
  ];

  for (const ph of created) {
    const drugs = sampleDrugs.map(d => ({
      ...d,
      pharmacyId: ph._id,
      price: Math.round((d.price + Math.floor(Math.random() * 6) - 3) * 10) / 10,
      stock: d.stock + Math.floor(Math.random() * 50)
    }));
    await Drug.insertMany(drugs);
  }

  req.session.success = `تم إنشاء ${created.length} صيدليات و ${created.length * sampleDrugs.length} دواء`;
  res.redirect('/pharmacy/admin/pharmacies');
});

module.exports = router;
